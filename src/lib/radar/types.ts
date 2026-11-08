import type { ContentPillar, HookType } from '@/types';

/** Where a post entered Radar. */
export type RadarSource = 'tracked' | 'discovery' | 'import';

/** A competitor / reference creator we want to watch. */
export interface RadarCreator {
  id: string;            // `ig:<handle>`
  handle: string;        // lowercase, no @
  label?: string;        // "direct competitor", "adjacent niche", …
  notes?: string;
  addedAt: string;
  lastFetchedAt?: string;
  followers?: number;
}

/** A point-in-time read of a post's numbers, so we can see momentum. */
export interface RadarSnapshot {
  at: string;
  views?: number;
  likes?: number;
  comments?: number;
}

/** AI breakdown of why a post worked and how to reuse it. */
export interface RadarAnalysis {
  hook: string;            // the literal opening line
  hookType: HookType;
  format: string;          // talking head, skit, listicle, b-roll + voiceover…
  pillar: ContentPillar;
  topic: string;
  whyItWorked: string;
  template: string;        // fill-in-the-blank structure
  adaptation: string;      // how we could do our own version
  analyzedAt: string;
}

export interface RadarPost {
  id: string;              // `ig:<shortcode>`
  shortcode: string;
  url: string;
  handle: string;          // owner, lowercase
  source: RadarSource;
  discoveredVia?: string;  // hashtag or file name it came from
  caption: string;
  hashtags: string[];
  postedAt?: string;
  durationSec?: number;
  isVideo: boolean;
  views?: number;
  likes?: number;
  comments?: number;
  thumbnailUrl?: string;
  mediaUrl?: string;       // short-lived CDN link (from Apify), used for transcription
  transcript?: string;
  analysis?: RadarAnalysis;
  savedToSwipe?: boolean;
  firstSeenAt: string;
  updatedAt: string;
  history: RadarSnapshot[];
}

/** Post with derived ranking numbers attached (not stored). */
export interface ScoredPost extends RadarPost {
  baseline?: number;       // creator's median for the chosen metric
  metric: 'views' | 'likes';
  metricValue?: number;
  outlier?: number;        // metricValue / baseline
  engagementRate?: number; // (likes + comments) / views
  ageDays?: number;
}
