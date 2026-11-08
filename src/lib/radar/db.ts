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
