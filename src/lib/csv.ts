/**
 * CSV encode / decode utilities for CIW data export & import.
 *
 * Conventions:
 *  - Header row always present
 *  - Tags stored as pipe-separated values inside a single cell: "Hook|B-Roll|CTA"
 *  - Empty optional fields left blank (not "null"/"undefined")
 *  - Dates as ISO strings
 *  - Numbers as plain numeric strings (no units)
 */

import { Video, Segment, Tag } from '@/types';

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Wrap a cell value: escapes quotes and wraps in quotes if needed */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function row(values: unknown[]): string {
  return values.map(cell).join(',');
}

/** Parse a single CSV file into an array of header-keyed objects */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

/** Detect which entity type a parsed CSV represents based on its headers */
export function detectCSVType(rows: Record<string, string>[]): 'videos' | 'segments' | 'tags' | 'unknown' {
  if (!rows.length) return 'unknown';
  const keys = Object.keys(rows[0]);
  if (keys.includes('layerType') || keys.includes('videoId')) return 'segments';
  if (keys.includes('usageCount') || keys.includes('category')) return 'tags';
  if (keys.includes('views') || keys.includes('platform') || keys.includes('retention')) return 'videos';
  return 'unknown';
}

/* ── EXPORT ─────────────────────────────────────────────────────────────── */

export function exportVideosCSV(videos: Video[]): string {
  const headers = [
    'id', 'title', 'platform', 'language', 'formatType',
    'duration', 'createdAt',
    'views', 'avgWatchTime', 'retention', 'saves', 'shares', 'comments', 'follows',
    'script',
  ];
  const lines = [headers.join(',')];
  for (const v of videos) {
    lines.push(row([
      v.id, v.title, v.platform, v.language, v.formatType,
      v.duration, v.createdAt,
      v.metrics.views, v.metrics.avgWatchTime, v.metrics.retention,
      v.metrics.saves, v.metrics.shares, v.metrics.comments, v.metrics.follows,
      v.script ?? '',
    ]));
  }
  return lines.join('\n');
}

export function exportSegmentsCSV(segments: Segment[], videos: Video[]): string {
  const videoTitleMap = Object.fromEntries(videos.map(v => [v.id, v.title]));
  const headers = ['id', 'videoId', 'videoTitle', 'start', 'end', 'label', 'notes', 'layerType', 'tags', 'color'];
  const lines = [headers.join(',')];
  for (const s of segments) {
    lines.push(row([
      s.id, s.videoId, videoTitleMap[s.videoId] ?? '',
      s.start, s.end, s.label, s.notes,
      s.layerType, s.tags.join('|'), s.color,
    ]));
  }
  return lines.join('\n');
}

export function exportTagsCSV(tags: Tag[]): string {
  const headers = ['id', 'name', 'category', 'group', 'color', 'usageCount', 'definition'];
  const lines = [headers.join(',')];
  for (const t of tags) {
    lines.push(row([t.id, t.name, t.category, t.group, t.color, t.usageCount, t.definition ?? '']));
  }
  return lines.join('\n');
}

/** Trigger a browser file download */
export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export all three entity types — sequential with tiny delay to avoid browser blocking */
export function exportAllCSV(videos: Video[], segments: Segment[], tags: Tag[]) {
  const date = new Date().toISOString().slice(0, 10);
  const files = [
    { name: `ciw-videos-${date}.csv`,   content: exportVideosCSV(videos) },
    { name: `ciw-segments-${date}.csv`, content: exportSegmentsCSV(segments, videos) },
    { name: `ciw-tags-${date}.csv`,     content: exportTagsCSV(tags) },
  ];
  files.forEach((f, i) => {
    setTimeout(() => downloadCSV(f.name, f.content), i * 250);
  });
}

/* ── IMPORT ─────────────────────────────────────────────────────────────── */

function num(v: string, fallback = 0): number {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

export function importVideosFromCSV(rows: Record<string, string>[]): Video[] {
  return rows.filter(r => r.id && r.title).map(r => ({
    id:          r.id,
    projectId:   r.projectId || 'proj-1',
    title:       r.title,
    fileName:    r.fileName || r.title,
    fileUrl:     r.fileUrl || undefined,
    objectUrl:   r.objectUrl || undefined,
    duration:    num(r.duration, 60),
    platform:    (r.platform as Video['platform']) || 'instagram',
    language:    (r.language as Video['language']) || 'en',
    formatType:  (r.formatType as Video['formatType']) || 'short',
    createdAt:   r.createdAt || new Date().toISOString(),
    metrics: {
      views:        num(r.views),
      avgWatchTime: num(r.avgWatchTime),
      retention:    num(r.retention),
      saves:        num(r.saves),
      shares:       num(r.shares),
      comments:     num(r.comments),
      follows:      num(r.follows),
    },
    script: r.script || undefined,
  }));
}

export function importSegmentsFromCSV(rows: Record<string, string>[]): Segment[] {
  return rows.filter(r => r.id && r.videoId).map(r => ({
    id:        r.id,
    videoId:   r.videoId,
    start:     num(r.start),
    end:       num(r.end, 5),
    label:     r.label || 'Segment',
    notes:     r.notes || '',
    layerType: (r.layerType as Segment['layerType']) || 'descriptive',
    tags:      r.tags ? r.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
    color:     r.color || '#3b82f6',
  }));
}

export function importTagsFromCSV(rows: Record<string, string>[]): Tag[] {
  return rows.filter(r => r.id && r.name).map(r => ({
    id:         r.id,
    name:       r.name,
    category:   (r.category as Tag['category']) || 'custom',
    group:      r.group || 'Custom',
    color:      r.color || '#6b7280',
    usageCount: num(r.usageCount),
    createdAt:  r.createdAt || new Date().toISOString(),
    definition: r.definition || undefined,
  }));
}
