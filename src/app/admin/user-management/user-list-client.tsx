"use client";

import React from 'react';
import { supabase } from '@/lib/supabaseClient';

type UserRec = { id: string; email: string; created_at?: string; role: string; full_name?: string; phone?: string };

export default function UserListClient({ users }: { users: UserRec[] }) {
  const [rows, setRows] = React.useState<UserRec[]>(users);
  const [msg, setMsg] = React.useState('');
  // Track pending role changes: userId -> newRole
  const [pendingChanges, setPendingChanges] = React.useState<Record<string, string>>({});
  // Track which users are currently being saved
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [exporting, setExporting] = React.useState(false);

  /**
   * Handle role dropdown change - store in pending state
   */
  const handleRoleChange = (id: string, newRole: string) => {
    setPendingChanges(prev => ({ ...prev, [id]: newRole }));
  };

  /**
   * Save the pending role change to database
   */
  const saveRoleChange = async (id: string) => {
    const newRole = pendingChanges[id];
    if (!newRole) return;

    setMsg('');
    setSaving(prev => ({ ...prev, [id]: true }));

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
      
      if (error) {
        setMsg(`Failed to update role: ${error.message}`);
      } else {
        // Update local state to reflect the saved role
        setRows(rows.map(r => r.id === id ? { ...r, role: newRole } : r));
        // Remove from pending changes
        setPendingChanges(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setMsg(`Role updated successfully for ${rows.find(r => r.id === id)?.email || 'user'}`);
      }
    } catch (e) {
      setMsg('An error occurred while updating the role');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Export visible users to CSV (full name, email, phone, role, created_at)
   */
  const exportCsv = React.useCallback(() => {
    if (!rows.length) return;
    try {
      setExporting(true);
      const header = ['Full Name', 'Email', 'Phone', 'Role', 'Created At'];
      const lines: string[][] = [header];
      rows.forEach((u) => {
        const cols = [
          u.full_name || '',
          u.email || '',
          u.phone || '',
          u.role || '',
          u.created_at || '',
        ];
        lines.push(cols);
      });
      const csv = lines
        .map((cols) =>
          cols
            .map((value) => {
              const v = String(value ?? '');
              if (/[",\n]/.test(v)) {
                return `"${v.replace(/"/g, '""')}"`;
              }
              return v;
            })
            .join(','),
        )
        .join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users-contacts.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [rows]);

  /**
   * Delete a user account (admin only)
   */
  const deleteUser = async (id: string) => {
    setMsg('');
    if (!confirm('Delete this auth user? This cannot be undone.')) return;
    
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    
    if (!res.ok) { 
      setMsg('Failed to delete user'); 
      return; 
    }
    
    // Remove from local state
    setRows(rows.filter(r => r.id !== id));
    // Remove any pending changes for this user
    setPendingChanges(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setMsg('User deleted successfully');
  };

  return (
    <div className="card">
      <div className="card-body">
        {msg && (
          <div className="mb-3 p-3 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" role="status" aria-live="polite">
            <p className="text-sm">{msg}</p>
          </div>
        )}
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={exportCsv}
            className="btn-outline"
            disabled={!rows.length || exporting}
            aria-label="Download user contacts as CSV"
          >
            {exporting ? 'Preparing CSV…' : 'Download contacts (CSV)'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(u => {
            const hasPendingChange = pendingChanges[u.id] !== undefined;
            const currentRole = pendingChanges[u.id] || u.role;
            const isSaving = saving[u.id] || false;

            return (
              <article key={u.id} className="border border-[hsl(var(--border))] rounded-xl p-4 bg-[hsl(var(--card))] shadow-sm">
                {/* User Info */}
                <div className="mb-3">
                  <h3 className="font-semibold text-base">{u.email || u.id}</h3>
                  {u.full_name && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Name: {u.full_name}</p>
                  )}
                  {u.phone && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Phone: {u.phone}</p>
                  )}
                  {u.created_at && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Role Selection */}
                <div className="mb-3">
                  <label htmlFor={`role-select-${u.id}`} className="block text-sm font-medium mb-1">
                    Role
                  </label>
                  <select 
                    id={`role-select-${u.id}`}
                    value={currentRole} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)} 
                    className="select w-full"
                    disabled={isSaving}
                    aria-label={`Select role for ${u.email || u.id}`}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {hasPendingChange && (
                    <button 
                      onClick={() => saveRoleChange(u.id)} 
                      className="btn-primary flex-1"
                      disabled={isSaving}
                      aria-label={`Save role change for ${u.email || u.id}`}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                  <button 
                    onClick={() => deleteUser(u.id)} 
                    className={`btn-destructive ${hasPendingChange ? '' : 'flex-1'}`}
                    disabled={isSaving}
                    aria-label={`Delete user ${u.email || u.id}`}
                  >
                    Delete
                  </button>
                </div>

                {/* Pending Change Indicator */}
                {hasPendingChange && (
                  <p className="text-xs text-amber-600 mt-2" role="status">
                    ⚠ Unsaved changes
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
