import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { videoFromRow, videoToRow } from '@/lib/db-transform';
import { Video } from '@/types';

// POST /api/videos — create a new video record
export async function POST(req: NextRequest) {
  try {
    const db = createServerClient();
    const body: Video = await req.json();
    const row = videoToRow(body);
    const { data, error } = await db.from('videos').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(videoFromRow(data as Record<string, unknown>), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
