import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check Admin Session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entity_type, entity_id, price, currency, subscription_type } = body;

    if (!entity_type || !entity_id || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert into pricing_plans
    // We match on entity_type, entity_id, currency, subscription_type
    // to update existing price or insert new one.
    const { error } = await supabase.from("pricing_plans").upsert(
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
