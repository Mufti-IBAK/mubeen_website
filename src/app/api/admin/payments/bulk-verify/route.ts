import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function isAdmin(req: NextRequest) {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  const authHeader = req.headers.get("authorization");
  let token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    const c = await cookies();
    token = c.get("sb-access-token")?.value;
  }
  
  if (!token) return false;

  const admin = createClient(url, service!);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return false;

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" || profile?.role === "super_admin";
}

export async function POST(req: NextRequest) {
  try {
    // Admin check
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    const FLW_SK = getEnv("FLUTTERWAVE_SECRET_KEY");
    const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE!);

    // Get all enrollments with tx_ref that are unpaid
    const { data: enrollments, error: fetchErr } = await admin
      .from('enrollments')
      .select('*')
      .eq('payment_status', 'unpaid')
      .not('tx_ref', 'is', null)
      .neq('tx_ref', '');

    if (fetchErr) {
      return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
    }

    let verified = 0;
    let alreadyPaid = 0;
    let failed = 0;
    const errors: any[] = [];
    const verifiedEnrollments: any[] = [];

    for (const enrollment of enrollments || []) {
      try {
        // Verify with Flutterwave
        const res = await fetch(
          `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(enrollment.tx_ref)}`,
          { headers: { Authorization: `Bearer ${FLW_SK}` } }
        );

        if (!res.ok) {
          failed++;
          errors.push({ id: enrollment.id, error: `FLW API error: ${res.status}` });
          continue;
        }

        const json = await res.json();
        const data = json.data;

        if (data.status !== 'successful') {
          failed++;
          errors.push({ id: enrollment.id, error: `Transaction not successful: ${data.status}` });
          continue;
        }

        // Extract rich metadata
        const richMeta = {
          bank_name: data.meta?.bankname || data.account?.bank_name || 'N/A',
          originator_name: data.meta?.originatorname || data.customer?.name || 'N/A',
          payment_type: data.payment_type || 'N/A',
          ip_address: data.ip || 'N/A',
          created_at: data.created_at,
          paid_at: data.created_at,
          flw_ref: data.flw_ref,
          narration: data.narration || 'Mubeen Academy',
          originator_account: data.meta?.originatoraccountnumber || 'N/A'
        };

        // Update enrollment
        const { error: updateErr } = await admin
          .from('enrollments')
          .update({
            status: 'active',
            payment_status: 'paid',
            amount: Number(data.amount),
            currency: data.currency,
            transaction_id: String(data.id),
            flw_ref: data.flw_ref,
            payment_meta: richMeta,
            updated_at: new Date().toISOString()
          })
          .eq('id', enrollment.id);

        if (updateErr) {
          failed++;
          errors.push({ id: enrollment.id, error: updateErr.message });
        } else {
          verified++;
          verifiedEnrollments.push({
            id: enrollment.id,
            user_name: enrollment.user_name,
            user_email: enrollment.user_email,
            program_title: enrollment.program_title,
            amount: Number(data.amount),
            currency: data.currency,
            tx_ref: enrollment.tx_ref,
            flw_ref: data.flw_ref,
            bank: richMeta.bank_name,
            originator: richMeta.originator_name
          });
        }
      } catch (e: any) {
        failed++;
        errors.push({ id: enrollment.id, error: e.message });
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total_processed: enrollments?.length || 0,
        verified,
        already_paid: alreadyPaid,
        failed,
        errors: errors.slice(0, 10),
        verified_enrollments: verifiedEnrollments
      }
    });

  } catch (e: any) {
    console.error("Bulk verify error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "server_error" },
      { status: 500 }
    );
  }
}
