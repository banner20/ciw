import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Radar routes spend paid credits (Apify, Groq), so they must never be
 * callable anonymously. Returns a 401 response if there's no session.
 */
export async function requireUser(): Promise<NextResponse | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return null;
  } catch { /* fall through */ }
  return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
