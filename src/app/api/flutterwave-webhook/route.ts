import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1. SECURITY CHECK: Verify the webhook signature from the headers
    const flutterwaveSignature = req.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

    // Ensure the secret hash is configured in your environment variables
    if (!secretHash) {
      console.error("CRITICAL: Flutterwave secret hash is not set.");
      return new NextResponse('Internal server configuration error', { status: 500 });
    }

    // Compare the signature from the request with your secret hash
    if (flutterwaveSignature !== secretHash) {
      console.warn("Invalid Flutterwave signature received. Request rejected.");
      return new NextResponse('Invalid signature', { status: 401 }); // Unauthorized
    }

    // 2. PROCESS THE VALIDATED DATA
    // If we reach here, the request is authentic.
    const eventData = await req.json();

    // We are only interested in successful charge events
    if (eventData.event === "charge.completed" && eventData.data.status === "successful") {
      const rawRef: string = eventData.data.tx_ref;
      const transaction_id = eventData.data?.id || eventData.data?.flw_ref || eventData.data?.tx_id || null;
      const paidAmount = Number(eventData.data?.amount) || null;
      const paidCurrency = (eventData.data?.currency as string) || null;

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const admin = createClient(url, service);

      // Extract draft_id and plan_id from tx_ref or meta
      let draftId: number | null = null;
      let planId: number | null = null;
      try {
        if (typeof rawRef === 'string' && rawRef.startsWith('draft-')) {
          // format: draft-<draftId>-plan-<planId>
          const parts = rawRef.split('-');
          // ['draft', '<id>', 'plan', '<planId>']
          if (parts.length >= 4) {
            draftId = Number(parts[1]);
            planId = Number(parts[3]);
          } else {
            draftId = Number(parts[1]);
          }
        }
      } catch {}
      if (!draftId) {
        const meta = eventData.data?.meta || {};
        if (meta.draft_id) draftId = Number(meta.draft_id);
        if (meta.plan_id) planId = Number(meta.plan_id);
      }

      if (!draftId) {
        console.warn('Webhook missing draft id; aborting');
      } else {
        // Load draft
        const { data: draft, error: dErr } = await admin
          .from('registration_drafts')
          .select('id,user_id,program_id,registration_type,family_size,plan_id,draft_data')
          .eq('id', draftId)
          .single();
        if (dErr || !draft) {
          console.error('Draft not found for id', draftId, dErr);
        } else {
          const finalPlanId = planId || (draft as any).plan_id || null;
          let durationMonths: number | null = null;
          let planPrice: number | null = null;
          let planCurrency: string | null = null;
          if (finalPlanId) {
            const { data: planRow } = await admin.from('program_plans').select('duration_months,price,currency').eq('id', finalPlanId).maybeSingle();
            durationMonths = (planRow as any)?.duration_months ?? null;
            planPrice = planPrice ?? (planRow as any)?.price ?? null;
            planCurrency = (planRow as any)?.currency ?? null;
          }
          const payload: Record<string, any> = {
            user_id: (draft as any).user_id,
            program_id: (draft as any).program_id,
            is_family: (draft as any).registration_type === 'family_head',
            family_size: (draft as any).registration_type === 'family_head' ? (draft as any).family_size : null,
            status: 'registered',
            payment_status: 'paid',
            plan_id: finalPlanId,
            duration_months: durationMonths,
            form_data: (draft as any).draft_data || {},
            amount: paidAmount || planPrice,
            currency: paidCurrency || planCurrency,
            transaction_id,
          };
          const { data: inserted, error: insErr } = await admin.from('enrollments').insert(payload).select('id').single();
          if (insErr) {
            console.error('Failed to create enrollment from draft', insErr);
          } else {
            await admin.from('registration_drafts').delete().eq('id', draftId);
            console.log(`Created enrollment ${inserted?.id} from draft ${draftId}`);
          }
        }
      }
    }
    
    // 4. RESPOND TO FLUTTERWAVE
    // Always return a 200 OK status to acknowledge receipt of the event
    return new NextResponse('Webhook processed successfully', { status: 200 });

  } catch (error) {
    console.error("Error processing Flutterwave webhook:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
