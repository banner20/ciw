import type { Idea, FormatType, Platform } from '@/types';

// ── Status maps ───────────────────────────────────────────────────────────────

// SM Tool kanban status → Notion Select value (exact string in your DB)
export const STATUS_TO_NOTION: Record<string, string> = {
  'no-status':     'No Status',
  'idea':          'Idea',
  'to-work-on':    'TO WORK ON',
  'scripting':     'Scripting',
  'filming-ready': 'Filming Ready',
  'editing':       'Editing',
  'ready':         'Ready',
  'posted':        'Posted',
};

// Notion Status value → SM Tool status (strip emojis, lowercase, partial match)
export function notionStatusToSMTool(notionStatus: string): string {
  const lower = notionStatus.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (!lower || lower === 'no status') return 'no-status';
  if (lower === 'idea')                return 'idea';
  if (lower.includes('work on') || lower === 'to work on') return 'to-work-on';
  if (lower.includes('script'))        return 'scripting';
  if (lower.includes('filming') || lower === 'filming ready') return 'filming-ready';
  if (lower.includes('edit'))          return 'editing';
  if (lower === 'ready')               return 'ready';
  if (lower.includes('post'))          return 'posted';
  return 'no-status';
}

// ── Format/Type maps ──────────────────────────────────────────────────────────

export const FORMAT_TO_NOTION: Partial<Record<FormatType, string>> = {
  reel:  'Reel',
  short: 'Meme',
  long:  'Educational',
  story: 'Other',
  live:  'Other',
  other: 'Other',
};

export function notionTypeToFormat(notionType: string): FormatType {
  const lower = notionType.toLowerCase();
  if (lower.includes('reel'))        return 'reel';
  if (lower.includes('meme'))        return 'short';
  if (lower.includes('education') || lower.includes('series')) return 'long';
  if (lower.includes('brand'))       return 'other';
  return 'other';
}

// ── Platform map ──────────────────────────────────────────────────────────────

export const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'other'];

export function normalisePlatform(raw: string): Platform {
  const lower = raw.toLowerCase();
  return (PLATFORMS.find(p => lower.includes(p)) ?? 'other') as Platform;
}

// ── Notion property extractors ────────────────────────────────────────────────
// All return '' / undefined rather than throwing on missing/null properties

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

export function getText(props: Props, key: string): string {
  const p = props[key];
  if (!p) return '';
  if (p.type === 'title')     return p.title?.[0]?.plain_text ?? '';
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text ?? '';
  return '';
}

export function getSelect(props: Props, key: string): string {
  return props[key]?.select?.name ?? '';
}

export function getDate(props: Props, key: string): string {
  return props[key]?.date?.start ?? '';
}

export function getCheckbox(props: Props, key: string): boolean {
  return props[key]?.checkbox ?? false;
}

// ── Notion property builders ──────────────────────────────────────────────────

export function titleProp(text: string) {
  return { title: [{ text: { content: text.slice(0, 2000) } }] };
}

export function richTextProp(text: string) {
  // Notion rich_text blocks max 2000 chars each; we send one block (truncated)
  return { rich_text: [{ text: { content: text.slice(0, 2000) } }] };
}

export function selectProp(name: string) {
  return { select: { name } };
}

export function dateProp(isoDate: string) {
  return { date: { start: isoDate } };
}

export function checkboxProp(val: boolean) {
  return { checkbox: val };
}

// ── Convert a Notion page → partial Idea ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function notionPageToIdea(page: any): Partial<Idea> & { notionPageId: string } {
  const props = page.properties ?? {};

  const rawStatus   = getSelect(props, 'Status');
  const rawType     = getSelect(props, 'Type');
  const rawPlatform = getSelect(props, 'Platform');

  return {
    notionPageId:   page.id,
    title:          getText(props, 'Project') || getText(props, 'Name') || 'Untitled',
    body:           getText(props, 'Notes'),
    hook:           getText(props, 'Hook'),
    brand:          getText(props, 'Brand'),
    scheduledDate:  getDate(props, 'Due Date') || undefined,
    status:         rawStatus ? notionStatusToSMTool(rawStatus) : 'idea',
    formatType:     rawType ? notionTypeToFormat(rawType) : undefined,
    platform:       rawPlatform ? normalisePlatform(rawPlatform) : undefined,
    notionSyncedAt: new Date().toISOString(),
  };
}

// ── Convert SM Tool Idea → Notion properties object ──────────────────────────

export function ideaToNotionProps(idea: Idea): Record<string, unknown> {
  const props: Record<string, unknown> = {
    Project:       titleProp(idea.title || 'Untitled'),
    Notes:         richTextProp(idea.body ?? ''),
    Hook:          richTextProp(idea.hook ?? ''),
    Brand:         richTextProp(idea.brand ?? ''),
    'SM Tool ID':  richTextProp(idea.id),
    'Last Synced': richTextProp(new Date().toISOString()),
  };

  const notionStatus = STATUS_TO_NOTION[idea.status];
  if (notionStatus) props.Status = selectProp(notionStatus);

  if (idea.scheduledDate) props['Due Date'] = dateProp(idea.scheduledDate);

  const notionType = idea.formatType ? FORMAT_TO_NOTION[idea.formatType] : undefined;
  if (notionType) props.Type = selectProp(notionType);

  if (idea.platform) props.Platform = selectProp(
    idea.platform.charAt(0).toUpperCase() + idea.platform.slice(1)
  );

  // Hook Ready? checkbox — true if hook text is non-empty
  props['Hook Ready?'] = checkboxProp(!!(idea.hook?.trim()));

  return props;
}
