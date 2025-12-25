"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  FaArrowLeft,
  FaTrash,
  FaEdit,
  FaLink,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import Link from "next/link";

type Row = {
  id: number;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  type: string;
  program_id: number | null;
  program_title: string | null;
  amount: number | null;
  currency: string | null;
  transaction_id: string | null;
  tx_ref: string | null;
  created_at: string;
  status: string;
  payment_status: string;
  form_data: any;
  classroom_link?: string | null;
  payment_meta?: {
    bank_name?: string;
    originator_name?: string;
    ip_address?: string;
    payment_type?: string;
    flw_ref?: string;
    narration?: string;
    [key: string]: any;
  } | null;
};

export default function UserRegistryDetailClient({
  idParam,
}: {
  idParam: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<null | Row>(null);
  const [editor, setEditor] = useState<string>("");
  const [linkEditing, setLinkEditing] = useState<null | Row>(null);
  const [linkInput, setLinkInput] = useState<string>("");
  const [auditData, setAuditData] = useState<any>(null);
  const [auditing, setAuditing] = useState(false);
  const [manualOverride, setManualOverride] = useState<Row | null>(null);
  const [manualRef, setManualRef] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const decoded = decodeURIComponent(idParam);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const params = new URLSearchParams(
        /^[0-9a-fA-F-]{36}$/.test(decoded)
          ? { user_id: decoded }
          : { user_email: decoded }
      );

      const res = await fetch(
        `/api/admin/enrollments/by-user?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setRows((json.items || []) as Row[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [idParam]);

  const remove = async (id: number) => {
    if (!confirm("Delete this record? This action cannot be undone.")) return;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      
      const res = await fetch(`/api/admin/enrollments/${id}/delete`, { 
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      const json = await res.json();
      
      if (!res.ok && !json.ok) {
        throw new Error(json.error || 'Delete failed');
      }
      
      // Delete succeeded
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ 
        title: "Deleted", 
        description: "Enrollment record deleted successfully" 
      });
      
      // Refresh the list
      await load();
    } catch (e: any) {
      console.error('Delete error:', e);
      toast({ 
        title: "Error", 
        description: e.message || "Failed to delete record", 
        variant: "destructive" 
      });
    }
  };

  const saveEditor = async () => {
    if (!editing) return;
    try {
      const parsed = editor.trim() ? JSON.parse(editor) : {};
      const res = await fetch(`/api/admin/enrollments/${editing.id}/update`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ form_data: parsed }),
      });
      if (!res.ok) throw new Error("Update failed");
      setRows((prev) =>
        prev.map((r) => (r.id === editing.id ? { ...r, form_data: parsed } : r))
      );
      setEditing(null);
      toast({ title: "Saved", description: "Enrollment updated successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const saveLink = async () => {
    if (!linkEditing) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/admin/class-links/upsert", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          enrollment_id: linkEditing.id,
          classroom_link: linkInput.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save link");
      setRows((prev) =>
        prev.map((r) =>
          r.id === linkEditing.id
            ? { ...r, classroom_link: linkInput.trim() }
            : r
        )
      );
      setLinkEditing(null);
      toast({ title: "Saved", description: "Classroom link updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const verifyPayment = async (r: Row) => {
    const isRecovery = !r.tx_ref;
    toast({
      title: isRecovery ? "Auto-Recovering..." : "Verifying...",
      description: isRecovery
        ? "Searching Flutterwave for lost transaction..."
        : "Checking Flutterwave status...",
    });
    try {
      const param = r.tx_ref ? `tx_ref=${r.tx_ref}` : `id=${r.id}`;
      const res = await fetch(`/api/payments/verify?${param}`);
      const json = await res.json();
      if (json.ok) {
        toast({
          title: "Success!",
          description: json.message || "Payment verified. Refreshing...",
        });
        // Refresh the data
        await load();
      } else {
        toast({
          title: "Verification Failed",
          description:
            json.details ||
            json.error ||
            "No successful payment found for this ref.",
          variant: "destructive",
        });
        // Show debug info if available
        if (json.debug) {
          console.log("Verification debug info:", json.debug);
        }
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Connection failed.",
        variant: "destructive",
      });
    }
  };

  const fetchAudit = async (r: Row) => {
    setAuditing(true);
    setAuditData(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const params = new URLSearchParams(
        r.transaction_id ? { flw_id: r.transaction_id } : { tx_ref: r.tx_ref! }
      );
      const res = await fetch(
        `/api/admin/payments/audit?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      const json = await res.json();
      setAuditData(json);
    } catch (e: any) {
      toast({
        title: "Audit Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setAuditing(false);
    }
  };

  const performManualOverride = async () => {
    if (!manualOverride) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch(
        `/api/admin/enrollments/${manualOverride.id}/update`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            payment_status: "paid",
            status: "active",
            tx_ref:
              manualRef || manualOverride.tx_ref || `MANUAL-${Date.now()}`,
            transaction_id:
              manualOverride.transaction_id || `MANUAL-ADMIN-${Date.now()}`,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        const errorMsg = json.details?.message || json.error || "Update failed";
        throw new Error(errorMsg);
      }

      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          r.id === manualOverride.id
            ? {
                ...r,
                payment_status: "paid",
                status: "active",
                tx_ref: manualRef || r.tx_ref || `MANUAL-${Date.now()}`,
              }
            : r
        )
      );

      setManualOverride(null);
      toast({
        title: "Success",
        description: "Enrollment marked as PAID manually.",
      });

      // Refresh data from server
      await load();
    } catch (e: any) {
      console.error("Manual override error:", e);
      toast({
        title: "Error",
        description: e.message || "Override failed. Check console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/enrollments" className="btn-outline !p-2">
          <FaArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold">Management Details</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            {rows[0]?.user_name || rows[0]?.user_email || "User"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="card-body">No registrations found.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rows.map((r) => (
            <div
              key={r.id}
              className="card bg-[hsl(var(--card))] border-[hsl(var(--border))] shadow-sm overflow-hidden"
            >
              <div className="flex items-stretch flex-col md:flex-row">
                <div
                  className={`w-2 shrink-0 ${
                    r.payment_status === "paid"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                />
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                          #{r.id}
                        </span>
                        <h3 className="text-xl font-bold">{r.program_title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`badge ${
                            r.payment_status === "paid"
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {itemBadge(r)}
                        </span>
                        <span className="badge badge-outline">{r.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {r.currency || "NGN"}{" "}
                        {Number(r.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[hsl(var(--muted))] p-4 rounded-lg">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Transaction Data
                      </p>
                      <div className="text-sm">
                        <p>
                          <span className="font-medium">Ref:</span>{" "}
                          {r.tx_ref || "None"}
                        </p>
                        <p>
                          <span className="font-medium">FLW ID:</span>{" "}
                          {r.transaction_id || "Not logged"}
                        </p>
                        {r.payment_status?.toLowerCase() !== "paid" && (
                          <div className="flex flex-col gap-2 items-start">
                            <button
                              onClick={() => verifyPayment(r)}
                              className="mt-2 text-xs text-sky-600 font-bold flex items-center gap-1 hover:underline"
                            >
                              <FaSync className="animate-in" />
                              {r.tx_ref
                                ? "Strategic Verify"
                                : "Auto-Recover Payment (Search by Email)"}
                            </button>
                            <button
                              onClick={() => {
                                setManualOverride(r);
                                setManualRef("");
                              }}
                              className="mt-1 text-xs text-amber-600 font-bold flex items-center gap-1 hover:underline opacity-80"
                            >
                              <FaExclamationTriangle /> Manual Override
                            </button>
                          </div>
                        )}
                        {r.payment_status?.toLowerCase() === "paid" && (
                          <div className="mt-2 text-xs border-l-2 border-emerald-500 pl-2">
                            <p className="font-bold text-emerald-700">
                              Financial Intelligence:
                            </p>
                            {r.payment_meta ? (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[hsl(var(--muted-foreground))] mt-1">
                                <div>
                                  <span className="font-semibold">Bank:</span>{" "}
                                  {r.payment_meta.bank_name || "N/A"}
                                </div>
                                <div>
                                  <span className="font-semibold">Src:</span>{" "}
                                  {r.payment_meta.originator_name || "N/A"}
                                </div>
                                <div>
                                  <span className="font-semibold">Type:</span>{" "}
                                  {r.payment_meta.payment_type || "Card"}
                                </div>
                                <div>
                                  <span className="font-semibold">IP:</span>{" "}
                                  {r.payment_meta.ip_address || "N/A"}
                                </div>
                              </div>
                            ) : (
                              <p className="italic text-[hsl(var(--muted-foreground))]">
                                No rich metadata captured.
                              </p>
                            )}
                            <button
                              onClick={() => fetchAudit(r)}
                              className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                            >
                              View Raw Audit Log
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Classroom Access
                      </p>
                      <div className="flex items-center gap-2">
                        {r.classroom_link ? (
                          <a
                            href={r.classroom_link}
                            target="_blank"
                            className="text-sm text-emerald-600 flex items-center gap-1 hover:underline"
                          >
                            <FaExternalLinkAlt size={10} /> Link Active
                          </a>
                        ) : (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            No link assigned
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setLinkEditing(r);
                            setLinkInput(r.classroom_link || "");
                          }}
                          className="text-xs btn-outline !py-0.5 !px-2"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setEditing(r);
                        setEditor(JSON.stringify(r.form_data || {}, null, 2));
                      }}
                      className="btn-outline flex items-center gap-2"
                    >
                      <FaEdit /> Form Details
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="btn-destructive flex items-center gap-2"
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
            onClick={() => setEditing(null)}
          />
          <div className="relative z-10 w-full max-w-2xl card bg-[hsl(var(--card))]">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-4">Edit Form Data (JSON)</h2>
              <textarea
                className="textarea w-full h-80 font-mono text-sm"
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setEditing(null)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button onClick={saveEditor} className="btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {/* (existing link modal code...) */}

      {/* Audit Modal */}
      {(auditing || auditData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
            onClick={() => {
              setAuditData(null);
              setAuditing(false);
            }}
          />
          <div className="relative z-10 w-full max-w-2xl card bg-[hsl(var(--card))] border-emerald-500 border-2 max-h-[90vh] flex flex-col">
            <div className="card-body overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-emerald-800">
                  Flutterwave Strategic Audit
                </h2>
                <button
                  onClick={() => setAuditData(null)}
                  className="btn-outline !py-1"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {auditing ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                  </div>
                ) : (
                  <>
                    <div
                      className={`p-4 rounded-lg flex items-center gap-3 ${
                        auditData?.status === "success"
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-rose-50 border border-rose-200"
                      }`}
                    >
                      {auditData?.status === "success" ? (
                        <FaCheckCircle className="text-emerald-600 text-xl" />
                      ) : (
                        <FaExclamationTriangle className="text-rose-600 text-xl" />
                      )}
                      <div>
                        <p className="font-bold text-lg leading-none">
                          {auditData?.message || "Report Fetched"}
                        </p>
                        <p className="text-xs mt-1 text-[hsl(var(--muted-foreground))]">
                          Report time: {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      <p className="text-slate-500 mb-2">
                        // Raw Flutterwave API Response
                      </p>
                      <pre>{JSON.stringify(auditData, null, 2)}</pre>
                    </div>

                    <div className="p-4 bg-[hsl(var(--muted))] rounded-lg text-sm">
                      <h4 className="font-bold mb-2">Technical Insight:</h4>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        This data comes directly from Flutterwave servers. If
                        the status above shows{" "}
                        <strong>&quot;success&quot;</strong> but the student is
                        still marked as pending, the &quot;Force Verify&quot;
                        button will resolve it by syncing this report to your
                        local database.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {manualOverride && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
            onClick={() => setManualOverride(null)}
          />
          <div className="relative z-10 w-full max-w-md card bg-[hsl(var(--card))] border-amber-500 border-2">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-2 text-amber-700">
                Manual Payment Override
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                This will forcibly mark the enrollment as <strong>PAID</strong>{" "}
                and Active. Use this only if you have verified the payment
                externally.
              </p>

              <label className="block text-xs font-bold mb-1">
                Transaction Ref (Optional)
              </label>
              <input
                className="input w-full mb-4"
                placeholder="e.g. FLW-MOCK-123..."
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setManualOverride(null)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={performManualOverride}
                  className="btn-primary !bg-amber-600 !border-amber-600 hover:!bg-amber-700"
                >
                  Confirm Manual Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function itemBadge(r: Row) {
  if (r.status === "cancelled") return "Cancelled";
  if (r.payment_status?.toLowerCase() === "paid") return "Paid";
  return "Pending Payment";
}

function FaSync(props: any) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 512 512"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM352 80l64 64h-64V80zM256 432c-66.274 0-120-53.726-120-120s53.726-120 120-120 120 53.726 120 120-53.726 120-120 120zm0-192a72 72 0 1 0 72 72 72.08 72.08 0 0 0-72-72zm-24 104V280h16v32h32v16h-48z"></path>
    </svg>
  );
}
