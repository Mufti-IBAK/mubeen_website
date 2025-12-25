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
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  const authHeader = req.headers.get("authorization");
  let token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    const c = await cookies();
    token = c.get("sb-access-token")?.value;
  }

  if (!token) return false;

  const admin = createClient(url, service!);
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) return false;

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
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
    const SUPABASE_SERVICE =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE!);

    let allTransactions: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    // Fetch all successful transactions
    while (hasMore && page <= 10) {
      // Limit to 10 pages (1000 transactions) for safety
      const url = `https://api.flutterwave.com/v3/transactions?status=successful&page=${page}&per_page=${perPage}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${FLW_SK}` },
      });

      if (!res.ok) break;

      const json = await res.json();
      const transactions = json.data || [];
      allTransactions = allTransactions.concat(transactions);

      hasMore = transactions.length === perPage;
      page++;
    }

    // Filter for Mubeen Academy transactions
    const mubeenTransactions = allTransactions.filter(
      (tx) => tx.meta && tx.meta.success_enroll_id
    );

    let updated = 0;
    let verified = 0;
    let skipped = 0;
    let errors = 0;

    for (const tx of mubeenTransactions) {
      const enrollId = parseInt(tx.meta.success_enroll_id);

      try {
        const { data: existing } = await admin
          .from("enrollments")
          .select("id, payment_status")
          .eq("id", enrollId)
          .single();

        if (!existing) {
          skipped++;
          continue;
        }

        const richMeta = {
          bank_name: tx.meta.bankname || tx.account?.bank_name || "N/A",
          originator_name: tx.meta.originatorname || tx.customer?.name || "N/A",
          payment_type: tx.payment_type || "N/A",
          ip_address: tx.ip || "N/A",
          created_at: tx.created_at,
          paid_at: tx.created_at,
          flw_ref: tx.flw_ref,
          narration: tx.narration || "Mubeen Academy",
          originator_account: tx.meta.originatoraccountnumber || "N/A",
        };

        const { error: updateErr } = await admin
          .from("enrollments")
          .update({
            tx_ref: tx.tx_ref,
            transaction_id: String(tx.id),
            flw_ref: tx.flw_ref,
            amount: Number(tx.amount),
            currency: tx.currency,
            payment_status: "paid",
            status: "active",
            payment_meta: richMeta,
            updated_at: new Date().toISOString(),
          })
          .eq("id", enrollId);

        if (updateErr) {
          errors++;
        } else {
          if (existing.payment_status === "paid") {
            updated++;
          } else {
            verified++;
          }
        }
      } catch (e) {
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total_flw_transactions: allTransactions.length,
        mubeen_transactions: mubeenTransactions.length,
        newly_verified: verified,
        updated_existing: updated,
        skipped,
        errors,
      },
    });
  } catch (e: any) {
    console.error("Sync error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "server_error" },
      { status: 500 }
    );
  }
}
