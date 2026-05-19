import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function extract(html: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); }
  catch { return NextResponse.json({ error: 'invalid url' }, { status: 400 }); }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 });

    // Only parse the first 50 KB to keep it fast
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      while (html.length < 50_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        // Stop early once we have </head>
        if (html.includes('</head>')) break;
      }
      reader.cancel();
    }

    const image = extract(html, [
      /property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    ]);

    const title = extract(html, [
      /property=["']og:title["']\s+content=["']([^"']+)["']/i,
      /name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["']\s+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const description = extract(html, [
      /property=["']og:description["']\s+content=["']([^"']+)["']/i,
      /name=["']description["']\s+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["']\s+property=["']og:description["']/i,
    ]);

    const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;

    return NextResponse.json({
      image:       image ? decode(image) : null,
      title:       title ? decode(title) : null,
      description: description ? decode(description) : null,
      favicon,
      domain:      parsed.hostname,
    }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
