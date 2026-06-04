/**
 * GET /api/notion/setup
 *
 * Verifies the Notion connection and ensures all required properties
 * exist on the Content Pipeline database. Adds any missing ones.
 *
 * Required properties added if absent:
 *   Hook          — Rich text
 *   Platform      — Select (Instagram, TikTok, YouTube, Twitter, LinkedIn, Other)
 *   SM Tool ID    — Rich text  (sync anchor)
 *   Last Synced   — Rich text  (ISO timestamp)
 */

import { NextResponse } from 'next/server';
import { getNotionClient, getContentDbId } from '@/lib/notion/client';

export const runtime = 'nodejs';

const REQUIRED_PROPS: Record<string, object> = {
  'Hook': { rich_text: {} },
  'Platform': {
    select: {
      options: [
        { name: 'Instagram', color: 'pink'   },
        { name: 'Tiktok',    color: 'blue'   },
        { name: 'Youtube',   color: 'red'    },
        { name: 'Twitter',   color: 'gray'   },
        { name: 'Linkedin',  color: 'blue'   },
        { name: 'Other',     color: 'default'},
      ],
    },
  },
  'SM Tool ID':  { rich_text: {} },
  'Last Synced': { rich_text: {} },
};

export async function GET() {
  try {
    const notion = getNotionClient();
    const dbId   = getContentDbId();

    // Fetch current DB schema
    const db = await notion.databases.retrieve({ database_id: dbId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingProps = Object.keys((db as any).properties ?? {});

    // Find which required props are missing
    const missing = Object.entries(REQUIRED_PROPS).filter(
      ([name]) => !existingProps.includes(name)
    );

    let added: string[] = [];

    if (missing.length > 0) {
      const updatePayload: Record<string, object> = {};
      for (const [name, config] of missing) {
        updatePayload[name] = config;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (notion as any).databases.update({
        database_id: dbId,
        properties:  updatePayload,
      });

      added = missing.map(([name]) => name);
    }

    return NextResponse.json({
      ok:              true,
      dbId,
      existingProps,
      addedProps:      added,
      message:         added.length
        ? `Connected ✓ — added ${added.length} new property(s): ${added.join(', ')}`
        : 'Connected ✓ — all required properties already exist',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
