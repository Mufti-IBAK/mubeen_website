"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

type Row = { id: number; user_id: string | null; user_name: string | null; user_email: string | null; type: string; program_id: number | null; program_title: string | null; amount: number | null; currency: string | null; description: string | null; created_at: string; classroom_link?: string | null };

export default function Client({ idParam }: { idParam: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<null | Row>(null);
  const [editor, setEditor] = useState<string>('');
  const [linkEditing, setLinkEditing] = useState<null | Row>(null);
  const [linkInput, setLinkInput] = useState<string>('');
  const [classLinks, setClassLinks] = useState<Record<number, string>>({});
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
        const items = (json.items || []) as Row[];
        setRows(items);
        
        // Fetch classroom links for these enrollments
        const enrollmentIds = items.map(r => r.id);
        if (enrollmentIds.length > 0) {
          const linksRes = await supabase
            .from('class_links')
            .select('enrollment_id, classroom_link')
            .in('enrollment_id', enrollmentIds);
          if (linksRes.data) {
            const linksMap: Record<number, string> = {};
            linksRes.data.forEach((link: {enrollment_id: number; classroom_link: string}) => {
              linksMap[link.enrollment_id] = link.classroom_link;
            });
            setClassLinks(linksMap);
          }
        }
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

  const openLinkEditor = (row: Row) => {
    setLinkEditing(row);
    setLinkInput(classLinks[row.id] || '');
  };

  const saveLinkEditor = async () => {
    if (!linkEditing) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/admin/class-links/upsert', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          enrollment_id: linkEditing.id,
          classroom_link: linkInput.trim(),
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save link');
      }
      
      // Update local state
      if (linkInput.trim() === '') {
        // Remove link from state
        setClassLinks(prev => {
          const updated = { ...prev };
          delete updated[linkEditing.id];
          return updated;
        });
      } else {
        // Update link in state
        setClassLinks(prev => ({ ...prev, [linkEditing.id]: linkInput.trim() }));
      }
      
      setLinkEditing(null);
      toast({ title: 'Saved', description: linkInput.trim() === '' ? 'Classroom link removed' : 'Classroom link saved successfully' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save link', variant: 'destructive' });
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
                <th className="py-2 pr-4">Classroom</th>
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
                  <td className="py-2 pr-4">
                    {classLinks[r.id] ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded" title={classLinks[r.id]}>✓ Added</span>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">No link</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button className="btn-outline" onClick={() => openEditor(r)} aria-label={`View and edit form for enrollment ${r.id}`}>View Form</button>
                      <button className="btn-primary" onClick={() => openLinkEditor(r)} aria-label={`Add or edit classroom link for enrollment ${r.id}`}>{classLinks[r.id] ? 'Edit Link' : 'Add Link'}</button>
                      <button className="btn-destructive" onClick={() => remove(r.id)} aria-label={`Delete enrollment ${r.id}`}>Delete</button>
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

    {linkEditing && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="link-modal-title">
        <div className="absolute inset-0 bg-black/50" onClick={() => setLinkEditing(null)} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-lg card">
          <div className="card-body space-y-4">
            <div>
              <h2 id="link-modal-title" className="text-lg font-semibold">Classroom Link</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {linkEditing.program_title || `Program ${linkEditing.program_id}`} - Enrollment #{linkEditing.id}
              </p>
            </div>
            <div>
              <label htmlFor="classroom-link-input" className="block text-sm font-medium mb-2">
                Classroom URL
              </label>
              <input
                id="classroom-link-input"
                type="url"
                className="input w-full"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://classroom.example.com/course-123"
                aria-describedby="link-help-text"
              />
              <p id="link-help-text" className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Leave empty to remove the link. Students will see a &quot;Join Classroom&quot; button if a link is set.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="btn-outline" onClick={() => setLinkEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveLinkEditor} aria-label="Save classroom link">Save</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
