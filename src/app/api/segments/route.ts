import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { segmentFromRow, segmentToRow } from '@/lib/db-transform';
import { Segment } from '@/types';

// POST /api/segments — create a new segment
export async function POST(req: NextRequest) {
  try {
    const db = createServerClient();
    const body: Segment = await req.json();
    const row = segmentToRow(body);
    const { data, error } = await db.from('segments').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(segmentFromRow(data as Record<string, unknown>), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
