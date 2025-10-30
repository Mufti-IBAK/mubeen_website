"use client";

import React, { useEffect, useState } from 'react';

export default function ClientPage({ refVal }: { refVal: string }) {
  const [status, setStatus] = useState<'pending'|'success'|'error'>('pending');
  const [message, setMessage] = useState('Verifying your payment…');

  useEffect(() => {
    const run = async () => {
      try {
        if (!refVal) { setStatus('error'); setMessage('Missing payment reference'); return; }
        const res = await fetch(`/api/payments/verify?ref=${encodeURIComponent(refVal)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.ok) {
          setStatus('success');
          setMessage('Payment verified. You will be redirected to your dashboard in 10 seconds…');
          setTimeout(() => { window.location.href = '/dashboard/registrations'; }, 10000);
        } else {
          setStatus('error');
          setMessage(json?.error || 'Unable to verify payment. If you paid by bank transfer, please email a screenshot to mubeenacademy001@gmail.com.');
        }
      } catch {
        setStatus('error');
        setMessage('Verification failed. Please contact support.');
      }
    };
    run();
  }, [refVal]);

  return (
    <div className="bg-brand-bg">
      <div className="container mx-auto flex flex-col items-center justify-center min-h-screen text-center px-6 py-20">
        <div className="bg-white p-10 rounded-lg shadow-xl max-w-lg w-full">
          {status === 'success' ? (
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          ) : status === 'error' ? (
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-brand-dark font-heading mb-2">{status === 'success' ? 'Payment Successful' : status === 'error' ? 'Payment Pending/Failed' : 'Processing…'}</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <p className="text-sm text-gray-500">
            If you paid via bank transfer, please take a screenshot and email it to <a href="mailto:mubeenacademy001@gmail.com" className="text-brand-primary font-semibold">mubeenacademy001@gmail.com</a>.
          </p>
          <div className="mt-6">
            <a href="/dashboard/registrations" className="w-full inline-block rounded-md bg-brand-primary py-3 text-md font-semibold text-white transition-colors hover:bg-blue-600">Go to My Registrations</a>
          </div>
        </div>
      </div>
    </div>
  );
}