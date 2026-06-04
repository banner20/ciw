/**
 * POST /api/notion/push
 *
 * Push SM Tool ideas → Notion Content Pipeline.
 * Body: { ideas: Idea[] }
 *
 * For each idea:
 *   - If idea.notionPageId exists → PATCH (update) that page
 *   - Otherwise → POST (create) a new page, return new notionPageId
 *
 * Returns:
 *   { results: Array<{ id: string; notionPageId: string; action: 'created'|'updated'|'error'; error?: string }> }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getNotionClient, getContentDbId } from '@/lib/notion/client';
import { ideaToNotionProps } from '@/lib/notion/mapping';
import type { Idea } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { ideas: Idea[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ideas } = body;
  if (!Array.isArray(ideas) || ideas.length === 0) {
    return NextResponse.json({ error: 'ideas array is required' }, { status: 400 });
  }

  try {
    const notion = getNotionClient();
    const dbId   = getContentDbId();

    const results = await Promise.allSettled(
      ideas.map(async (idea) => {
        const properties = ideaToNotionProps(idea);

        if (idea.notionPageId) {
          // Update existing Notion page
          await notion.pages.update({
            page_id:    idea.notionPageId,
            properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
          });
          return { id: idea.id, notionPageId: idea.notionPageId, action: 'updated' as const };
        } else {
          // Create new Notion page
          const page = await notion.pages.create({
            parent:     { database_id: dbId },
            properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
          });
          return { id: idea.id, notionPageId: page.id, action: 'created' as const };
        }
      })
    );

    const output = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        id:          ideas[i].id,
        notionPageId: ideas[i].notionPageId ?? null,
        action:      'error' as const,
        error:       r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    });

    const errors = output.filter(r => r.action === 'error');

    return NextResponse.json({
      ok:      errors.length === 0,
      results: output,
      summary: {
        total:   ideas.length,
        created: output.filter(r => r.action === 'created').length,
        updated: output.filter(r => r.action === 'updated').length,
        errors:  errors.length,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
