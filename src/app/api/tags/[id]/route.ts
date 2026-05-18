import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { tagFromRow, tagToRow } from '@/lib/db-transform';
import { Tag } from '@/types';

// PATCH /api/tags/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    const body: Partial<Tag> = await req.json();
    const row = tagToRow(body as Tag);
    const updates = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
    const { data, error } = await db.from('tags').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(tagFromRow(data as Record<string, unknown>));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/tags/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    const { error } = await db.from('tags').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
