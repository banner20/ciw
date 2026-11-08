/**
 * Outlier scoring.
 *
 * Raw views mostly tell you who has the biggest audience. What we want is
 * "this post did far better than this creator normally does" — that's the
 * signal that the idea/hook/format worked, not just the account size.
 *
 *   outlier = post metric / creator's median for that metric
 *
 * We use views when the creator has view counts on most posts, otherwise likes.
 * A creator needs at least MIN_BASELINE posts before we trust their median.
 */
import type { RadarPost, ScoredPost } from './types';

export const MIN_BASELINE = 4;

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function scorePosts(posts: RadarPost[], now = Date.now()): ScoredPost[] {
  const byHandle = new Map<string, RadarPost[]>();
  for (const p of posts) {
    const list = byHandle.get(p.handle) ?? [];
    list.push(p);
    byHandle.set(p.handle, list);
  }

  const baselines = new Map<string, { metric: 'views' | 'likes'; value?: number }>();
  for (const [handle, list] of byHandle) {
    const withViews = list.filter(p => p.views != null && p.views > 0);
    const metric: 'views' | 'likes' = withViews.length >= list.length / 2 && withViews.length > 0 ? 'views' : 'likes';
    const vals = list.map(p => p[metric]).filter((v): v is number => v != null && v > 0);
    baselines.set(handle, { metric, value: vals.length >= MIN_BASELINE ? median(vals) : undefined });
  }

  return posts.map(p => {
    const b = baselines.get(p.handle)!;
    const metricValue = p[b.metric];
    const outlier = b.value && metricValue != null ? metricValue / b.value : undefined;
    const engagementRate = p.views ? ((p.likes ?? 0) + (p.comments ?? 0)) / p.views : undefined;
    const ageDays = p.postedAt ? Math.max(0, (now - new Date(p.postedAt).getTime()) / 86_400_000) : undefined;
    return { ...p, metric: b.metric, metricValue, baseline: b.value, outlier, engagementRate, ageDays };
  });
}

export function formatCount(n?: number): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}
