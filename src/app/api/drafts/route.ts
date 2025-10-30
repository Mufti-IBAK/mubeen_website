import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const saveDraftSchema = z.object({
  program_id: z.union([z.number(), z.string()]),
  registration_type: z.enum(['individual', 'family_head', 'family_member']),
  form_data: z.record(z.string(), z.any()),
  family_size: z.number().optional(),
  plan_id: z.number().optional(),
});

const finalizeDraftSchema = z.object({
  draft_id: z.union([z.number(), z.string()]),
});

function getBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const p = h.split(' ');
  return p.length === 2 && /^bearer$/i.test(p[0]) ? p[1] : null;
}

function isMissingTable(err: any) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toUpperCase();
  return code === 'PGRST205' || msg.includes("could not find the table 'public.registration_drafts'");
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const bearer = getBearer(request);

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options)); } catch {} },
      },
    });

    let user = null as null | { id: string };
    if (bearer) {
      const tmp = createClient(url, anon);
      const u = await tmp.auth.getUser(bearer);
      user = u.data.user as any;
    } else {
      const u = await supabase.auth.getUser();
      user = u.data.user as any;
    }
    if (!user) {
      return NextResponse.json({ drafts: [] });
    }

    const userScoped = bearer ? createClient(url, anon, { global: { headers: { apikey: anon, Authorization: `Bearer ${bearer}` } } }) : supabase;

    const { data: drafts, error } = await userScoped
      .from('registration_drafts')
      .select('id, program_id, draft_data, family_size, plan_id, last_edited_at, registration_type, programs ( title, slug, image_url )')
      .eq('user_id', user.id)
      .order('last_edited_at', { ascending: false });

    if (error) {
      if (isMissingTable(error)) {
        // Gracefully degrade when drafts table is absent
        return NextResponse.json({ drafts: [] });
      }
      console.error('Error fetching drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    const transformed = (drafts || []).map((d: any) => ({
      id: d.id,
      program_id: d.program_id,
      program_slug: d.programs?.slug ?? null,
      program_title: d.programs?.title ?? 'Program Registration',
      program_image: d.programs?.image_url ?? '',
      registration_type: d.registration_type ?? 'individual',
      draft_data: d.draft_data ?? {},
      family_size: d.family_size ?? null,
      last_edited_at: d.last_edited_at ?? new Date().toISOString(),
      plan_id: d.plan_id ?? null,
      user_name: '',
      user_email: ''
    }));

    return NextResponse.json({ drafts: transformed });
  } catch (error: any) {
    if (isMissingTable(error)) {
      return NextResponse.json({ drafts: [] });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const bearer = getBearer(request);

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options)); } catch {} },
      },
    });

    let userId: string | null = null;
    if (bearer) {
      const tmp = createClient(url, anon);
      const u = await tmp.auth.getUser(bearer);
      userId = u.data.user?.id ?? null;
    } else {
      const u = await supabase.auth.getUser();
      userId = u.data.user?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userScoped = bearer ? createClient(url, anon, { global: { headers: { apikey: anon, Authorization: `Bearer ${bearer}` } } }) : supabase;

    const body = await request.json();
    const parsed = saveDraftSchema.parse(body);
    const programIdNum = Number(parsed.program_id);
    const { registration_type, form_data, family_size, plan_id } = parsed;

    const { data: existingDraft, error: selErr } = await userScoped
      .from('registration_drafts')
      .select('id')
      .eq('user_id', userId)
      .eq('program_id', programIdNum)
      .eq('registration_type', registration_type)
      .maybeSingle();

    if (selErr && isMissingTable(selErr)) {
      // Drafts feature disabled: acknowledge save without error
      return NextResponse.json({ draft: null, message: 'Drafts are disabled' });
    }

    let result;

    if (existingDraft) {
      const { data, error } = await userScoped
        .from('registration_drafts')
        .update({
          draft_data: form_data,
          family_size: family_size || null,
          plan_id: plan_id || null,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id)
        .select()
        .single();

      if (error) {
        if (isMissingTable(error)) return NextResponse.json({ draft: null, message: 'Drafts are disabled' });
        console.error('Error updating draft:', error);
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
      }
      result = data;
    } else {
      const { data, error } = await userScoped
        .from('registration_drafts')
        .insert({
          user_id: userId,
          program_id: programIdNum,
          registration_type,
          draft_data: form_data,
          family_size: family_size || null,
          plan_id: plan_id || null,
          last_edited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (isMissingTable(error)) return NextResponse.json({ draft: null, message: 'Drafts are disabled' });
        console.error('Error creating draft:', error);
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ draft: result, message: 'Draft saved successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    if (isMissingTable(error)) {
      return NextResponse.json({ draft: null, message: 'Drafts are disabled' });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Finalization via API is disabled to prevent creating enrollments without payment
  return NextResponse.json({ message: 'Finalize disabled. Complete payment to submit registration.' });
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const bearer = getBearer(request);

    const userScoped = bearer
      ? createClient(url, anon, { global: { headers: { apikey: anon, Authorization: `Bearer ${bearer}` } } })
      : createServerClient(url, anon, { cookies: { getAll() { return cookieStore.getAll(); }, setAll(cookiesToSet) { try { cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options)); } catch {} } } });

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('id');
    if (!draftId) return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });

    const { error } = await userScoped
      .from('registration_drafts')
      .delete()
      .eq('id', draftId);

    if (error) {
      if (isMissingTable(error)) return NextResponse.json({ message: 'Drafts are disabled' });
      console.error('Error deleting draft:', error);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error: any) {
    if (isMissingTable(error)) return NextResponse.json({ message: 'Drafts are disabled' });
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
