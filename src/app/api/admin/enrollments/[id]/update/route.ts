import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Auth Check
    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    
    // Check for admin token
    const authHeader = req.headers.get("authorization");
    let token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) {
      const c = await cookies();
      token = c.get("sb-access-token")?.value;
    }
    
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const admin = createClient(url, service!);
    // Verify admin role
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { payment_status, status, tx_ref, transaction_id, form_data, ...rest } = body;

    // Filter updates to allowed fields only
    const updates: any = {};
    if (payment_status) updates.payment_status = payment_status;
    if (status) updates.status = status;
    if (tx_ref) updates.tx_ref = tx_ref;
    if (transaction_id) updates.transaction_id = transaction_id;
    if (form_data) updates.form_data = form_data;
    
    // Allow other fields if they exist in schema (future proofing for rich data)
    // We'll migrate the schema next, but for now this is safe as Supabase ignores unknown columns or errors if strict
    // Let's stick to known fields + dynamic 'metadata' if we had it. 
    // The user wants rich data: bankname, originatorname, etc. We will add these to schema shortly.
    // For now, let's update what we can.
    
    const { error } = await admin.from("enrollments").update(updates).eq("id", id);
    if (error) {
        console.error("DB Update Error:", error);
        throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Update failed:", e);
    return NextResponse.json({ error: e.message || "server_error", details: e }, { status: 500 });
  }
}
