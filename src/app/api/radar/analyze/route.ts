/**
 * POST /api/radar/analyze
 * body: { post: { caption, transcript?, handle, views?, likes?, comments?, outlier?, durationSec? }, niche?: string }
 *
 * Breaks a post down into hook / format / why it worked / reusable template.
 */
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { errorResponse, requireUser } from '@/lib/radar/server';
import type { RadarAnalysis } from '@/lib/radar/types';
import type { ContentPillar, HookType } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const HOOK_TYPES: HookType[] = ['curiosity-gap', 'bold-statement', 'pain-point', 'visual', 'question', 'story', 'stat'];
const PILLARS: ContentPillar[] = ['education', 'entertainment', 'inspiration', 'promotion', 'bts', 'other'];

export async function POST(req: Request) {
  const denied = await requireUser();
  if (denied) return denied;
  if (!process.env.GROQ_API_KEY) return errorResponse('GROQ_API_KEY is not set', 500);

  let body: { post?: Record<string, unknown>; niche?: string };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON', 400); }
  const p = body.post ?? {};
  const caption = String(p.caption ?? '').slice(0, 2200);
  const transcript = String(p.transcript ?? '').slice(0, 6000);
  if (!caption && !transcript) return errorResponse('Need a caption or transcript to analyze', 400);

  const stats = [
    p.views != null && `views: ${p.views}`,
    p.likes != null && `likes: ${p.likes}`,
    p.comments != null && `comments: ${p.comments}`,
    typeof p.outlier === 'number' && `performance vs creator's usual: ${p.outlier.toFixed(1)}x`,
    p.durationSec != null && `length: ${Math.round(Number(p.durationSec))}s`,
  ].filter(Boolean).join(', ');

  const prompt = `You analyse short-form Instagram Reels for a content team. Explain why a post performed and turn it into something reusable.
${body.niche ? `Our creator's niche: ${body.niche}\n` : ''}
Creator: @${p.handle ?? 'unknown'}
Stats: ${stats || 'unknown'}
Caption:
"""${caption || '(none)'}"""
Transcript:
"""${transcript || '(not available — infer from caption only and say so in whyItWorked)'}"""

Return ONLY a JSON object with these keys:
- "hook": the literal opening line (first sentence spoken, or on-screen hook if no transcript)
- "hookType": one of ${HOOK_TYPES.map(h => `"${h}"`).join(', ')}
- "format": short label for the video format (e.g. "talking head", "skit", "listicle", "b-roll + voiceover", "green screen react")
- "pillar": one of ${PILLARS.map(h => `"${h}"`).join(', ')}
- "topic": the topic in under 8 words
- "whyItWorked": 2-3 concrete sentences on the psychological/structural reasons it performed
- "template": a fill-in-the-blank structure of the video, e.g. "Hook: [contrarian claim about X] → Proof: [...] → Payoff: [...] → CTA: [...]"
- "adaptation": one specific idea for how our creator could make their own version (not a copy)`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 900,
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>;
    const s = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).trim() : '');
    const analysis: RadarAnalysis = {
      hook: s('hook'),
      hookType: HOOK_TYPES.includes(raw.hookType as HookType) ? raw.hookType as HookType : 'bold-statement',
      format: s('format'),
      pillar: PILLARS.includes(raw.pillar as ContentPillar) ? raw.pillar as ContentPillar : 'other',
      topic: s('topic'),
      whyItWorked: s('whyItWorked'),
      template: s('template'),
      adaptation: s('adaptation'),
      analyzedAt: new Date().toISOString(),
    };
    return NextResponse.json({ analysis });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 502);
  }
}
