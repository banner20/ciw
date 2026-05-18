import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { tagFromRow, tagToRow } from '@/lib/db-transform';
import { Tag } from '@/types';

// POST /api/tags
export async function POST(req: NextRequest) {
  try {
    const db = createServerClient();
    const body: Tag = await req.json();
    const row = tagToRow(body);
    const { data, error } = await db.from('tags').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(tagFromRow(data as Record<string, unknown>), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
