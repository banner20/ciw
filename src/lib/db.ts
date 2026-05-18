/**
 * db.ts — Supabase CRUD layer
 *
 * Strategy: each table stores `id`, `user_id` (for RLS), a handful of indexed
 * columns, and `payload JSONB` which holds the full TypeScript object verbatim.
 * This avoids any camelCase/snake_case mapping while keeping the data queryable.
 *
 * All functions are fire-and-forget safe: they log errors but never throw,
 * so optimistic store updates are never broken by a sync failure.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Project, Video, Segment, Tag, Insight,
  IdeaColumn, Idea, Script, Goal, SwipeItem,
} from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function sb() { return createClient(); }

async function uid(): Promise<string | null> {
  const { data: { session } } = await sb().auth.getSession();
  return session?.user.id ?? null;
}

function err(label: string, error: unknown) {
  console.error(`[db] ${label}:`, error);
}

// ── projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await sb().from('projects').select('payload').order('created_at');
  if (error) { err('fetchProjects', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Project);
}

export async function upsertProject(project: Project): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('projects').upsert({
    id: project.id, user_id: userId,
    created_at: project.createdAt,
    payload: project,
  });
  if (error) err('upsertProject', error);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await sb().from('projects').delete().eq('id', id);
  if (error) err('deleteProject', error);
}

// ── videos ────────────────────────────────────────────────────────────────────

export async function fetchVideos(): Promise<Video[]> {
  const { data, error } = await sb().from('videos').select('payload').order('created_at');
  if (error) { err('fetchVideos', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Video);
}

export async function upsertVideo(video: Video): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('videos').upsert({
    id: video.id, user_id: userId,
    project_id: video.projectId,
    platform: video.platform,
    created_at: video.createdAt,
    payload: video,
  });
  if (error) err('upsertVideo', error);
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await sb().from('videos').delete().eq('id', id);
  if (error) err('deleteVideo', error);
}

// ── segments ──────────────────────────────────────────────────────────────────

export async function fetchSegments(): Promise<Segment[]> {
  const { data, error } = await sb().from('segments').select('payload');
  if (error) { err('fetchSegments', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Segment);
}

export async function upsertSegment(segment: Segment): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('segments').upsert({
    id: segment.id, user_id: userId,
    video_id: segment.videoId,
    payload: segment,
  });
  if (error) err('upsertSegment', error);
}

export async function deleteSegment(id: string): Promise<void> {
  const { error } = await sb().from('segments').delete().eq('id', id);
  if (error) err('deleteSegment', error);
}

// ── tags ──────────────────────────────────────────────────────────────────────

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await sb().from('tags').select('payload').order('created_at');
  if (error) { err('fetchTags', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Tag);
}

export async function upsertTag(tag: Tag): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('tags').upsert({
    id: tag.id, user_id: userId,
    name: tag.name, category: tag.category,
    created_at: tag.createdAt,
    payload: tag,
  });
  if (error) err('upsertTag', error);
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await sb().from('tags').delete().eq('id', id);
  if (error) err('deleteTag', error);
}

// ── insights ──────────────────────────────────────────────────────────────────

export async function fetchInsights(): Promise<Insight[]> {
  const { data, error } = await sb().from('insights').select('payload').order('created_at');
  if (error) { err('fetchInsights', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Insight);
}

export async function upsertInsights(insights: Insight[]): Promise<void> {
  const userId = await uid(); if (!userId) return;
  // Replace all insights (generated data, not user-edited)
  await sb().from('insights').delete().eq('user_id', userId);
  if (insights.length === 0) return;
  const { error } = await sb().from('insights').insert(
    insights.map(i => ({
      id: i.id, user_id: userId,
      created_at: i.createdAt,
      payload: i,
    }))
  );
  if (error) err('upsertInsights', error);
}

// ── idea columns ──────────────────────────────────────────────────────────────

export async function fetchIdeaColumns(): Promise<IdeaColumn[]> {
  const userId = await uid(); if (!userId) return [];
  const { data, error } = await sb()
    .from('user_settings')
    .select('idea_columns')
    .eq('user_id', userId)
    .single();
  if (error) { return []; } // no settings row yet = use defaults
  return (data?.idea_columns ?? []) as IdeaColumn[];
}

export async function saveIdeaColumns(cols: IdeaColumn[]): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('user_settings').upsert({
    user_id: userId,
    idea_columns: cols,
  });
  if (error) err('saveIdeaColumns', error);
}

// ── ideas ─────────────────────────────────────────────────────────────────────

export async function fetchIdeas(): Promise<Idea[]> {
  const { data, error } = await sb().from('ideas').select('payload').order('created_at');
  if (error) { err('fetchIdeas', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Idea);
}

export async function upsertIdea(idea: Idea): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('ideas').upsert({
    id: idea.id, user_id: userId,
    project_id: idea.projectId,
    status: idea.status,
    scheduled_date: idea.scheduledDate ?? null,
    created_at: idea.createdAt,
    payload: idea,
  });
  if (error) err('upsertIdea', error);
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await sb().from('ideas').delete().eq('id', id);
  if (error) err('deleteIdea', error);
}

// ── scripts ───────────────────────────────────────────────────────────────────

export async function fetchScripts(): Promise<Script[]> {
  const { data, error } = await sb().from('scripts').select('payload').order('created_at');
  if (error) { err('fetchScripts', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Script);
}

export async function upsertScript(script: Script): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('scripts').upsert({
    id: script.id, user_id: userId,
    idea_id: script.ideaId ?? null,
    created_at: script.createdAt,
    payload: script,
  });
  if (error) err('upsertScript', error);
}

export async function deleteScript(id: string): Promise<void> {
  const { error } = await sb().from('scripts').delete().eq('id', id);
  if (error) err('deleteScript', error);
}

// ── goals ─────────────────────────────────────────────────────────────────────

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await sb().from('goals').select('payload').order('created_at');
  if (error) { err('fetchGoals', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as Goal);
}

export async function upsertGoal(goal: Goal): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('goals').upsert({
    id: goal.id, user_id: userId,
    status: goal.status,
    created_at: goal.createdAt,
    payload: goal,
  });
  if (error) err('upsertGoal', error);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await sb().from('goals').delete().eq('id', id);
  if (error) err('deleteGoal', error);
}

// ── swipe items ───────────────────────────────────────────────────────────────

export async function fetchSwipeItems(): Promise<SwipeItem[]> {
  const { data, error } = await sb().from('swipe_items').select('payload').order('saved_at');
  if (error) { err('fetchSwipeItems', error); return []; }
  return (data ?? []).map((r: { payload: unknown }) => r.payload as SwipeItem);
}

export async function upsertSwipeItem(item: SwipeItem): Promise<void> {
  const userId = await uid(); if (!userId) return;
  const { error } = await sb().from('swipe_items').upsert({
    id: item.id, user_id: userId,
    platform: item.platform ?? null,
    saved_at: item.savedAt,
    payload: item,
  });
  if (error) err('upsertSwipeItem', error);
}

export async function deleteSwipeItem(id: string): Promise<void> {
  const { error } = await sb().from('swipe_items').delete().eq('id', id);
  if (error) err('deleteSwipeItem', error);
}

// ── bulk fetch (used by initFromApi) ──────────────────────────────────────────

export async function fetchAllUserData() {
  const [
    projects, videos, segments, tags, insights,
    ideaColumns, ideas, scripts, goals, swipeItems,
  ] = await Promise.all([
    fetchProjects(), fetchVideos(), fetchSegments(), fetchTags(), fetchInsights(),
    fetchIdeaColumns(), fetchIdeas(), fetchScripts(), fetchGoals(), fetchSwipeItems(),
  ]);
  return { projects, videos, segments, tags, insights, ideaColumns, ideas, scripts, goals, swipeItems };
}
