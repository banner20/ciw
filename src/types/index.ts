export type TagCategory = 'descriptive' | 'framework' | 'structural' | 'audio' | 'visual' | 'custom';
export type LayerType   = 'descriptive' | 'framework' | 'structural' | 'audio' | 'visual' | 'custom';
export type Platform    = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin' | 'other';
export type FormatType  = 'short' | 'long' | 'reel' | 'story' | 'live' | 'other';
export type Language    = 'en' | 'hi' | 'es' | 'fr' | 'other';

// ── New taxonomy types ────────────────────────────────────────────────────────
export type ContentPillar  = 'education' | 'entertainment' | 'inspiration' | 'promotion' | 'bts' | 'other';
export type TargetEmotion  = 'curiosity' | 'humor' | 'awe' | 'fear' | 'inspiration' | 'outrage' | 'nostalgia';
export type IdeaDifficulty = 'quick' | 'standard' | 'production';
export type EnergyLevel    = 'low' | 'medium' | 'high';
export type BrollType      = 'selfie' | 'broll' | 'screen' | 'motion-graphic' | 'text-overlay' | 'mixed';
export type HookType       = 'curiosity-gap' | 'bold-statement' | 'pain-point' | 'visual' | 'question' | 'story' | 'stat';
export type EditStyle      = 'fast-cuts' | 'slow-burn' | 'text-heavy' | 'no-cuts' | 'mixed';

// ── Workspaces ────────────────────────────────────────────────────────────────
export type Workspace = 'intelligence' | 'ideas' | 'review';

export type IntelligenceView = 'library' | 'timeline' | 'table' | 'flow' | 'insights' | 'tags' | 'settings';
export type IdeasView        = 'ideas' | 'script' | 'calendar' | 'briefs' | 'swipe';
export type ReviewView       = 'dashboard' | 'goals' | 'reports';
export type ActiveView       = IntelligenceView | IdeasView | ReviewView;

// ── Core data ────────────────────────────────────────────────────────────────
export interface Metrics {
  views: number;
  avgWatchTime: number; // seconds
  retention: number;   // 0-100 percent
  saves: number;
  shares: number;
  comments: number;
  follows: number;
  // extended performance metrics (all optional — fill in as available)
  impressions?: number;       // total times shown in feed
  reach?: number;             // unique accounts reached
  thumbnailCTR?: number;      // click-through rate % on thumbnail
  firstHourViews?: number;    // view velocity signal
  profileVisits?: number;     // profile visits driven by this video
  followsFromVideo?: number;  // follows attributed to this specific video
}

export interface MetricSnapshot {
  date: string;
  views: number;
  retention: number;
  saves: number;
  shares: number;
  follows: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Video {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  fileUrl?: string;
  objectUrl?: string;
  duration: number;
  thumbnail?: string;
  platform: Platform;
  language: Language;
  formatType: FormatType;
  createdAt: string;
  metrics: Metrics;
  metricHistory?: MetricSnapshot[];
  script?: string;
  retentionCurve?: number[];
  retentionCurveMethod?: 'ai' | 'canvas' | 'manual';
  // extended video tracking
  postedAt?: string;           // ISO datetime of actual post (≠ createdAt)
  postHour?: number;           // 0-23 — hour of day posted, for time-of-day analysis
  audioTrack?: string;         // trending sound / original audio name
  hashtagsUsed?: string[];     // hashtags actually on the published post
  captionLength?: number;      // char count of published caption
  isBrandDeal?: boolean;       // sponsored/paid partnership (flags for avg exclusion)
  isCollab?: boolean;          // duet / stitch / collab post
  contentPillar?: ContentPillar;
  series?: string;             // series name if part of a content series
  repurposedFrom?: Platform;   // original platform if cross-posted
}

export interface Segment {
  id: string;
  videoId: string;
  start: number;
  end: number;
  label: string;
  notes: string;
  layerType: LayerType;
  tags: string[];
  color: string;
  confidence?: number;
  isOverlapping?: boolean;
  // extended segment tracking
  energyLevel?: EnergyLevel;    // pacing/energy of this segment
  dropOffMarker?: boolean;      // known audience drop-off point
  brollType?: BrollType;        // type of footage in this segment
  speakingPace?: number;        // words per minute (auto-calc or manual)
}

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  group: string;
  color: string;
  usageCount: number;
  createdAt: string;
  definition?: string;
}

export interface Insight {
  id: string;
  title: string;
  summary: string;
  relatedTags: string[];
  relatedVideos: string[];
  score: number;
  createdAt: string;
  type: 'pattern' | 'performance' | 'comparison' | 'recommendation';
  icon: string;
}

// ── Ideas workspace ───────────────────────────────────────────────────────────
// IdeaStatus is open-ended so users can create custom kanban columns
export type IdeaStatus = string;

export interface IdeaColumn {
  id:    string;   // also used as the status value on Idea.status
  label: string;
  color: string;   // hex, e.g. '#8b5cf6'
}

export interface IdeaTalkingPoint {
  id: string;
  text: string;
}

export interface IdeaChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Idea {
  id: string;
  projectId: string;
  title: string;
  hook: string;           // one-liner hook draft
  body: string;           // longer notes / description
  status: IdeaStatus;
  platform?: Platform;
  formatType?: FormatType;
  tags: string[];
  insightRef?: string;    // id of an Insight that inspired this
  scheduledDate?: string; // YYYY-MM-DD
  scriptId?: string;       // linked Script id
  linkedVideoId?: string;  // linked Video id (set when published)
  swipeRefs?: string[];    // SwipeItem ids that inspired this idea
  // brief / production fields
  talkingPoints?: IdeaTalkingPoint[];
  shootChecklist?: IdeaChecklistItem[];
  caption?: string;
  hashtags?: string[];
  createdAt: string;
  // extended idea tracking
  contentPillar?: ContentPillar;
  targetEmotion?: TargetEmotion;   // emotion to trigger in the viewer
  keyMessage?: string;             // the ONE takeaway sentence
  estimatedDuration?: number;      // planned video length in seconds
  difficulty?: IdeaDifficulty;     // effort/production level
  targetAudience?: string;         // who specifically this is for
  postDeadline?: string;           // YYYY-MM-DD — must-be-done-by (≠ scheduledDate = goes-live-at)
  // notion sync
  notionPageId?: string;   // Notion page ID — set after first push
  brand?: string;          // Brand name (maps to Notion Brand field)
  notionSyncedAt?: string; // ISO timestamp of last successful sync
}

export interface ScriptSection {
  id: string;
  type: 'hook' | 'build' | 'payoff' | 'cta' | 'custom';
  label: string;
  content: string;
  durationEst?: number; // estimated seconds
}

export interface Script {
  id: string;
  ideaId?: string;
  videoId?: string;
  title: string;
  sections: ScriptSection[];
  createdAt: string;
  updatedAt: string;
}

// ── Review workspace ──────────────────────────────────────────────────────────
export type GoalMetric = 'avg_retention' | 'total_views' | 'total_saves' | 'videos_tagged' | 'ideas_created' | 'custom';

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  target: number;
  current: number;
  unit: string;
  deadline?: string; // YYYY-MM-DD
  status: 'active' | 'achieved' | 'missed';
  createdAt: string;
  // extended goal tracking
  weeklyMilestone?: number;   // weekly sub-target for pacing
  contentPillar?: ContentPillar;
  strategy?: string;          // notes on how to hit this goal
  notes?: string;
}

export interface SwipeItem {
  id: string;
  title: string;
  url?: string;
  notes: string;
  tags: string[];
  platform?: Platform;
  creator?: string;
  savedAt: string;
  // extended swipe tracking
  viewCount?: number;          // views on the original post when saved (context)
  hookType?: HookType;         // technique used in the hook
  contentPillar?: ContentPillar;
  editStyle?: EditStyle;       // editing approach for reference
}

// ── Legacy AppState (kept for compat) ────────────────────────────────────────
export interface AppState {
  projects: Project[];
  videos: Video[];
  segments: Segment[];
  tags: Tag[];
  insights: Insight[];
  activeProjectId: string | null;
  activeVideoId: string | null;
  activeView: ActiveView;
  searchQuery: string;
  isSaved: boolean;
  lastSaved: string | null;
}
