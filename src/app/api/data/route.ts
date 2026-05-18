import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  projectFromRow, videoFromRow, segmentFromRow, tagFromRow, insightFromRow,
} from '@/lib/db-transform';

// GET /api/data — load all workspace data in one shot
export async function GET() {
  try {
    const db = createServerClient();
    const [projects, videos, segments, tags, insights] = await Promise.all([
      db.from('projects').select('*').order('created_at'),
      db.from('videos').select('*').order('created_at'),
      db.from('segments').select('*'),
      db.from('tags').select('*').order('usage_count', { ascending: false }),
      db.from('insights').select('*').order('score', { ascending: false }),
    ]);

    return NextResponse.json({
      projects: (projects.data ?? []).map(r => projectFromRow(r as Record<string, unknown>)),
      videos:   (videos.data   ?? []).map(r => videoFromRow(r as Record<string, unknown>)),
      segments: (segments.data ?? []).map(r => segmentFromRow(r as Record<string, unknown>)),
      tags:     (tags.data     ?? []).map(r => tagFromRow(r as Record<string, unknown>)),
      insights: (insights.data ?? []).map(r => insightFromRow(r as Record<string, unknown>)),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
