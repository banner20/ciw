import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { videoFromRow, videoToRow } from '@/lib/db-transform';
import { Video } from '@/types';

// PATCH /api/videos/[id] — update video fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    const body: Partial<Video> = await req.json();
    const row = videoToRow(body as Video);
    // Remove undefined values
    const updates = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
    const { data, error } = await db.from('videos').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(videoFromRow(data as Record<string, unknown>));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/videos/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    const { error } = await db.from('videos').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
