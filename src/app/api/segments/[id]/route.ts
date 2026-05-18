import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { segmentFromRow, segmentToRow } from '@/lib/db-transform';
import { Segment } from '@/types';

// PATCH /api/segments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    const body: Partial<Segment> = await req.json();
    const row = segmentToRow(body as Segment);
    const updates = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
    const { data, error } = await db.from('segments').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(segmentFromRow(data as Record<string, unknown>));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/segments/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    const { error } = await db.from('segments').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
