import { Project, Video, Segment, Tag, Insight } from '@/types';

// ---------- generic helpers ----------

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c: string) => `_${c.toLowerCase()}`);
}

function rowToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) out[toCamel(key)] = row[key];
  return out;
}

function camelToRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) out[toSnake(key)] = obj[key];
  return out;
}

// ---------- Project ----------

export function projectFromRow(row: Record<string, unknown>): Project {
  const r = rowToCamel(row) as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    createdAt: r.createdAt as string,
  };
}

export function projectToRow(p: Project): Record<string, unknown> {
  return camelToRow({ id: p.id, name: p.name, description: p.description, createdAt: p.createdAt });
}

// ---------- Video ----------

export function videoFromRow(row: Record<string, unknown>): Video {
  const r = rowToCamel(row) as Record<string, unknown>;
  return {
    id: r.id as string,
    projectId: r.projectId as string,
    title: r.title as string,
    fileName: (r.fileName as string) ?? '',
    fileUrl: r.fileUrl as string | undefined,
    duration: (r.duration as number) ?? 0,
    thumbnail: r.thumbnail as string | undefined,
    platform: r.platform as Video['platform'],
    language: r.language as Video['language'],
    formatType: r.formatType as Video['formatType'],
    createdAt: r.createdAt as string,
    metrics: (r.metrics as Video['metrics']) ?? { views: 0, avgWatchTime: 0, retention: 0, saves: 0, shares: 0, comments: 0, follows: 0 },
    metricHistory: (r.metricHistory as Video['metricHistory']) ?? [],
  };
}

export function videoToRow(v: Video): Record<string, unknown> {
  return {
    id: v.id,
    project_id: v.projectId,
    title: v.title,
    file_name: v.fileName,
    file_url: v.fileUrl ?? null,
    duration: v.duration,
    thumbnail: v.thumbnail ?? null,
    platform: v.platform,
    language: v.language,
    format_type: v.formatType,
    created_at: v.createdAt,
    metrics: v.metrics,
    metric_history: v.metricHistory ?? [],
  };
}

// ---------- Segment ----------
// "start" and "end" are reserved words in PostgreSQL, stored as start_sec / end_sec

export function segmentFromRow(row: Record<string, unknown>): Segment {
  const r = rowToCamel(row) as Record<string, unknown>;
  return {
    id: r.id as string,
    videoId: r.videoId as string,
    start: (r.startSec as number) ?? 0,
    end: (r.endSec as number) ?? 0,
    label: (r.label as string) ?? '',
    notes: (r.notes as string) ?? '',
    layerType: r.layerType as Segment['layerType'],
    tags: (r.tags as string[]) ?? [],
    color: (r.color as string) ?? '#3b82f6',
    confidence: r.confidence as number | undefined,
    isOverlapping: (r.isOverlapping as boolean) ?? false,
  };
}

export function segmentToRow(s: Segment): Record<string, unknown> {
  return {
    id: s.id,
    video_id: s.videoId,
    start_sec: s.start,
    end_sec: s.end,
    label: s.label,
    notes: s.notes,
    layer_type: s.layerType,
    tags: s.tags,
    color: s.color,
    confidence: s.confidence ?? null,
    is_overlapping: s.isOverlapping ?? false,
  };
}

// ---------- Tag ----------

export function tagFromRow(row: Record<string, unknown>): Tag {
  const r = rowToCamel(row) as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as Tag['category'],
    group: (r.group as string) ?? '',
    color: (r.color as string) ?? '#6b7280',
    usageCount: (r.usageCount as number) ?? 0,
    createdAt: r.createdAt as string,
    definition: r.definition as string | undefined,
  };
}

export function tagToRow(t: Tag): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    group: t.group,
    color: t.color,
    usage_count: t.usageCount,
    created_at: t.createdAt,
    definition: t.definition ?? null,
  };
}

// ---------- Insight ----------

export function insightFromRow(row: Record<string, unknown>): Insight {
  const r = rowToCamel(row) as Record<string, unknown>;
  return {
    id: r.id as string,
    title: r.title as string,
    summary: (r.summary as string) ?? '',
    relatedTags: (r.relatedTags as string[]) ?? [],
    relatedVideos: (r.relatedVideos as string[]) ?? [],
    score: (r.score as number) ?? 0,
    createdAt: r.createdAt as string,
    type: r.type as Insight['type'],
    icon: (r.icon as string) ?? '💡',
  };
}

export function insightToRow(i: Insight): Record<string, unknown> {
  return {
    id: i.id,
    title: i.title,
    summary: i.summary,
    related_tags: i.relatedTags,
    related_videos: i.relatedVideos,
    score: i.score,
    created_at: i.createdAt,
    type: i.type,
    icon: i.icon,
  };
}
