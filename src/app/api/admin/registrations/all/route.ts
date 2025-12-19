import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

export async function GET(req: NextRequest) {
  try {
    const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anon = getEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.SUPABASE_ANON_KEY
    );
    const service =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!service) throw new Error("Missing service role key");

    // Admin auth check
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    let accessToken: string | undefined = undefined;
    if (authHeader && /^Bearer\s+/i.test(authHeader))
      accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      const c = await cookies();
      accessToken =
        c.get("sb-access-token")?.value ||
        c.get("sb:token")?.value ||
        undefined;
    }
    if (!accessToken)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!userRes.ok)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const user = await userRes.json();

    const profRes = await fetch(
      `${url}/rest/v1/profiles?id=eq.${user.id}&select=role`,
      {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
        cache: "no-store",
      }
    );
    if (!profRes.ok)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const prof = await profRes.json();
    const role = prof?.[0]?.role;
    if (!(role === "admin" || role === "super_admin"))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const admin = createClient(url, service);
    const { data: rows, error } = await admin
      .from("enrollments")
      .select(
        "id,user_id,user_name,user_email,created_at,form_data,status,amount"
      )
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const allRows = rows || [];

    type Group = {
      user_id: string | null;
      user_name: string;
      user_email: string;
      count: number;
      latest: string;
      status: string;
    };
    const groups = new Map<string, Group>();
    const aliases = new Map<string, string>(); // map email-key -> id-key

    const norm = (s: string | null | undefined) =>
      (s || "").trim().toLowerCase();

    const getCanonicalKey = (
      idKey: string | null,
      emailKey: string | null
    ): string => {
      if (idKey) return idKey;
      if (emailKey && aliases.has(emailKey)) return aliases.get(emailKey)!;
      return emailKey || "unknown:null";
    };

    for (const r of allRows) {
      const emailFromRow = r.user_email || null;
      const emailFromForm = (() => {
        try {
          return (r as any).form_data?.email || null;
        } catch {
          return null;
        }
      })();
      const emailNorm = norm(emailFromRow || emailFromForm);
      const idKey = r.user_id ? `id:${r.user_id}` : null;
      const emailKey = emailNorm ? `email:${emailNorm}` : null;

      if (idKey && emailKey) {
        const existingEmailCanon = aliases.get(emailKey) || emailKey;
        if (groups.has(existingEmailCanon) && existingEmailCanon !== idKey) {
          const eg = groups.get(existingEmailCanon)!;
          const g = groups.get(idKey) || {
            user_id: r.user_id,
            user_name: eg.user_name,
            user_email: emailFromRow || eg.user_email,
            count: 0,
            latest: eg.latest,
            status: eg.status,
          };
          g.count += eg.count;
          g.latest =
            new Date(eg.latest) > new Date(g.latest) ? eg.latest : g.latest;
          // Paid status takes priority in the grouped view
          if (eg.status === "paid") g.status = "paid";
          groups.set(idKey, g);
          groups.delete(existingEmailCanon);
          aliases.set(emailKey, idKey);
        } else {
          aliases.set(emailKey, idKey);
        }
      }

      const canon = getCanonicalKey(idKey, emailKey);
      const exists = groups.get(canon);
      const latest = exists
        ? new Date(r.created_at) > new Date(exists.latest)
          ? r.created_at
          : exists.latest
        : r.created_at;
      const displayName =
        r.user_name ||
        (r as any).form_data?.full_name ||
        exists?.user_name ||
        "Unknown";
      const displayEmail =
        emailFromRow ||
        (r as any).form_data?.email ||
        exists?.user_email ||
        "unknown";

      // If any of the user's enrollments is 'paid', show 'paid' in the grouped list
      let status = r.status || "pending";
      if (exists?.status === "paid") status = "paid";

      groups.set(canon, {
        user_id: r.user_id ?? exists?.user_id ?? null,
        user_name: displayName,
        user_email: displayEmail,
        count: (exists?.count || 0) + 1,
        latest,
        status,
      });
    }

    const items = Array.from(groups.values());

    // Simple pagination after grouping
    const total = items.length;
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const start = (page - 1) * limit;
    const end = start + limit;

    // Sort by latest registration date descending before slicing
    items.sort(
      (a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime()
    );

    const paginatedItems = items.slice(start, end);

    return NextResponse.json({
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    console.error("admin registrations all error", e);
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
