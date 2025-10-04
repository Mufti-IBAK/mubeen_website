import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Secure admin update for programs using service role, after verifying requester is admin
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const programId = Number(id);
    if (!programId || Number.isNaN(programId)) {
      return NextResponse.json({ ok: false, error: "Invalid program id" }, { status: 400 });
    }

    // Verify requester is an authenticated admin via SSR client (anon key + cookies)
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
        },
      }
    );
    const { data: userRes } = await supabaseSSR.auth.getUser();
    const user = userRes.user;
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseSSR.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Use service role to bypass RLS safely after admin verification
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ ok: false, error: "Service role key not configured" }, { status: 500 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const body = await req.json();

    // Only accept known editable columns
    const patch: Record<string, unknown> = {};
    const allowed = [
      "title","slug","description","image_url","duration","tags","is_flagship",
      "overview","prerequisites","level","language","outcomes",
      "instructors","faqs","schedule","start_date","enrollment_deadline",
    ];
    for (const k of allowed) if (k in body) patch[k] = body[k];

    const { error } = await supabaseAdmin.from("programs").update(patch).eq("id", programId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

