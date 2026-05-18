import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  projectToRow, videoToRow, segmentToRow, tagToRow, insightToRow,
} from '@/lib/db-transform';
import {
  SEED_PROJECTS, SEED_VIDEOS, SEED_SEGMENTS, SEED_TAGS, SEED_INSIGHTS,
} from '@/lib/seed';

// POST /api/seed — wipe and re-seed the database with Nitin's sample data
export async function POST() {
  try {
    const db = createServerClient();

    // Delete in reverse-dependency order
    await db.from('insights').delete().neq('id', '');
    await db.from('tags').delete().neq('id', '');
    await db.from('segments').delete().neq('id', '');
    await db.from('videos').delete().neq('id', '');
    await db.from('projects').delete().neq('id', '');

    // Re-insert seed data
    await db.from('projects').insert(SEED_PROJECTS.map(projectToRow));
    await db.from('videos').insert(SEED_VIDEOS.map(videoToRow));
    await db.from('segments').insert(SEED_SEGMENTS.map(segmentToRow));
    await db.from('tags').insert(SEED_TAGS.map(tagToRow));
    await db.from('insights').insert(SEED_INSIGHTS.map(insightToRow));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
