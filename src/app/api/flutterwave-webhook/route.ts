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

      // Support both legacy numeric refs and new draft-<id> refs
      let idStr = rawRef || '';
      if (!idStr) {
        console.warn('Missing tx_ref in webhook payload');
      }
      if (idStr.startsWith('draft-')) idStr = idStr.replace('draft-', '');
      const enrollmentId = Number(idStr);

      // Fetch current row to merge draft_data -> form_data if needed
      const { data: row, error: selErr } = await admin
        .from('enrollments')
        .select('id,is_draft,draft_data,form_data')
        .eq('id', enrollmentId)
        .maybeSingle();
      if (selErr) {
        console.error('Enrollments select error', selErr);
      }

      const form_data = (row?.draft_data as Record<string, unknown> | null) || row?.form_data || {};

      const { error: updErr } = await admin
        .from('enrollments')
        .update({
          payment_status: 'paid',
          transaction_id,
          amount: paidAmount,
          currency: paidCurrency,
          is_draft: false,
          status: 'registered',
          form_data,
          draft_data: null,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (updErr) {
        console.error('Failed to finalize enrollment on webhook', updErr);
      } else {
        console.log(`Finalized enrollment ${enrollmentId} from webhook`);
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
