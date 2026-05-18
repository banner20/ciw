export type TagCategory = 'descriptive' | 'framework' | 'structural' | 'audio' | 'visual' | 'custom';
export type LayerType   = 'descriptive' | 'framework' | 'structural' | 'audio' | 'visual' | 'custom';
export type Platform    = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin' | 'other';
export type FormatType  = 'short' | 'long' | 'reel' | 'story' | 'live' | 'other';
export type Language    = 'en' | 'hi' | 'es' | 'fr' | 'other';

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
