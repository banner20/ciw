/**
 * Radar persistence — same pattern as lib/db.ts: browser Supabase client,
 * RLS-scoped rows, full object in `payload`.
 */
import { createClient } from '@/lib/supabase/client';
import type { RadarCreator, RadarPost } from './types';

function sb() { return createClient(); }

async function uid(): Promise<string | null> {
  const { data: { session } } = await sb().auth.getSession();
  return session?.user.id ?? null;
}

export async function fetchRadar(): Promise<{ creators: RadarCreator[]; posts: RadarPost[]; error?: string }> {
  const [c, p] = await Promise.all([
    sb().from('radar_creators').select('payload').order('added_at'),
    sb().from('radar_posts').select('payload').order('posted_at', { ascending: false }).limit(5000),
  ]);
  const error = c.error?.message ?? p.error?.message;
  if (error) console.error('[radar] fetch:', error);
  return {
    creators: (c.data ?? []).map((r: { payload: unknown }) => r.payload as RadarCreator),
    posts: (p.data ?? []).map((r: { payload: unknown }) => r.payload as RadarPost),
    error,
  };
}

export async function upsertCreators(creators: RadarCreator[]): Promise<string | undefined> {
  const userId = await uid(); if (!userId) return 'Not signed in';
  if (!creators.length) return;
  const { error } = await sb().from('radar_creators').upsert(
    creators.map(c => ({ id: c.id, user_id: userId, handle: c.handle, added_at: c.addedAt, payload: c })),
  );
  if (error) console.error('[radar] upsertCreators:', error);
  return error?.message;
}

export async function deleteCreator(id: string): Promise<void> {
  const { error } = await sb().from('radar_creators').delete().eq('id', id);
  if (error) console.error('[radar] deleteCreator:', error);
}

export async function upsertPosts(posts: RadarPost[]): Promise<string | undefined> {
  const userId = await uid(); if (!userId) return 'Not signed in';
  for (let i = 0; i < posts.length; i += 200) {
    const chunk = posts.slice(i, i + 200);
    const { error } = await sb().from('radar_posts').upsert(chunk.map(p => ({
      id: p.id, user_id: userId, handle: p.handle, source: p.source,
      posted_at: p.postedAt ?? null, updated_at: p.updatedAt, payload: p,
    })));
    if (error) { console.error('[radar] upsertPosts:', error); return error.message; }
  }
}

export async function deletePosts(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await sb().from('radar_posts').delete().in('id', ids);
  if (error) console.error('[radar] deletePosts:', error);
}

// ── computer helper (scraper running on the user's machine) ─────────────────

export interface RadarAgentStatus {
  last_seen_at: string | null;
  pull_requested_at: string | null;
  pull_handles: string[] | null;
  last_run_at: string | null;
  last_status: string | null;
}

export async function fetchAgent(): Promise<RadarAgentStatus | null> {
  const { data, error } = await sb().from('radar_agents')
    .select('last_seen_at, pull_requested_at, pull_handles, last_run_at, last_status').maybeSingle();
  if (error) console.error('[radar] fetchAgent:', error);
  return (data as RadarAgentStatus | null) ?? null;
}

/** Creates (or replaces) the helper token. Returns the plain token once; only its hash is stored. */
export async function createAgentToken(): Promise<{ token?: string; error?: string }> {
  const userId = await uid(); if (!userId) return { error: 'Not signed in' };
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = 'rdr_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const { error } = await sb().from('radar_agents').upsert({
    user_id: userId, token_hash: tokenHash, created_at: new Date().toISOString(),
    last_seen_at: null, pull_requested_at: null, pull_handles: null, last_status: null,
  });
  if (error) return { error: error.message };
  return { token };
}

export async function requestAgentPull(handles: string[] | null): Promise<string | undefined> {
  const userId = await uid(); if (!userId) return 'Not signed in';
  const { error } = await sb().from('radar_agents')
    .update({ pull_requested_at: new Date().toISOString(), pull_handles: handles, last_status: 'requested' })
    .eq('user_id', userId);
  return error?.message;
}
