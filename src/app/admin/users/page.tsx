"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Array<{ id: string; role: string; email?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, email, role').order('created_at', { ascending: false });
      setRows((profs as Array<{ id: string; email?: string; role: string }> || []).map(p => ({ id: p.id, email: p.email, role: p.role })));
      setLoading(false);
    };
    load();
  }, []);

  const setRole = async (id: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    setRows(rows.map(r => r.id === id ? { ...r, role } : r));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-dark font-heading mb-4">Users</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        {loading ? (<p className="text-brand-dark/70">Loading...</p>) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-brand-dark/70">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-4">{u.email || u.id}</td>
                    <td className="py-2 pr-4">{u.role}</td>
                    <td className="py-2 pr-4">
                      <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} className="border px-2 py-1 rounded">
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

