'use client';
export const dynamic = 'force-dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, Lock, Globe, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

// Inner component uses useSearchParams — must be inside <Suspense>
function LoginForm() {
  const router     = useRouter();
  const params     = useSearchParams();
  const supabase   = createClient();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(
    params.get('error') ? 'Authentication failed. Please try again.' : null
  );

  // If already logged in, redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) router.replace('/');
    });
  }, [router, supabase.auth]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.replace('/');
  }

  async function handleGoogle() {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
    // On success, Supabase redirects the browser — no further action needed
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500
                          flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in to your Creative Intelligence Workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111114] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                            rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl
                       border border-white/[0.10] bg-white/[0.04] text-sm font-medium text-zinc-200
                       hover:bg-white/[0.08] hover:border-white/[0.16] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Globe className="w-4 h-4" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-zinc-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                           pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600
                           outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                           pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-zinc-600
                           outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                'bg-violet-600 hover:bg-violet-500 text-white',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                loading && 'animate-pulse'
              )}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

// Outer page wraps LoginForm in Suspense — required by Next.js App Router
// when useSearchParams() is used inside a page component.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d0f]" />}>
      <LoginForm />
    </Suspense>
  );
}
