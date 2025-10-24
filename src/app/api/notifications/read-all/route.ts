import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // Temporarily disabled in MVP — endpoint returns 410 Gone
    return NextResponse.json({ error: 'Notifications feature temporarily disabled' }, { status: 410 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
