import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Returns true if Supabase env vars are configured */
export function hasSupabase(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Lazy singleton — only instantiated when first called
let _client: SupabaseClient | null = null;

/** Returns the Supabase browser client. Call hasSupabase() first. */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !key) throw new Error('Supabase env vars not configured');
    _client = createClient(url, key);
  }
  return _client;
}
