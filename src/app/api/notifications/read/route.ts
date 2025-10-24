import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const readNotificationSchema = z.object({
  notification_id: z.string().uuid(),
});

export async function POST(_request: NextRequest) {
  try {
    // Temporarily disabled in MVP — endpoint returns 410 Gone
    return NextResponse.json({ error: 'Notifications feature temporarily disabled' }, { status: 410 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
