"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

declare const FlutterwaveCheckout: any;

export default function PaymentGuidePage() {
  const sp = useSearchParams();
  const draftParam = sp.get('draft');
  const planParam = sp.get('plan');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programTitle, setProgramTitle] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('NGN');

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const draftId = Number(draftParam);
        const planId = Number(planParam);
        if (!draftId || !planId) { setError('Missing payment details.'); return; }
        // Fetch draft to get program id
        const { data: draftRow, error: dErr } = await supabase
          .from('enrollments')
          .select('program_id')
          .eq('id', draftId)
          .eq('is_draft', true)
          .single();
        if (dErr || !draftRow) { setError('Draft not found.'); return; }
        const programId = (draftRow as any).program_id as number;
        const [{ data: prog }, { data: planRow }] = await Promise.all([
          supabase.from('programs').select('title').eq('id', programId).single(),
          supabase.from('program_plans').select('price,currency').eq('id', planId).single()
        ]);
        setProgramTitle((prog as any)?.title || 'Program');
        setAmount(Number((planRow as any)?.price) || 0);
        setCurrency(((planRow as any)?.currency as string) || 'NGN');
      } catch (e: any) {
        setError(e?.message || 'Failed to prepare payment.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [draftParam, planParam]);

  const openFlutterwave = async () => {
    const draftId = Number(draftParam);
    if (!draftId || !amount) return;
    try {
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: `draft-${draftId}`,
        amount,
        currency,
        redirect_url: `/payment-success?ref=draft-${draftId}`,
        customer: {},
        customizations: { title: 'Mubeen Academy', description: `Payment for ${programTitle}`, logo: '/logo.png' },
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page max-w-3xl mx-auto">
        <div className="card">
          <div className="card-body space-y-4">
            <h1 className="text-2xl font-bold">Payment Guide</h1>
            {loading ? (
              <p className="text-[hsl(var(--muted-foreground))]">Preparing payment...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              <>
                <p className="text-[hsl(var(--muted-foreground))]">You're about to pay for <span className="font-semibold text-[hsl(var(--foreground))]">{programTitle}</span>.</p>
                <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--muted-foreground))]">
                  <li>We accept multiple payment methods via Flutterwave (Cards, Bank Transfer, USSD, etc.).</li>
                  <li>Please take a screenshot of your payment confirmation as evidence.</li>
                  <li>If you pay by bank transfer, email the screenshot to <a className="underline" href="mailto:mubeenacademy001@gmail.com">mubeenacademy001@gmail.com</a>.</li>
                </ul>
                <div className="pt-2">
                  <button className="btn-primary" onClick={openFlutterwave}>Continue to payment ({currency} {amount})</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
