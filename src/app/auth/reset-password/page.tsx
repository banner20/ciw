'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Landing page for password-reset links. The link signs the user in first
// (via /auth/callback or the login page), then they pick a new password here.
export default function ResetPasswordPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [ready,    setReady]    = useState<'checking' | 'ok' | 'no-session'>('checking');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => setReady(data.session ? 'ok' : 'no-session'));
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don\'t match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.replace('/'), 1500);
  }

  const input = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all';

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Set a new password</h1>
        </div>

        <div className="bg-[#111114] border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-2xl">
          {ready === 'checking' && <p className="text-sm text-zinc-500">Checking your link…</p>}

          {ready === 'no-session' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">This reset link has expired or was opened in a different browser.</p>
              <Link href="/auth/login" className="text-sm text-violet-400 hover:text-violet-300">
                Back to sign in → use &ldquo;Forgot password?&rdquo; again
              </Link>
            </div>
          )}

          {ready === 'ok' && (done ? (
            <div className="flex items-center gap-2 text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Password updated. Taking you in…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input type="password" required autoFocus value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="New password" autoComplete="new-password" className={input} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password" autoComplete="new-password" className={input} />
              </div>
              <button type="submit" disabled={loading || !password || !confirm}
                className={cn('w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed', loading && 'animate-pulse')}>
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
