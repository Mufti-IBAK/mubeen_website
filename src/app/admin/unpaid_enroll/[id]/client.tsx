"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { useToast } from '@/components/ui/use-toast';

export default function UnpaidDetails({ idParam }: { idParam: string }) {
  const [rows, setRows] = useState<Array<{ id: number; se_id: number|null; user_id: string|null; user_name: string|null; user_email: string|null; program_id: number; program_title: string|null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any|null>(null);
  const [editor, setEditor] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const decoded = decodeURIComponent(idParam);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const params = new URLSearchParams(
        /^[0-9a-fA-F-]{36}$/.test(decoded) ? { user_id: decoded } : { user_email: decoded }
      );
      const res = await fetch(`/api/admin/unpaid-enroll/by-user?${params.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const json = await res.json().catch(() => ({}));
      setRows((json.items || []) as any[]);
      setLoading(false);
    };
    load();
  }, [idParam]);

  const openEditor = (row: any) => {
    setEditing(row);
    setEditor(JSON.stringify(row.form_data || {}, null, 2));
  };

  const saveEditor = async () => {
    if (!editing) return;
    try {
      const parsed = editor.trim() ? JSON.parse(editor) : {};
      const res = await fetch(`/api/admin/unpaid-enroll/${editing.id}/update`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ form_data: parsed }) });
      if (!res.ok) throw new Error('Update failed');
      setEditing(null);
      setRows(prev => prev.map(r => r.id === editing.id ? ({ ...r, form_data: parsed }) : r));
      toast({ title: 'Saved', description: 'Unpaid enrollment updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Invalid JSON', variant: 'destructive' });
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this unpaid enrollment?')) return;
    await fetch(`/api/admin/unpaid-enroll/${id}/delete`, { method: 'DELETE' });
    setRows(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <div className="card"><div className="card-body">Loading…</div></div>;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Unpaid for {rows[0]?.user_name || rows[0]?.user_email || 'user'}</h1>
        </div>
        {rows.length === 0 ? (
          <div className="card"><div className="card-body">No unpaid enrollments found.</div></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Program</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Saved</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-4">{r.id}</td>
                    <td className="py-2 pr-4">{r.program_title || r.program_id}</td>
                    <td className="py-2 pr-4">{(r as any).form_data?.category || ((r as any).form_data?.family_size ? `family_${(r as any).form_data?.family_size}` : 'individual')}</td>
                    <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button className="btn-outline" onClick={() => openEditor(r as any)} aria-label={`View form ${r.id}`}>View</button>
                        <button className="btn-destructive" onClick={() => remove(r.id)} aria-label={`Delete unpaid enrollment ${r.id}`}>Delete</button>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit unpaid enrollment form">
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
