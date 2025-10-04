"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegistrationRequestPage() {
  const params = useSearchParams();
  const type = (params.get("type") || "").toLowerCase();
  const id = Number(params.get("id"));
  const [contactEmail, setContactEmail] = useState("");
  const [reason, setReason] = useState("");
  const [allPrograms, setAllPrograms] = useState<Array<{ id: number; title: string }>>([]);
  const [targetProgram, setTargetProgram] = useState<number | "">("");
  const [programTitle, setProgramTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user?.email) setContactEmail(user.email);
      // load enrollment program for title
      if (id && user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('program_id')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        const pid = (enr as any)?.program_id as number | undefined;
        if (pid) {
          const { data: prog } = await supabase.from('programs').select('title').eq('id', pid).single();
          setProgramTitle((prog as any)?.title || ``);
        }
      }
      // load all programs for transfer
      const { data: progs } = await supabase.from('programs').select('id,title').order('title');
      setAllPrograms((progs as any[]) || []);
    };
    init();
  }, [id]);

  const email = useMemo(() => {
    const subjectBase = type === 'transfer' ? 'Transfer Request' : type === 'defer' ? 'Defer Request' : 'End Program Request';
    const subject = id ? `[${subjectBase}] Enrollment #${id}` : subjectBase;
    let bodyLines: string[] = [
      "Dear Mubeen Academy Team,",
      "",
    ];
    if (type === 'transfer') {
      const to = typeof targetProgram === 'number' ? allPrograms.find(p => p.id === targetProgram)?.title : undefined;
      bodyLines.push(
        "I would like to request a transfer for my enrollment.",
        id ? `Enrollment ID: ${id}` : "Enrollment ID: (please include)",
        `Current Program: ${programTitle || '(please include)'}`,
        `Requested Program: ${to || '(please select)'}`,
        `Reason: ${reason || '(please include your reason)'} `,
      );
    } else if (type === 'defer') {
      bodyLines.push(
        "I would like to request a deferment for my enrollment.",
        id ? `Enrollment ID: ${id}` : "Enrollment ID: (please include)",
        `Program: ${programTitle || '(please include)'}`,
        `Reason: ${reason || '(please include your reason)'} `,
      );
    } else {
      bodyLines.push(
        "I would like to request to end my program.",
        id ? `Enrollment ID: ${id}` : "Enrollment ID: (please include)",
        `Program: ${programTitle || '(please include)'}`,
        `Reason: ${reason || '(please include your reason)'} `,
      );
    }
    bodyLines.push(
      "",
      `Contact email: ${contactEmail || '(your email)'}`,
      "",
      "Thank you for your assistance.",
      "",
      "Regards,",
      contactEmail || ''
    );
    return { subject, body: bodyLines.join('\n') };
  }, [type, id, contactEmail, reason, targetProgram, allPrograms, programTitle]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const openMail = () => {
    const to = 'mubeenacademy001@gmail.com';
    const href = `mailto:${to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = href;
  };

  const title = type === 'transfer' ? 'Request Transfer' : type === 'defer' ? 'Request Defer' : 'Request to End Program';

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page space-y-6">
        <div className="card">
          <div className="card-body flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{title}</h1>
              <p className="text-[hsl(var(--muted-foreground))]">Fill the details and send the email. We will respond within 24 hours.</p>
            </div>
            <a href="/dashboard/registrations" className="btn-outline">Back to My Registrations</a>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            {type === 'transfer' && (
              <div>
                <label className="block text-sm mb-1">Transfer to program</label>
                <select className="input w-full" value={targetProgram} onChange={(e) => setTargetProgram(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">Select program…</option>
                  {allPrograms.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">Reason (optional)</label>
              <textarea className="textarea w-full" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Share context to help our team process your request" />
            </div>
            <div>
              <label className="block text-sm mb-1">Your contact email</label>
              <input className="input w-full" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="border rounded-lg p-3 bg-[hsl(var(--muted))]/30">
              <p className="text-sm font-medium mb-2">Email preview</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs mb-1">Subject</label>
                  <input className="input w-full" value={email.subject} readOnly />
                </div>
                <div>
                  <label className="block text-xs mb-1">Body</label>
                  <textarea className="textarea w-full" rows={8} value={email.body} readOnly />
                </div>
              </div>
            </div>
          </div>
          <div className="card-footer flex items-center justify-end gap-2">
            <button className="btn-outline" onClick={copyEmail}>{copied ? 'Copied!' : 'Copy email'}</button>
            <button className="btn-primary" onClick={openMail}>Open email app</button>
          </div>
        </div>
      </div>
    </div>
  );
}

