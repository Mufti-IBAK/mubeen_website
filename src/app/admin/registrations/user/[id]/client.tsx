"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

type Row = { id: number; user_id: string | null; user_name: string | null; user_email: string | null; type: string; program_id: number | null; program_title: string | null; amount: number | null; currency: string | null; description: string | null; created_at: string };

export default function Client({ idParam }: { idParam: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<null | Row>(null);
  const [editor, setEditor] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const decoded = decodeURIComponent(idParam);
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const params = new URLSearchParams(
          /^[0-9a-fA-F-]{36}$/.test(decoded)
            ? { user_id: decoded }
            : decoded === 'unknown-null'
              ? { user_email: '' } // unreachable branch; kept for completeness
              : { user_email: decoded }
        );
        const res = await fetch(`/api/admin/registrations/by-user?${params.toString()}` , { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        setRows((json.items || []) as Row[]);
      } finally {
        setLoading(false);
      }
    };
    load();
     
  }, [idParam]);
  const csv = useMemo(() => {
    const header = ['id','type','program_id','program_title','amount','currency','description','created_at'];
    const lines = [header.join(',')];
    rows.forEach(r => {
      lines.push([r.id, r.type, r.program_id ?? '', JSON.stringify(r.program_title || ''), r.amount ?? '', r.currency || '', JSON.stringify(r.description || ''), r.created_at].join(','));
    });
    return lines.join('\n');
  }, [rows]);

  const downloadCsv = () => {
    const base = (rows[0]?.user_name || rows[0]?.user_email || 'user').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    const filename = `${base || 'user'}_registrations.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this record?')) return;
    await fetch(`/api/admin/success-enroll/${id}/delete`, { method: 'DELETE' });
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const removeAll = async () => {
    if (!confirm('Delete ALL records for this user? This cannot be undone.')) return;
    await fetch(`/api/admin/success-enroll/user/${encodeURIComponent(idParam)}/delete`, { method: 'DELETE' });
    setRows([]);
  };

  const openEditor = (row: Row) => {
    setEditing(row);
    setEditor(JSON.stringify((row as any).form_data || {}, null, 2));
  };
  const saveEditor = async () => {
    if (!editing) return;
    try {
      const parsed = editor.trim() ? JSON.parse(editor) : {};
      const res = await fetch(`/api/admin/success-enroll/${editing.id}/update`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ form_data: parsed }) });
      if (!res.ok) throw new Error('Update failed');
      setRows(prev => prev.map(r => r.id === editing.id ? ({ ...r, ...( { form_data: parsed } as any) }) : r));
      setEditing(null);
      toast({ title: 'Saved', description: 'Enrollment updated successfully' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Invalid JSON', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">User Registrations</h1>
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={downloadCsv}>Export CSV</button>
          <button className="btn-destructive" onClick={removeAll}>Delete All</button>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-body">Loading…</div></div>
      ) : rows.length === 0 ? (
        <div className="card"><div className="card-body">No registrations found.</div></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Program</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-4">{r.id}</td>
                  <td className="py-2 pr-4">{r.type}</td>
                  <td className="py-2 pr-4">{r.program_id ? (r.program_title || `Program ${r.program_id}`) : (r.type === 'donation' ? 'Donation' : 'Other Payment')}</td>
                  <td className="py-2 pr-4">{(r as any).category || (r as any).form_data?.category || ((r as any).form_data?.family_size ? `family_${(r as any).form_data?.family_size}` : 'individual')}</td>
                  <td className="py-2 pr-4">{r.currency || 'NGN'} {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button className="btn-outline" onClick={() => openEditor(r)} aria-label={`View and edit form for enrollment ${r.id}`}>View Form</button>
                      <button className="btn-destructive" onClick={() => remove(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {editing && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit enrollment form">
        <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
        <div className="relative z-10 w-full max-w-2xl card">
          <div className="card-body space-y-3">
            <h2 className="text-lg font-semibold">Edit Form Data (JSON)</h2>
            <textarea className="textarea w-full h-64" value={editor} onChange={(e) => setEditor(e.target.value)} aria-label="Form JSON editor" />
            <div className="flex items-center justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEditor}>Save</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
