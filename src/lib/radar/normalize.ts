/**
 * Turns raw data from different sources into RadarPost records.
 *
 * Supported inputs:
 *  - yt-dlp metadata (`--dump-json` lines, `--write-info-json` files, or arrays of them)
 *  - Apify Instagram scraper dataset items (profile, hashtag and reel scrapers)
 *
 * Every field is read defensively: scrapers rename fields over time.
 */
import type { RadarPost, RadarSource } from './types';

type Raw = Record<string, unknown>;

const num = (...vals: unknown[]): number | undefined => {
  for (const v of vals) {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
};

const str = (...vals: unknown[]): string | undefined => {
  for (const v of vals) if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
};

export function normalizeHandle(input: string): string {
  const s = input.trim().replace(/^@/, '');
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return (m ? m[1] : s).toLowerCase().replace(/\/+$/, '');
}

export function shortcodeFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/i)?.[1];
}

export function hashtagsFrom(caption: string): string[] {
  return Array.from(new Set((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(h => h.slice(1).toLowerCase())));
}

function toIso(v: unknown): string | undefined {
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  if (typeof v === 'string' && v) {
    if (/^\d{8}$/.test(v)) return new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00Z`).toISOString();
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

function base(shortcode: string, now: string): Pick<RadarPost, 'id' | 'shortcode' | 'url' | 'firstSeenAt' | 'updatedAt' | 'history'> {
  return {
    id: `ig:${shortcode}`,
    shortcode,
    url: `https://www.instagram.com/reel/${shortcode}/`,
    firstSeenAt: now,
    updatedAt: now,
    history: [],
  };
}

function withSnapshot(p: RadarPost): RadarPost {
  if (p.views == null && p.likes == null && p.comments == null) return p;
  return { ...p, history: [{ at: p.updatedAt, views: p.views, likes: p.likes, comments: p.comments }] };
}

/** yt-dlp info dict → RadarPost */
export function fromYtDlp(raw: Raw, source: RadarSource, via?: string): RadarPost | null {
  const url = str(raw.webpage_url, raw.original_url);
  const shortcode = shortcodeFromUrl(url) ?? (typeof raw.id === 'string' ? raw.id : undefined);
  if (!shortcode) return null;
  const now = new Date().toISOString();
  const caption = str(raw.description, raw.title) ?? '';
  const handle = normalizeHandle(str(raw.channel, raw.uploader_id && !/^\d+$/.test(String(raw.uploader_id)) ? String(raw.uploader_id) : undefined, raw.uploader) ?? 'unknown');
  return withSnapshot({
    ...base(shortcode, now),
    url: url ?? base(shortcode, now).url,
    handle,
    source,
    discoveredVia: via,
    caption,
    hashtags: hashtagsFrom(caption),
    postedAt: toIso(raw.timestamp) ?? toIso(raw.upload_date),
    durationSec: num(raw.duration),
    isVideo: raw.duration != null || raw.vcodec !== 'none',
    views: num(raw.view_count),
    likes: num(raw.like_count),
    comments: num(raw.comment_count),
    thumbnailUrl: str(raw.thumbnail),
  });
}

/** Apify Instagram dataset item → RadarPost */
export function fromApify(raw: Raw, source: RadarSource, via?: string): RadarPost | null {
  const url = str(raw.url, raw.inputUrl);
  const shortcode = str(raw.shortCode, raw.shortcode, raw.code) ?? shortcodeFromUrl(url);
  if (!shortcode) return null;
  const now = new Date().toISOString();
  const caption = str(raw.caption) ?? '';
  const tags = Array.isArray(raw.hashtags) ? (raw.hashtags as unknown[]).filter((h): h is string => typeof h === 'string').map(h => h.toLowerCase()) : [];
  const type = String(raw.type ?? '').toLowerCase();
  const likes = num(raw.likesCount, raw.likes_count);
  return withSnapshot({
    ...base(shortcode, now),
    url: url && shortcodeFromUrl(url) ? url : base(shortcode, now).url,
    handle: normalizeHandle(str(raw.ownerUsername, raw.owner_username, (raw.owner as Raw | undefined)?.username) ?? 'unknown'),
    source,
    discoveredVia: via,
    caption,
    hashtags: tags.length ? tags : hashtagsFrom(caption),
    postedAt: toIso(raw.timestamp ?? raw.takenAt ?? raw.taken_at_timestamp),
    durationSec: num(raw.videoDuration, raw.video_duration),
    isVideo: type === 'video' || raw.productType === 'clips' || !!raw.videoUrl,
    views: num(raw.videoPlayCount, raw.playCount, raw.videoViewCount, raw.viewCount, raw.play_count),
    likes: likes === -1 ? undefined : likes, // Apify returns -1 when likes are hidden
    comments: num(raw.commentsCount, raw.comments_count),
    thumbnailUrl: str(raw.displayUrl, raw.thumbnailUrl),
    mediaUrl: str(raw.videoUrl, raw.video_url),
  });
}

function looksLikeYtDlp(r: Raw) {
  return 'extractor' in r || 'webpage_url' in r || 'extractor_key' in r;
}

/**
 * Parse an uploaded/pasted file. Accepts a JSON object, a JSON array,
 * or JSON Lines (one object per line — what `yt-dlp --dump-json` prints).
 */
export function parseImport(text: string, fileName?: string): { posts: RadarPost[]; skipped: number } {
  const trimmed = text.trim();
  let items: unknown[] = [];
  try {
    const parsed = JSON.parse(trimmed);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    items = trimmed.split(/\r?\n/).filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    });
  }
  // yt-dlp playlist dumps (-J) nest posts under `entries`
  items = items.flatMap(i => (i && typeof i === 'object' && Array.isArray((i as Raw).entries) ? (i as Raw).entries as unknown[] : [i]));

  const posts: RadarPost[] = [];
  let skipped = 0;
  for (const item of items) {
    if (!item || typeof item !== 'object') { skipped++; continue; }
    const r = item as Raw;
    const p = looksLikeYtDlp(r) ? fromYtDlp(r, 'import', fileName) : fromApify(r, 'import', fileName);
    if (p) posts.push(p); else skipped++;
  }
  return { posts, skipped };
}

/**
 * Merge a freshly fetched copy of a post into what we already have:
 * refresh metrics, append a snapshot, but never lose transcript/analysis.
 */
export function mergePost(existing: RadarPost | undefined, incoming: RadarPost): RadarPost {
  if (!existing) return incoming;
  const merged: RadarPost = {
    ...existing,
    caption: incoming.caption || existing.caption,
    hashtags: incoming.hashtags.length ? incoming.hashtags : existing.hashtags,
    postedAt: incoming.postedAt ?? existing.postedAt,
    durationSec: incoming.durationSec ?? existing.durationSec,
    isVideo: existing.isVideo || incoming.isVideo,
    views: incoming.views ?? existing.views,
    likes: incoming.likes ?? existing.likes,
    comments: incoming.comments ?? existing.comments,
    thumbnailUrl: incoming.thumbnailUrl ?? existing.thumbnailUrl,
    mediaUrl: incoming.mediaUrl ?? existing.mediaUrl,
    handle: existing.handle === 'unknown' ? incoming.handle : existing.handle,
    // a post we track keeps "tracked" even if it later shows up in a hashtag pull
    source: existing.source === 'tracked' ? 'tracked' : incoming.source,
    transcript: existing.transcript ?? incoming.transcript,
    updatedAt: incoming.updatedAt,
    history: [...existing.history, ...incoming.history].slice(-30),
  };
  return merged;
}
