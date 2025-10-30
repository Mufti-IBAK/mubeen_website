import React from 'react';
import { supabase } from '@/lib/supabaseClient';

export default async function PaymentSummary({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const token = sp.token || '';
  // Token is a base64(JSON) + HMAC in query, handled by API; if missing, show error
  if (!token) {
    return <div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Invalid or missing summary token.</div>;
  }
  // token format: b64payload.b64sig; payload contains fields
  const [b64,] = token.split('.');
  const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  let data: any = {};
  try { data = JSON.parse(jsonStr); } catch {}
  const full_name = data.full_name || '';
  const email = data.email || '';
  const kind = data.kind as ('program'|'donation'|'other');
  const amountToken = String(data.amount || '');
  let amount = amountToken;
  let currency = data.currency || 'NGN';
  const program_id = data.program_id ? Number(data.program_id) : undefined;
  const description = data.description || '';
  const se = data.se || '';

  // For program payments, fetch authoritative price from program_plans
  if (program_id) {
    const { data: plan } = await supabase
      .from('program_plans')
      .select('price,currency')
      .eq('program_id', program_id)
      .eq('plan_type', 'individual')
      .is('family_size', null)
      .maybeSingle();
    if (plan) {
      amount = String(Number((plan as any).price || 0));
      currency = (plan as any).currency || currency;
    }
  }

  const proceed = async () => {};

  // Load program card for UX
  let program: any = null;
  if (program_id) {
    const { data } = await supabase
      .from('programs')
      .select('title,image_url,duration,start_date,schedule,faqs,tags')
      .eq('id', program_id)
      .maybeSingle();
    program = (data as any) || null;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page max-w-2xl space-y-6">
        <h1 className="text-3xl font-extrabold">Review Payment</h1>
        {program && (
          <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            {program.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={program.image_url as string} alt={program.title || 'Program'} className="w-full h-40 object-cover" />
            ) : null}
            <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold">{program.title || 'Program'}</h2>
              {program.duration && <p className="text-sm text-[hsl(var(--muted-foreground))]">Duration: {program.duration}</p>}
              {program.start_date && <p className="text-sm text-[hsl(var(--muted-foreground))]">Start: {program.start_date}</p>}
              {((program.tags && Array.isArray(program.tags)) ? program.tags.length>0 : false) && (
                <div className="flex flex-wrap gap-2">
                  {program.tags.map((t: string) => (<span key={t} className="badge">{t}</span>))}
                </div>
              )}
              {program.schedule && (
                <div className="prose prose-sm">
                  <h3>Schedule</h3>
                  <ul>
                    {((Array.isArray(program.schedule?.items) ? program.schedule.items : program.schedule) as any[]).map((s: any, idx: number) => (
                      <li key={idx}>{s.when || s.date}: {s.title || s.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {program.faqs && Array.isArray(program.faqs) && program.faqs.length > 0 && (
                <div className="prose prose-sm">
                  <h3>FAQ</h3>
                  <ul>
                    {program.faqs.map((f: any, idx: number) => (<li key={idx}><span className="font-medium">{f.q || f.question}</span>: {f.a || f.answer}</li>))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="card">
          <div className="card-body space-y-2">
            <p><span className="font-medium">Name:</span> {full_name}</p>
            <p><span className="font-medium">Email:</span> {email}</p>
            <p><span className="font-medium">Type:</span> {kind}</p>
            {program_id ? <p><span className="font-medium">Program ID:</span> {program_id}</p> : null}
            {kind === 'other' && description ? <p><span className="font-medium">Description:</span> {description}</p> : null}
            <p><span className="font-medium">Amount:</span> {currency} {Number(amount || '0').toLocaleString()}</p>
          </div>
        </div>

        <div className="prose prose-sm">
          <h2>Payment Instructions</h2>
          <ul>
            <li>You will be redirected to Flutterwave to complete your payment securely.</li>
            <li>Please take screenshots of your payment steps and confirmation for your records.</li>
            <li>After payment, you will be redirected back to our site.</li>
          </ul>
        </div>

        <form action="/api/payments/initiate" method="post">
          <input type="hidden" name="full_name" value={full_name} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="kind" value={kind} />
          {program_id ? <input type="hidden" name="program_id" value={String(program_id)} /> : null}
          {description ? <input type="hidden" name="description" value={description} /> : null}
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="currency" value={currency} />
          {se ? <input type="hidden" name="success_enroll_id" value={se} /> : null}
          <button className="btn-primary">Proceed to Payment</button>
        </form>
      </div>
    </div>
  );
}