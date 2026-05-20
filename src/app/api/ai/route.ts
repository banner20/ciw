import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildPrompt(action: string, context: Record<string, string>): string {
  const { sectionType, currentContent, ideaTitle, ideaHook, talkingPoints, platform, format } = context;

  const briefContext = [
    ideaTitle    && `Video title: ${ideaTitle}`,
    ideaHook     && `Hook concept: ${ideaHook}`,
    talkingPoints && `Talking points: ${talkingPoints}`,
    platform     && `Platform: ${platform}`,
    format       && `Format: ${format}`,
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are an expert short-form video scriptwriter. You write punchy, conversational scripts optimised for retention on platforms like TikTok, Instagram Reels, and YouTube Shorts. Write like a human speaks — contractions, short sentences, rhythm. Never use filler phrases like "certainly" or "of course". Never use markdown headers or bullet points in scripts. Output only the script text.`;

  switch (action) {
    case 'generate':
      return `${systemPrompt}

Brief:
${briefContext || 'No brief provided.'}

Write a ${sectionType} section for this video. ${
  sectionType === 'hook'   ? 'The hook must stop the scroll in the first 3 seconds. No preamble — open mid-action or mid-thought.' :
  sectionType === 'build'  ? 'Expand on the hook\'s promise. Build tension or curiosity. Keep the viewer wondering what\'s coming.' :
  sectionType === 'payoff' ? 'Deliver the value. The viewer came for this — make it worth it. Be specific and concrete.' :
  sectionType === 'cta'    ? 'End with a natural, non-pushy call to action. Should feel earned, not bolted on.' :
  'Write this section clearly and concisely.'
}

Output only the script text, no labels or prefixes.`;

    case 'rewrite':
      return `${systemPrompt}

Brief:
${briefContext || 'No brief provided.'}

Here is the current ${sectionType} section:
"${currentContent}"

Rewrite it with a completely different angle, structure, or approach. Keep the same purpose but make it feel fresh. Output only the new script text.`;

    case 'expand':
      return `${systemPrompt}

Brief:
${briefContext || 'No brief provided.'}

Here is the current ${sectionType} section:
"${currentContent}"

Expand this into a fuller, more detailed version. Add specific examples, texture, and depth. Output only the expanded script text.`;

    case 'shorten':
      return `${systemPrompt}

Current text:
"${currentContent}"

Tighten this to its most essential form. Cut every word that doesn't earn its place. Keep the same punchiness. Output only the shortened text.`;

    case 'hooks':
      return `${systemPrompt}

Brief:
${briefContext || 'No brief provided.'}

Generate 5 distinct hook variations for this video. Each should use a different technique:
1. Curiosity gap ("Most people don't know...")
2. Bold statement / contrarian take
3. Relatable pain point
4. Visual/action hook (describes what you're showing)
5. Direct question to the viewer

Output exactly 5 hooks, each on a new line, numbered 1-5. No other text.`;

    case 'brief':
      return `You are an expert short-form video producer. You write production briefs that are specific, actionable, and tailored to the platform.

Video concept:
${briefContext || 'No concept provided.'}

Generate a complete production brief using EXACTLY these section headers in order:

HOOK ANGLE:
[One scroll-stopping opening line — make it punchy and specific to the concept]

TALKING POINTS:
1. [First key point to cover]
2. [Second key point]
3. [Third key point]
4. [Fourth key point]
5. [Fifth key point]

B-ROLL IDEAS:
- [Specific visual shot or footage idea]
- [Another visual idea]
- [Another visual idea]

CTA OPTIONS:
- [First call-to-action option]
- [Second call-to-action option]

CAPTION DRAFT:
[A complete, ready-to-post caption under 180 words with line breaks. No hashtags — those are separate.]

Output only these five sections with the exact headers shown. No preamble, no commentary.`;

    default:
      return `${systemPrompt}\n\n${briefContext}\n\nWrite a short script section for: ${sectionType}`;
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { action, context } = body as { action: string; context: Record<string, string> };
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const prompt = buildPrompt(action, context ?? {});

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 600,
      stream: true,
    });

    // Stream the response back as SSE text
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
