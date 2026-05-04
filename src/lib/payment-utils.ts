import { SupabaseClient } from "@supabase/supabase-js";

export interface RichPaymentMeta {
  bank_name: string;
  originator_name: string;
  payment_type: string;
  ip_address: string;
  created_at: string;
  paid_at: string;
  flw_ref: string;
  narration: string;
  originator_account?: string;
}

/**
 * Robustly extract payment metadata from Flutterwave payload
 */
export function constructRichMeta(data: any): RichPaymentMeta {
  return {
    bank_name: data.card?.issuer || data.account?.bank_name || data.meta?.bankname || "N/A",
    originator_name: data.customer?.name || data.meta?.originatorname || "N/A",
    payment_type: data.payment_type || "N/A",
    ip_address: data.ip_address || data.ip || "N/A",
    created_at: data.created_at,
    paid_at: data.created_at,
    flw_ref: data.flw_ref,
    narration: data.narration || "Mubeen Academy",
    originator_account: data.meta?.originatoraccountnumber || "N/A",
  };
}

export interface VerificationResult {
  ok: boolean;
  error?: string;
  enrollment_id?: number;
}

/**
 * Shared utility to finalize a payment in the database.
 * Updates enrollment status, records amount, stores rich metadata, and handles subscription expiry.
 */
export async function finalizePayment(
  admin: SupabaseClient,
  params: {
    enrollmentId: number;
    amount: number;
    currency: string;
    transactionId: string;
    flwRef: string;
    txRef: string;
    richMeta: RichPaymentMeta;
  }
): Promise<VerificationResult> {
  // 1. Fetch the enrollment to get entity details and plan info
  const { data: enrollment, error: fetchErr } = await admin
    .from("enrollments")
    .select("id, program_id, skill_id, type, status, payment_status, plan_id, subscription_type, expires_at")
    .eq("id", params.enrollmentId)
    .maybeSingle();

  if (fetchErr || !enrollment) {
    return { ok: false, error: "enrollment_not_found" };
  }

  // Skip if already paid
  if (enrollment.status === "active" || enrollment.payment_status === "paid") {
    return { ok: true, enrollment_id: params.enrollmentId };
  }

  // 2. Perform authoritative price check and determine subscription type
  const kind = (enrollment.type || "program") as "program" | "skill" | "donation" | "other";
  const entityId = kind === "program" ? enrollment.program_id : enrollment.skill_id;
  
  let subType = enrollment.subscription_type;
  let planPrice: number | null = null;
  let planCurrency: string | null = null;

  if ((kind === "program" || kind === "skill") && entityId) {
    // If we have a specific plan_id, use it; else look up by entity
    const query = admin.from("pricing_plans").select("price, currency, subscription_type");
    
    if (enrollment.plan_id) {
      query.eq("id", enrollment.plan_id);
    } else {
      query.eq("entity_type", kind).eq("entity_id", entityId);
    }

    const { data: plan } = await query.maybeSingle();

    if (plan) {
      planPrice = Number(plan.price || 0);
      planCurrency = plan.currency || "NGN";
      if (!subType) subType = plan.subscription_type;
      
      // Strict price check log
      if (params.amount < planPrice || params.currency !== planCurrency) {
        console.warn(`Price check: Enrollment #${params.enrollmentId} paid ${params.amount} ${params.currency}, expected ${planPrice} ${planCurrency}`);
      }
    }
  }

  // 3. Expiry Logic for Subscriptions
  let expiresAt = enrollment.expires_at;
  if (subType && subType !== "once") {
    const baseDate = expiresAt ? (new Date(expiresAt) > new Date() ? new Date(expiresAt) : new Date()) : new Date();
    const nextExpiry = new Date(baseDate);
    
    if (subType === "monthly") nextExpiry.setMonth(nextExpiry.getMonth() + 1);
    else if (subType === "yearly") nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);
    else if (subType === "weekly") nextExpiry.setDate(nextExpiry.getDate() + 7);
    
    expiresAt = nextExpiry.toISOString();
  }

  // 4. Update the enrollment
  const updatePayload: any = {
    status: "active",
    payment_status: "paid",
    amount: params.amount,
    currency: params.currency,
    transaction_id: params.transactionId,
    tx_ref: params.txRef,
    flw_ref: params.flwRef,
    payment_meta: params.richMeta,
    updated_at: new Date().toISOString(),
  };

  if (expiresAt) updatePayload.expires_at = expiresAt;
  if (subType) updatePayload.subscription_type = subType;

  const { error: updateErr } = await admin
    .from("enrollments")
    .update(updatePayload)
    .eq("id", params.enrollmentId);

  if (updateErr) {
    console.error(`Failed to update enrollment #${params.enrollmentId}:`, updateErr);
    return { ok: false, error: updateErr.message };
  }

  return { ok: true, enrollment_id: params.enrollmentId };
}
