/**
 * POST /api/radar/agent/ingest   (Authorization: Bearer <radar token>)
 * body: { handle, followers?, posts: AgentPost[] }   one creator per call
 *    or { done: true, status: string }               end of a run
 *
 * Merges the helper's results into radar_posts without losing transcripts
 * or analysis, and keeps the agent status the app shows up to date.
 */
import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/radar/agent';
import { hashtagsFrom, mergePost, normalizeHandle } from '@/lib/radar/normalize';
import type { RadarCreator, RadarPost } from '@/lib/radar/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type AgentPost = {
  shortcode?: string; caption?: string; postedAt?: string; durationSec?: number; isVideo?: boolean;
  views?: number | null; likes?: number | null; comments?: number | null; thumbnailUrl?: string; mediaUrl?: string;
};

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);
const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

export async function POST(req: Request) {
  const auth = await authenticateAgent(req);
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const { db, agent } = auth;
  const now = new Date().toISOString();

  let body: { handle?: string; followers?: number; posts?: AgentPost[]; done?: boolean; status?: string; started?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.started) {
    // clear the request so the helper doesn't start the same pull twice
    await db.from('radar_agents').update({ pull_requested_at: null, pull_handles: null, last_status: 'running', last_seen_at: now }).eq('user_id', agent.user_id);
    return NextResponse.json({ ok: true });
  }
  if (body.done) {
    await db.from('radar_agents').update({ last_run_at: now, last_seen_at: now, last_status: String(body.status ?? 'done').slice(0, 300) }).eq('user_id', agent.user_id);
    return NextResponse.json({ ok: true });
  }

  const handle = normalizeHandle(String(body.handle ?? ''));
  if (!handle || !Array.isArray(body.posts)) return NextResponse.json({ error: 'handle and posts required' }, { status: 400 });

  const incoming: RadarPost[] = body.posts.slice(0, 100).flatMap(p => {
    const shortcode = s(p.shortcode);
    if (!shortcode || !/^[\w-]+$/.test(shortcode)) return [];
    const caption = s(p.caption) ?? '';
    const views = n(p.views), likes = n(p.likes), comments = n(p.comments);
    return [{
      id: `ig:${shortcode}`, shortcode, url: `https://www.instagram.com/reel/${shortcode}/`,
      handle, source: 'tracked' as const, caption, hashtags: hashtagsFrom(caption),
      postedAt: s(p.postedAt), durationSec: n(p.durationSec), isVideo: p.isVideo !== false,
      views, likes, comments, thumbnailUrl: s(p.thumbnailUrl), mediaUrl: s(p.mediaUrl),
      firstSeenAt: now, updatedAt: now, history: [{ at: now, views, likes, comments }],
    }];
  });

  if (incoming.length) {
    const { data: existingRows } = await db.from('radar_posts').select('payload')
      .eq('user_id', agent.user_id).in('id', incoming.map(p => p.id));
    const existing = new Map((existingRows ?? []).map(r => [(r.payload as RadarPost).id, r.payload as RadarPost]));
    const merged = incoming.map(p => mergePost(existing.get(p.id), p));
    const { error } = await db.from('radar_posts').upsert(merged.map(p => ({
      id: p.id, user_id: agent.user_id, handle: p.handle, source: p.source,
      posted_at: p.postedAt ?? null, updated_at: p.updatedAt, payload: p,
    })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // stamp the creator as freshly pulled
  const { data: c } = await db.from('radar_creators').select('payload').eq('user_id', agent.user_id).eq('id', `ig:${handle}`).maybeSingle();
  if (c) {
    const creator = { ...(c.payload as RadarCreator), lastFetchedAt: now, followers: n(body.followers) };
    await db.from('radar_creators').update({ payload: creator }).eq('user_id', agent.user_id).eq('id', `ig:${handle}`);
  }
  await db.from('radar_agents').update({ last_seen_at: now, last_status: `running · @${handle} done` }).eq('user_id', agent.user_id);

  return NextResponse.json({ ok: true, saved: incoming.length });
}
