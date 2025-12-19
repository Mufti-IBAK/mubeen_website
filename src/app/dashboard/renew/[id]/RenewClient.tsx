"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RenewCheckout() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollment, setEnrollment] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?next=/dashboard/renew/' + id);
          return;
        }

        const { data: enroll } = await supabase.from('enrollments').select('*').eq('id', id).single();
        if (!enroll || enroll.user_id !== user.id) throw new Error("Enrollment not found");
        setEnrollment(enroll);

        // Fetch pricing
        const entity_type = enroll.program_id ? 'program' : 'skill';
        const entity_id = enroll.program_id || enroll.skill_id;
        const { data: p } = await supabase.from('pricing_plans').select('*').eq('entity_type', entity_type).eq('entity_id', entity_id).single();
        setPlan(p);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, router]);

  const handlePay = async () => {
    if (!enrollment || !plan) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          amount: plan.price,
          currency: plan.currency,
          email: enrollment.user_email,
          name: enrollment.user_name,
          tx_ref: `renew-${enrollment.id}-${Date.now()}`,
          meta: {
            enrollment_id: enrollment.id,
            type: 'renewal'
          }
        })
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else throw new Error("Could not initialize payment");
    } catch (e: any) {
      alert(e.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Subscription Details...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="container-page py-20 max-w-2xl mx-auto">
      <div className="card shadow-xl border-t-4 border-brand-primary">
        <div className="card-body">
          <h2 className="text-2xl font-bold font-heading mb-4">Renew Subscription</h2>
          <p className="text-muted-foreground mb-6">You are renewing your subscription for: <br/> 
            <span className="text-foreground font-semibold">
              {enrollment.program_id ? 'Professional Program' : 'Skill Up Course'}
            </span>
          </p>
          
          <div className="bg-brand-bg/50 p-4 rounded-lg mb-8 space-y-3">
            <div className="flex justify-between">
              <span>Renewal Period:</span>
              <span className="font-bold underline capitalize">{plan.subscription_type}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Amount to Pay:</span>
              <span className="text-brand-primary">{plan.currency} {plan.price.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={handlePay}
            disabled={loading}
            className="btn-primary w-full py-4 text-lg"
          >
            {loading ? 'Processing...' : `Pay & Renew Now`}
          </button>
          
          <p className="text-xs text-center mt-4 text-muted-foreground">
            Payment is secured and handled by Flutterwave. Your subscription will be extended immediately after successful payment.
          </p>
        </div>
      </div>
    </div>
  );
}
