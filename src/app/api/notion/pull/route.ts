/**
 * GET /api/notion/pull
 *
 * Pull all pages from Notion Content Pipeline → SM Tool.
 *
 * Matching logic:
 *   - Page has 'SM Tool ID' property set → matched idea, return updated fields
 *   - Page has no 'SM Tool ID'           → new item from Notion, return as new idea draft
 *
 * Returns:
 *   {
 *     matched: Array<{ smToolId: string; updates: Partial<Idea> }>,   // update these
 *     newFromNotion: Array<Partial<Idea> & { notionPageId: string }>,  // create these
 *     total: number,
 *   }
 *
 * The client (NotionSync component) handles writing to the Zustand store.
 * This route is intentionally read-only on the Notion side.
 */

import { NextResponse } from 'next/server';
import { getNotionClient, getContentDbId } from '@/lib/notion/client';
import { notionPageToIdea, getText } from '@/lib/notion/mapping';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const notion = getNotionClient();
    const dbId   = getContentDbId();

    // Fetch all pages (paginate through all results)
    const pages: unknown[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await (notion as any).databases.query({
        database_id: dbId,
        page_size:   100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      pages.push(...(response.results ?? []));
      hasMore = response.has_more ?? false;
      cursor  = hasMore ? response.next_cursor ?? undefined : undefined;
    }

    const matched: { smToolId: string; updates: ReturnType<typeof notionPageToIdea> }[] = [];
    const newFromNotion: ReturnType<typeof notionPageToIdea>[] = [];

    for (const page of pages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = page as any;
      if (p.object !== 'page') continue;

      const partial    = notionPageToIdea(p);
      const smToolId   = getText(p.properties ?? {}, 'SM Tool ID');

      if (smToolId) {
        matched.push({ smToolId, updates: partial });
      } else {
        newFromNotion.push(partial);
      }
    }

    return NextResponse.json({
      ok:           true,
      matched,
      newFromNotion,
      total:        pages.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
