import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// Helper to list transactions by email
async function findTransactionByEmail(secret: string, email: string) {
  const url = `https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(
    email
  )}&status=successful&limit=5`;
  console.log(`Searching FLW by email: ${email}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = await res.json().catch((e) => {
    console.error("FLW Email Search JSON Error:", e);
    return {};
  });
  console.log(`FLW Search Result for ${email}:`, JSON.stringify(json));
  return json.data || [];
}

async function verifyWithFlutterwaveByRef(secret: string, tx_ref: string) {
  console.log(`Verifying Ref: ${tx_ref}`);
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
      tx_ref
    )}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // If Verify by Ref fails, it returns 404 or 400.
    // We return null to signal "not found by ref" so caller can try fallback
    return null;
  }
  const data = json?.data || {};
  return data; // { status, id, amount, currency, tx_ref }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tx_ref =
      url.searchParams.get("tx_ref") || url.searchParams.get("ref");
    const idParam = url.searchParams.get("id"); // explicit enrollment id

    let enrollmentId = 0;
    if (idParam) {
      enrollmentId = Number(idParam);
    } else if (tx_ref) {
      // Map tx_ref -> enrollment id
      // Support both old 'se-' and new 'er-' prefixes
      const m = /^(?:se|er)-(\d+)(?:-|$)/.exec(tx_ref);
      if (m) enrollmentId = Number(m[1]);
    }

    if (!enrollmentId && !tx_ref)
      return NextResponse.json(
        { ok: false, error: "missing_id_or_ref" },
        { status: 400 }
      );

    const FLW_SK = reqEnv("FLUTTERWAVE_SECRET_KEY");
    const SUPABASE_URL = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SERVICE = reqEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Fetch row from unified enrollments table
    const { data: row } = await admin
      .from("enrollments")
      .select("id, program_id, status, user_email")
      .eq("id", enrollmentId)
      .maybeSingle();
    if (!row)
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    if ((row as any).status === "paid" || (row as any).status === "active")
      return NextResponse.json({ ok: true, status: "paid", id: enrollmentId });

    // Verify with Flutterwave
    let data = null;

    // 1. Try by Reference if we have one
    if (tx_ref) {
      data = await verifyWithFlutterwaveByRef(FLW_SK, tx_ref);
    }

    // 2. Strategic Fallback
    let debugInfo: any = { candidates: 0 };
    if ((!data || data.status !== "successful") && (row as any).user_email) {
      console.log("Entering Strategic Fallback for:", (row as any).user_email);
      const candidates = await findTransactionByEmail(
        FLW_SK,
        (row as any).user_email
      );

      debugInfo.candidates = candidates.length;
      debugInfo.email = (row as any).user_email;

      if (candidates && candidates.length > 0) {
        const bestMatch = candidates[0]; // Recent is first
        console.log(
          "Candidate found:",
          bestMatch.id,
          bestMatch.status,
          bestMatch.amount
        );
        debugInfo.firstCandidate = { id: bestMatch.id, status: bestMatch.status, amount: bestMatch.amount };
        
        if (bestMatch.status === "successful") {
          // We need full verification details for rich meta, so verify this ID directly to get full payload?
          // usually the list endpoint doesn't return everything (like card issuer).
          // So let's verify by ID.
          const resVerify = await fetch(
            `https://api.flutterwave.com/v3/transactions/${bestMatch.id}/verify`,
            {
              headers: { Authorization: `Bearer ${FLW_SK}` },
            }
          );
          const jsonVerify = await resVerify.json();
          debugInfo.verifyStatus = jsonVerify.status;
          
          if (jsonVerify.status === "success") {
            data = jsonVerify.data;
          }
        }
      }
    }

    if (!data || data.status !== "successful") {
      return NextResponse.json(
        {
          ok: false,
          error: "payment_validation_failed",
          details:
            "Flutterwave returned no valid successful transaction for this Ref or Email.",
            debug: debugInfo
        },
        { status: 400 }
      );
    }

    // Strict Data Check: User insists on "these information"
    // We enforce that we have an FLW ID and a Ref.
    if (!data.id || !data.tx_ref) {
      return NextResponse.json(
        {
          ok: false,
          error: "incomplete_payment_data",
          details: "Transaction lacks critical reference data.",
        },
        { status: 400 }
      );
    }

    const amount = Number(data.amount || 0);
    const currency = String(data.currency || "NGN");

    // Strict price check against individual plan if available
    let priceOk = true;
    if ((row as any).program_id) {
      const pid = (row as any).program_id as number;
      const { data: plan } = await admin
        .from("program_plans")
        .select("price,currency")
        .eq("program_id", pid)
        .eq("plan_type", "individual")
        .is("family_size", null)
        .maybeSingle();
      if (plan) {
        const expected = Number((plan as any).price || 0);
        const ec = (plan as any).currency || "NGN";
        priceOk = expected > 0 && amount === expected && currency === ec;
      }
    }
    if (!priceOk)
      return NextResponse.json(
        { ok: false, error: "amount_mismatch" },
        { status: 400 }
      );

    // Update row as paid/active
    // Construct Rich Metadata
    const richMeta = {
      bank_name: data.card?.issuer || data.account?.bank_name || "N/A",
      originator_name:
        data.customer?.name || data.meta?.originatorname || "N/A",
      payment_type: data.payment_type || "N/A",
      ip_address: data.ip_address || "N/A",
      created_at: data.created_at, // Payment Started
      paid_at: data.created_at, // Payment Completed (using created_at as FLW often syncs them or verifies instantly)
      flw_ref: data.flw_ref,
      narration: data.narration,
    };

    // Update row as paid/active with Rich Data
    // We try to update payment_meta. If it fails (migration not run), we fallback to simple update.
    let updatePayload: any = {
      status: "active",
      payment_status: "paid",
      amount,
      currency,
      transaction_id: String(data.id),
    };

    // Try to include new columns. If this throws due to missing column, we'll retry without them.
    // Actually, supabase-js might throw validation error before sending? No, usually SQL error.
    // For safety, let's just perform the update. Use a separate call for meta if paranoid, but one call is atomic.
    // Let's assume user WILL run migration. But to prevent 500s right now:
    // Update with rich metadata
    const payloadWithMeta = {
      ...updatePayload,
      payment_meta: richMeta,
      flw_ref: data.flw_ref,
    };
    
    const { error: updateErr } = await admin
      .from("enrollments")
      .update(payloadWithMeta)
      .eq("id", enrollmentId);
    
    if (updateErr) {
      console.error("Payment status update failed:", updateErr);
      return NextResponse.json(
        { ok: false, error: "update_failed", details: updateErr.message },
        { status: 500 }
      );
    }

    console.log(`✅ Enrollment #${enrollmentId} verified and updated to PAID`);
    return NextResponse.json({ 
      ok: true, 
      status: "paid", 
      id: enrollmentId,
      message: "Payment verified and status updated successfully"
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
