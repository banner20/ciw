/**
 * POST /api/radar/fetch
 * body: { mode: 'profiles' | 'hashtags', targets: string[], limit?: number }
 *
 * Pulls recent posts through Apify (a hosted data provider), so our own
 * server never hits Instagram directly. Returns normalized RadarPosts;
 * the client merges and saves them.
 *
 * Env:
 *   APIFY_TOKEN            required
 *   APIFY_PROFILE_ACTOR    default "apify/instagram-reel-scraper"
 *   APIFY_HASHTAG_ACTOR    default "apify/instagram-hashtag-scraper"
 */
import { NextResponse } from 'next/server';
import { fromApify, normalizeHandle } from '@/lib/radar/normalize';
import { errorResponse, requireUser } from '@/lib/radar/server';
import type { RadarPost } from '@/lib/radar/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const PROFILE_ACTOR = process.env.APIFY_PROFILE_ACTOR || 'apify/instagram-reel-scraper';
const HASHTAG_ACTOR = process.env.APIFY_HASHTAG_ACTOR || 'apify/instagram-hashtag-scraper';

async function runActor(actor: string, input: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN is not set. Add it in your Vercel/env settings.');
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actor.replace('/', '~')}/run-sync-get-dataset-items?timeout=280&clean=true`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(295_000),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apify ${actor} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function POST(req: Request) {
  const denied = await requireUser();
  if (denied) return denied;

  let body: { mode?: string; targets?: unknown; limit?: unknown };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON', 400); }

  const targets = (Array.isArray(body.targets) ? body.targets : [])
    .filter((t): t is string => typeof t === 'string' && !!t.trim())
    .slice(0, 25);
  if (!targets.length) return errorResponse('No targets given', 400);
  const limit = Math.min(Math.max(Number(body.limit) || 30, 1), 100);

  try {
    let posts: RadarPost[] = [];
    if (body.mode === 'hashtags') {
      const tags = targets.map(t => t.trim().replace(/^#/, '').toLowerCase());
      // one run per tag so we know which tag surfaced each post
      const results = await Promise.all(tags.map(async tag => {
        const items = await runActor(HASHTAG_ACTOR, { hashtags: [tag], resultsLimit: limit, resultsType: 'reels' });
        return items.map(i => fromApify(i, 'discovery', `#${tag}`));
      }));
      posts = results.flat().filter((p): p is RadarPost => !!p);
    } else {
      const handles = targets.map(normalizeHandle);
      const items = await runActor(PROFILE_ACTOR, {
        username: handles,
        directUrls: handles.map(h => `https://www.instagram.com/${h}/`),
        resultsType: 'posts',
        resultsLimit: limit,
      });
      posts = items.map(i => fromApify(i, 'tracked')).filter((p): p is RadarPost => !!p);
    }

    // de-dupe within this batch
    const unique = Array.from(new Map(posts.map(p => [p.id, p])).values());
    return NextResponse.json({ posts: unique, count: unique.length });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 502);
  }
}
