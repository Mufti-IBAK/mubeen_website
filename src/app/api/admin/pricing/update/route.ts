import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function env(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function readAccessToken(req: NextRequest) {
  const header =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (header && header.toLowerCase().startsWith("bearer "))
    return header.slice(7);
  const store = await cookies();
  return store.get("sb-access-token")?.value || store.get("sb:token")?.value;
}

async function isAdminFromRequest(req: NextRequest) {
  const accessToken = await readAccessToken(req);
  if (!accessToken) return false;
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anon = env(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.SUPABASE_ANON_KEY
  );
  const ures = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!ures.ok) return false;
  const user = await ures.json();
  // try RLS first
  const profR = await fetch(
    `${url}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    {
      headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (profR.ok) {
    const prof = await profR.json();
    if (prof?.[0]?.role === "admin" || prof?.[0]?.role === "super_admin")
      return true;
  }
  // fallback to service role check if needed or just rely on RLS if configured
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (service) {
    const profS = await fetch(
      `${url}/rest/v1/profiles?id=eq.${user.id}&select=role`,
      {
        headers: {
          apikey: service as string,
          Authorization: `Bearer ${service}`,
        },
        cache: "no-store",
      }
    );
    if (profS.ok) {
      const prof = await profS.json();
      if (prof?.[0]?.role === "admin" || prof?.[0]?.role === "super_admin")
        return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await isAdminFromRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey)
      return NextResponse.json(
        { ok: false, error: "Service role key not configured" },
        { status: 500 }
      );
    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      serviceKey as string
    );

    const body = await req.json();
    const { entity_type, entity_id, price, currency, subscription_type } = body;

    if (!entity_type || !entity_id || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert into pricing_plans
    const { error } = await supabaseAdmin.from("pricing_plans").upsert(
      {
        entity_type,
        entity_id,
        price,
        currency: currency || "NGN",
        subscription_type: subscription_type || "monthly",
      },
      {
        onConflict: "entity_type, entity_id, subscription_type, currency",
      }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Pricing Update Error:", error);
    return NextResponse.json(
      { error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
