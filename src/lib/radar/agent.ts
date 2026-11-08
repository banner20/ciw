/**
 * Server-side helpers for the Radar scraper helper that runs on the user's
 * computer. It authenticates with a bearer token; we store only its SHA-256.
 */
import { createHash } from 'crypto';
import { createServerClient } from '@/lib/supabase-server';

export interface AgentRow {
  user_id: string;
  token_hash: string;
  last_seen_at: string | null;
  pull_requested_at: string | null;
  pull_handles: string[] | null;
  last_run_at: string | null;
  last_status: string | null;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Resolve the bearer token to its agent row, or null. */
export async function authenticateAgent(req: Request): Promise<{ db: ReturnType<typeof createServerClient>; agent: AgentRow } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length < 32) return null;
  const db = createServerClient();
  const { data } = await db.from('radar_agents').select('*').eq('token_hash', hashToken(token)).maybeSingle();
  return data ? { db, agent: data as AgentRow } : null;
}
