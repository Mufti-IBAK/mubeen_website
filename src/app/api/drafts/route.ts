import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const saveDraftSchema = z.object({
  program_id: z.union([z.number(), z.string()]), // numeric id (string acceptable)
  registration_type: z.enum(['individual', 'family_head', 'family_member']),
  form_data: z.record(z.string(), z.any()),
  family_size: z.number().optional(),
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

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const bearer = getBearer(request);

    let supabase = createServerClient(url, anon, {
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

    // Get all draft registrations for the current user (join programs for title/slug)
    // Use a user-scoped client for RLS queries when bearer is present
    const userScoped = bearer ? createClient(url, anon, { global: { headers: { apikey: anon, Authorization: `Bearer ${bearer}` } } }) : supabase;

    const { data: drafts, error } = await userScoped
      .from('enrollments')
      .select('id, program_id, draft_data, family_size, last_edited_at, registration_type, programs ( title, slug, image_url )')
      .eq('user_id', user.id)
      .eq('is_draft', true)
      .order('last_edited_at', { ascending: false });

    if (error) {
      console.error('Error fetching drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    // If the view already returns the expected structure, forward as-is; otherwise coerce minimal shape
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
      user_name: '',
      user_email: ''
    }));

    return NextResponse.json({ drafts: transformed });
  } catch (error) {
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

    let supabase = createServerClient(url, anon, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options)); } catch {} },
      },
    });

    // Resolve user (prefer bearer)
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
    const { registration_type, form_data, family_size } = parsed;

    // Check if draft already exists for this program and user
    const { data: existingDraft } = await userScoped
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('program_id', programIdNum)
      .eq('registration_type', registration_type)
      .eq('is_draft', true)
      .single();

    let result;
    
    if (existingDraft) {
      // Update existing draft
      const { data, error } = await userScoped
        .from('enrollments')
        .update({
          draft_data: form_data,
          family_size: family_size || null,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating draft:', error);
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
      }
      result = data;
    } else {
      // Create new draft
      const { data, error } = await userScoped
        .from('enrollments')
        .insert({
          user_id: userId,
          program_id: programIdNum,
          registration_type,
          draft_data: form_data,
          family_size: family_size || null,
          is_draft: true,
          status: 'pending',
          last_edited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating draft:', error);
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ 
      draft: result,
      message: 'Draft saved successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const bearer = getBearer(request);

    let userScoped = null as any;
    if (bearer) {
      userScoped = createClient(url, anon, { global: { headers: { apikey: anon, Authorization: `Bearer ${bearer}` } } });
    } else {
      userScoped = createServerClient(url, anon, { cookies: { getAll() { return cookieStore.getAll(); }, setAll(cookiesToSet) { try { cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options)); } catch {} } } });
    }

    const body = await request.json();
    const parsed = finalizeDraftSchema.parse(body);
    const draftId = Number(parsed.draft_id);

    // Finalize the draft in-place: move draft_data -> form_data, is_draft -> false
    const { data, error } = await userScoped
      .from('enrollments')
      .update({
        is_draft: false,
        status: 'submitted',
        form_data: (await (async () => {
          const { data: row } = await userScoped.from('enrollments').select('draft_data').eq('id', draftId).single();
          return row?.draft_data ?? {};
        })()),
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', draftId)
.select('id')
      .single();

    if (error) {
      console.error('Error finalizing draft:', error);
      return NextResponse.json({ error: 'Failed to finalize registration' }, { status: 500 });
    }

    if (!data) return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });

    return NextResponse.json({ 
      registration_id: data.id,
      message: 'Registration submitted successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    // Delete the draft; RLS will ensure ownership
    const { error } = await userScoped
      .from('enrollments')
      .delete()
      .eq('id', draftId)
      .eq('is_draft', true);

    if (error) {
      console.error('Error deleting draft:', error);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
