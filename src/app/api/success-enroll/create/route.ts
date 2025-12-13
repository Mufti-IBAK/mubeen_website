import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const p = h.split(' ');
  return p.length === 2 && /^bearer$/i.test(p[0]) ? p[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const body = await req.json().catch(() => ({}));
    const program_id = body?.program_id ? Number(body.program_id) : null;
    const skill_id = body?.skill_id ? Number(body.skill_id) : null;
    const type = body?.type === 'skill' ? 'skill' : 'program';
    const form_data = (body?.form_data ?? {}) as Record<string, unknown>;

    if ((!program_id && !skill_id) || (program_id && Number.isNaN(program_id)) || (skill_id && Number.isNaN(skill_id))) {
       return NextResponse.json({ error: 'Invalid program_id or skill_id' }, { status: 400 });
    }

    const bearer = getBearer(req);
    const cookieStore = await cookies();
    const s = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined as any } });

    let user: any = null;
    if (bearer) {
      const tmp = createClient(url, anon);
      const u = await tmp.auth.getUser(bearer);
      user = u.data.user || null;
    } else {
      const u = await s.auth.getUser();
      user = u.data.user || null;
    }

    const admin = createClient(url, service);

    // Attempt to enrich from profiles if available
    let profileFullName: string | null = null;
    let profileEmail: string | null = null;
    if (user?.id) {
      const { data: prof } = await admin.from('profiles').select('full_name,email,phone,whatsapp_number').eq('id', user.id).maybeSingle();
      profileFullName = (prof as any)?.full_name ?? null;
      profileEmail = (prof as any)?.email ?? null;

      // Update profile if phone/whatsapp is provided in form and missing/different in profile
      const formPhone = (form_data as any)?.phone || (form_data as any)?.phoneNumber || null;
      const formWhatsapp = (form_data as any)?.whatsapp || (form_data as any)?.whatsapp_number || null;
      
      const updates: any = {};
      if (formPhone && formPhone !== (prof as any)?.phone) updates.phone = formPhone;
      if (formWhatsapp && formWhatsapp !== (prof as any)?.whatsapp_number) updates.whatsapp_number = formWhatsapp;
      
      if (Object.keys(updates).length > 0) {
        await admin.from('profiles').update(updates).eq('id', user.id);
      }
    }

    const formEmail = (form_data as any)?.email || (form_data as any)?.user_email || null;
    const formName = (form_data as any)?.full_name || (form_data as any)?.user_name || (form_data as any)?.name || null;

    // New simplified model: no categories; capture registration meta inside form_data
    const registration_mode = 'solo';

    const payload: any = {
      user_id: user?.id ?? null,
      user_email: profileEmail || user?.email || formEmail || null,
      user_name: profileFullName || user?.user_metadata?.full_name || formName || null,
      type: type, // 'program' or 'skill'
      program_id: program_id || null,
      skill_id: skill_id || null,
      status: 'pending',
      form_data: {
        ...form_data,
        registration_mode,
        participant_count: 1,
      },
    };

    // Unified Pricing Check (pricing_plans)
    // We check for a matching entity_type and entity_id (and default 'individual'/'monthly' implied or explicit)
    // Since we simplified the schema to just ID/Type, we query directly.
    if ((type === 'program' && program_id) || (type === 'skill' && skill_id)) {
      const eid = (type === 'program' ? program_id : skill_id) as number;
      
      const { data: plan } = await admin
        .from('pricing_plans')
        .select('price, currency')
        .eq('entity_type', type)
        .eq('entity_id', eid)
        // .eq('subscription_type', 'monthly') // Default per migration, add if we support multiple
        .maybeSingle();

      if (plan) {
        const basePrice = Number((plan as any).price ?? 0);
        if (basePrice > 0) {
          payload.amount = basePrice;
          payload.currency = (plan as any).currency || 'NGN';
        }
      }
    }

    // Pay-later upsert behavior: reuse existing pending registration for same user and entity
    let existingId: number | null = null;
    if (payload.user_id) {
      let q = admin
        .from('success_enroll')
        .select('id')
        .eq('status', 'pending')
        .eq('user_id', payload.user_id)
        .eq('type', type);
      
      if (program_id) q = q.eq('program_id', program_id);
      if (skill_id) q = q.eq('skill_id', skill_id);
        
      const { data: ex } = await q.order('created_at', { ascending: false }).maybeSingle();
      existingId = (ex as any)?.id ?? null;
    }
    
    if (!existingId && payload.user_email) {
      let q = admin
        .from('success_enroll')
        .select('id')
        .eq('status', 'pending')
        .eq('user_email', payload.user_email)
        .eq('type', type);

      if (program_id) q = q.eq('program_id', program_id);
      if (skill_id) q = q.eq('skill_id', skill_id);

      const { data: ex2 } = await q.order('created_at', { ascending: false }).maybeSingle();
      existingId = (ex2 as any)?.id ?? null;
    }

    if (existingId) {
      const updatePayload: Record<string, unknown> = {
        form_data: payload.form_data,
        user_email: payload.user_email,
        user_name: payload.user_name,
      };
      if (typeof payload.amount !== 'undefined') {
        updatePayload.amount = payload.amount;
        updatePayload.currency = payload.currency;
      }
      const { error: updErr } = await admin
        .from('success_enroll')
        .update(updatePayload)
        .eq('id', existingId);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: existingId });
    }

    const { data, error } = await admin
      .from('success_enroll')
      .insert(payload)
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
