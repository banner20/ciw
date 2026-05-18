import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { insightFromRow, insightToRow } from '@/lib/db-transform';
import { Insight } from '@/types';

// POST /api/insights — upsert a batch of insights
export async function POST(req: NextRequest) {
  try {
    const db = createServerClient();
    const body: Insight[] = await req.json();
    const rows = body.map(insightToRow);
    const { data, error } = await db.from('insights').upsert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      (data ?? []).map(r => insightFromRow(r as Record<string, unknown>)),
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
