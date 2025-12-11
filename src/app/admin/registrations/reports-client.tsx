"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = { id: number; title: string; type: "program" | "skill" };
type EnrollmentRec = {
  id: number;
  user_email: string | null;
  status: string | null;
  amount_paid: number | null;
  created_at: string;
  user_profile: {
    full_name: string | null;
    phone: string | null;
    whatsapp_number: string | null;
    email: string | null;
  } | null;
};

export default function ReportsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string>(""); // format: "type-id" e.g. "program-12"
  const [loadingItems, setLoadingItems] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoadingItems(true);
      try {
        const { data: progs } = await supabase
          .from("programs")
          .select("id, title")
          .order("created_at", { ascending: false });
        const { data: skills } = await supabase
          .from("skills")
          .select("id, title")
          .order("created_at", { ascending: false });

        const combined: Item[] = [
          ...(progs || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            type: "program" as const,
          })),
          ...(skills || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            type: "skill" as const,
          })),
        ];
        setItems(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingItems(false);
      }
    };
    load();
  }, []);

  const fetchEnrollments = async () => {
    if (!selectedId) return [];
    const [type, idStr] = selectedId.split("-");
    const id = Number(idStr);

    // Call the comprehensive RPC function
    // We filter result set on the server-side via Supabase query builder
    const { data, error } = await supabase
      .rpc("get_course_enrollments_with_status_v1")
      .eq("item_type", type)
      .eq("item_id", id);

    console.log(
      `Fetched V1 enrollments for ${type} ${id}:`,
      data?.length,
      error
    );

    if (error) {
      console.error(error);
      throw new Error(error.message || "Failed to fetch data");
    }

    // Transform RPC result to EnrollmentRec format
    // RPC columns: item_type, item_id, item_title, user_id, full_name, email, phone, status, source_table
    return (data || []).map((row: any) => ({
      id: 0, // Not provided by RPC, not critical for report
      user_email: row.email,
      status: row.status, // Now reusing the real status field (paid/unpaid/etc)
      amount_paid: 0, // Not provided in RPC
      created_at: new Date().toISOString(), // Not provided in RPC
      user_profile: {
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        whatsapp_number: row.phone, // Assuming flattened phone is the best contact
      },
    })) as EnrollmentRec[];
  };

  const clean = (val: any) =>
    String(val || "")
      .replace(/[\r\n]+/g, " ")
      .trim();

  const handleExport = async (format: "csv" | "txt") => {
    if (!selectedId) return;
    setGenerating(true);
    setMsg("");
    try {
      const data = await fetchEnrollments();
      if (!data.length) {
        setMsg("No enrollments found for this selection.");
        return;
      }

      if (format === "csv") {
        const header = [
          "Full Name",
          "Email",
          "Phone",
          "WhatsApp",
          "Status",
          "Amount Paid",
          "Date",
        ];
        const rows = data.map((d) => [
          clean(d.user_profile?.full_name),
          clean(d.user_profile?.email || d.user_email),
          clean(d.user_profile?.phone),
          clean(d.user_profile?.whatsapp_number),
          clean(d.status),
          clean(d.amount_paid),
          new Date(d.created_at).toLocaleDateString(),
        ]);

        const csvContent = [header, ...rows]
          .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
          .join("\n");

        downloadFile(
          csvContent,
          `report-${selectedId}-${Date.now()}.csv`,
          "text/csv"
        );
      } else {
        const lines = data.map(
          (d) =>
            `Name: ${clean(d.user_profile?.full_name)}\n` +
            `Email: ${clean(d.user_profile?.email || d.user_email)}\n` +
            `Phone: ${clean(d.user_profile?.phone)}\n` +
            `WhatsApp: ${clean(d.user_profile?.whatsapp_number)}\n` +
            `Status: ${clean(d.status)} | Paid: ${clean(d.amount_paid)}\n` +
            `Date: ${new Date(d.created_at).toLocaleDateString()}\n` +
            `----------------------------------------`
        );
        downloadFile(
          lines.join("\n"),
          `report-${selectedId}-${Date.now()}.txt`,
          "text/plain"
        );
      }
      setMsg(`${data.length} records exported.`);
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card mt-6 border-t pt-6">
      <div className="card-body">
        <h2 className="text-xl font-bold mb-4">Export Course Data</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Select a program or skill to export its enrollment data.
        </p>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium mb-1">
              Select Program / Skill
            </label>
            <select
              className="select w-full"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingItems}
            >
              <option value="">-- Choose One --</option>
              <optgroup label="Programs">
                {items
                  .filter((i) => i.type === "program")
                  .map((i) => (
                    <option key={`program-${i.id}`} value={`program-${i.id}`}>
                      {i.title}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Skills">
                {items
                  .filter((i) => i.type === "skill")
                  .map((i) => (
                    <option key={`skill-${i.id}`} value={`skill-${i.id}`}>
                      {i.title}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={!selectedId || generating}
              className="btn-primary"
            >
              {generating ? "Exporting..." : "Export CSV"}
            </button>
            <button
              onClick={() => handleExport("txt")}
              disabled={!selectedId || generating}
              className="btn-outline"
            >
              Export TXT
            </button>
          </div>
        </div>

        {msg && (
          <p
            className={`mt-3 text-sm ${
              msg.startsWith("Error") ? "text-red-500" : "text-green-600"
            }`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
