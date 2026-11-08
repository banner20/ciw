/**
 * GET /api/radar/agent/jobs   (Authorization: Bearer <radar token>)
 *
 * Polled by the helper on the user's computer. Records a heartbeat and
 * returns whether a pull was requested from the app, and which handles.
 */
import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/radar/agent';
import type { RadarCreator } from '@/lib/radar/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await authenticateAgent(req);
  if (!auth) return NextResponse.json({ error: 'Invalid token. Generate a new one in Radar → Connect computer.' }, { status: 401 });
  const { db, agent } = auth;

  await db.from('radar_agents').update({ last_seen_at: new Date().toISOString() }).eq('user_id', agent.user_id);

  const { data } = await db.from('radar_creators').select('payload').eq('user_id', agent.user_id);
  const all = (data ?? []).map(r => (r.payload as RadarCreator).handle);
  const requested = agent.pull_handles?.length ? agent.pull_handles.filter(h => all.includes(h)) : all;

  return NextResponse.json({
    pullRequested: !!agent.pull_requested_at,
    requestedAt: agent.pull_requested_at,
    handles: requested,
    allHandles: all,
    lastRunAt: agent.last_run_at,
  });
}
