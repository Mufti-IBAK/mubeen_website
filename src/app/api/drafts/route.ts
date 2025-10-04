import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const saveDraftSchema = z.object({
  program_id: z.string().uuid(),
  registration_type: z.enum(['individual', 'family_head', 'family_member']),
  form_data: z.record(z.string(), z.any()),
  family_size: z.number().optional(),
});

const finalizeDraftSchema = z.object({
  draft_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Gracefully handle unauthenticated clients to avoid dashboard crashes
      return NextResponse.json({ drafts: [] });
    }

    // Get all draft registrations for the current user via materialized view/user-defined view
    const { data: drafts, error } = await supabase
      .from('user_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('last_edited_at', { ascending: false });

    if (error) {
      console.error('Error fetching drafts:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    // If the view already returns the expected structure, forward as-is; otherwise coerce minimal shape
    const transformed = (drafts || []).map((d: any) => ({
      id: d.id,
      program_id: d.program_id,
      program_title: d.program_title ?? 'Program Registration',
      program_image: d.program_image ?? '',
      registration_type: d.registration_type ?? 'individual',
      draft_data: d.draft_data ?? d.form_data ?? {},
      family_size: d.family_size ?? null,
      last_edited_at: d.last_edited_at ?? d.updated_at ?? new Date().toISOString(),
      user_name: d.user_name ?? '',
      user_email: d.user_email ?? user.email ?? ''
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { program_id, registration_type, form_data, family_size } = saveDraftSchema.parse(body);

    // Check if draft already exists for this program and user
    const { data: existingDraft } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('program_id', program_id)
      .eq('registration_type', registration_type)
      .eq('is_draft', true)
      .single();

    let result;
    
    if (existingDraft) {
      // Update existing draft
      const { data, error } = await supabase
        .from('enrollments')
        .update({
          draft_data: form_data,
          family_size: family_size || null,
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
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          program_id,
          registration_type,
          draft_data: form_data,
          family_size: family_size || null,
          is_draft: true,
          status: 'pending', // enrollments use 'pending' not 'draft'
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { draft_id } = finalizeDraftSchema.parse(body);

    // Use the database function to finalize the draft
    const { data, error } = await supabase.rpc('finalize_draft_registration', {
      draft_id: draft_id
    });

    if (error) {
      console.error('Error finalizing draft:', error);
      return NextResponse.json({ error: 'Failed to finalize registration' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ 
      registration_id: data,
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('id');

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    // Delete the draft (only if user owns it)
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', draftId)
      .eq('user_id', user.id)
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
