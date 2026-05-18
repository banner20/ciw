import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PROMPT = `You are analyzing an Instagram Reels retention/audience graph screenshot.

Your task: extract the retention curve as an array of numbers.

Instructions:
1. Identify the graph area (ignore titles, labels, UI chrome around it)
2. The X axis = time from 0% (left) to 100% (right) of the video
3. The Y axis = retention percentage from 0% (bottom) to 100% (top)
4. Sample the curve at 50 equally-spaced time points across the full width
5. For each point, estimate what % of the Y axis height the curve is at

Return ONLY a JSON object in this exact format, no explanation:
{"curve": [100, 95, 87, ...], "confidence": 0.85}

Where:
- "curve" is exactly 50 numbers, each 0-100
- First value is always near 100 (start of video)
- "confidence" is your confidence 0-1 in the extraction accuracy
- Numbers should reflect the actual shape of the curve you see`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType = (file.type || 'image/jpeg') as string;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422 });

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.curve) || parsed.curve.length === 0) {
      return NextResponse.json({ error: 'Invalid curve data from AI', raw: text }, { status: 422 });
    }

    // Normalise to exactly 50 points, clamp to 0-100
    const curve: number[] = parsed.curve
      .slice(0, 50)
      .map((v: unknown) => Math.max(0, Math.min(100, Number(v) || 0)));

    return NextResponse.json({ curve, confidence: parsed.confidence ?? 0.8, method: 'ai' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
