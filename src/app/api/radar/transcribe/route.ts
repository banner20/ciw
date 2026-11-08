/**
 * POST /api/radar/transcribe
 *
 * Two ways in:
 *  - JSON { mediaUrl }       → transcribe a video link (e.g. from an Apify pull)
 *  - multipart form "file"   → transcribe an uploaded audio/video file
 *                              (tip: `yt-dlp -x` gives small audio files that upload fast)
 *
 * Uses Groq's hosted Whisper (same GROQ_API_KEY the AI assistant uses).
 */
import Groq, { toFile } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { errorResponse, requireUser } from '@/lib/radar/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MODEL = 'whisper-large-v3-turbo';
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const denied = await requireUser();
  if (denied) return denied;
  if (!process.env.GROQ_API_KEY) return errorResponse('GROQ_API_KEY is not set', 500);
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const type = req.headers.get('content-type') ?? '';

    if (type.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return errorResponse('No file uploaded', 400);
      if (file.size > MAX_BYTES) return errorResponse('File is over 25 MB. Upload audio only (yt-dlp -x).', 413);
      const out = await groq.audio.transcriptions.create({
        model: MODEL,
        file: await toFile(Buffer.from(await file.arrayBuffer()), file.name || 'audio.m4a'),
      });
      return NextResponse.json({ transcript: out.text.trim() });
    }

    const { mediaUrl } = await req.json() as { mediaUrl?: string };
    if (!mediaUrl || !/^https:\/\//.test(mediaUrl)) return errorResponse('mediaUrl required', 400);

    // First let Groq fetch the link itself; if that fails, download and upload it.
    try {
      const out = await groq.audio.transcriptions.create({ model: MODEL, url: mediaUrl });
      return NextResponse.json({ transcript: out.text.trim() });
    } catch {
      const res = await fetch(mediaUrl, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        return errorResponse(`Video link has expired or is blocked (${res.status}). Re-fetch the creator, or upload the audio file.`, 410);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) return errorResponse('Video is over 25 MB. Upload the audio file instead.', 413);
      const out = await groq.audio.transcriptions.create({ model: MODEL, file: await toFile(buf, 'reel.mp4') });
      return NextResponse.json({ transcript: out.text.trim() });
    }
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 502);
  }
}
