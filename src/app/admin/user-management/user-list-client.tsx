"use client";

import React from 'react';
import { supabase } from '@/lib/supabaseClient';

type UserRec = { id: string; email: string; created_at?: string; role: string };

export default function UserListClient({ users }: { users: UserRec[] }) {
  const [rows, setRows] = React.useState<UserRec[]>(users);
  const [msg, setMsg] = React.useState('');

  const setRole = async (id: string, role: string) => {
    setMsg('');
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) setMsg(error.message); else setRows(rows.map(r => r.id === id ? { ...r, role } : r));
  };

  const deleteUser = async (id: string) => {
    setMsg('');
    if (!confirm('Delete this auth user? This cannot be undone.')) return;
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setMsg('Failed to delete user'); return; }
    setRows(rows.filter(r => r.id !== id));
  };

  return (
    <div className="card">
      <div className="card-body">
        {msg && <p className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(u => (
            <div key={u.id} className="border rounded-xl p-4">
              <p className="font-semibold">{u.email || u.id}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{u.created_at ? new Date(u.created_at).toLocaleString() : ''}</p>
              <div className="flex items-center gap-2">
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} className="select w-40">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <button onClick={() => deleteUser(u.id)} className="btn-destructive">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
