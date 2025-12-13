import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getBearer(req: NextRequest) {
  const h =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const p = h.split(" ");
  return p.length === 2 && /^bearer$/i.test(p[0]) ? p[1] : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillId = Number(id);
    if (!skillId || isNaN(skillId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Auth check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const bearer = getBearer(req);
    const cookieStore = await cookies();
    const s = createServerClient(url, anon, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => undefined as any,
      },
    });

    let user: any = null;
    if (bearer) {
      const tmp = createClient(url, anon);
      const u = await tmp.auth.getUser(bearer);
      user = u.data.user;
    } else {
      const u = await s.auth.getUser();
      user = u.data.user;
    }

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(url, service);
    // Verify admin
    const { data: prof } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (prof?.role !== "admin" && prof?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert plan
    // Check if exists
    const { data: existing } = await admin
      .from("skill_plans")
      .select("id")
      .eq("skill_id", skillId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("skill_plans")
        .update({
          price: body.price,
          currency: body.currency,
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("skill_plans").insert({
        skill_id: skillId,
        price: body.price,
        currency: body.currency,
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "Server Error" },
      { status: 500 }
    );
  }
}
