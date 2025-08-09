import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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
      const { tx_ref } = eventData.data; // tx_ref is the transaction reference

      // 3. UPDATE THE DATABASE
      // Use the tx_ref (which is our unique registration ID) to update the record
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ payment_status: 'paid' })
        .eq('id', tx_ref);

      if (updateError) {
        // Log any database errors for monitoring and manual intervention
        console.error(`Failed to update payment status for registration ref: ${tx_ref}`, updateError);
      } else {
        // Success!
        console.log(`Successfully updated payment status to 'paid' for registration: ${tx_ref}`);
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