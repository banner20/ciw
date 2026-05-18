'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, Lock, User, Globe, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) { setError(error.message); setLoading(false); }
    else setDone(true);
  }

  async function handleGoogle() {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25
                          flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Check your email</h2>
            <p className="text-sm text-zinc-500 mt-2">
              We sent a confirmation link to <span className="text-zinc-300">{email}</span>.
              Click it to activate your account.
            </p>
          </div>
          <Link href="/auth/login"
            className="inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Back to sign in →
          </Link>
        </div>
      </div>
    );
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
            <h1 className="text-xl font-bold text-white">Create your account</h1>
            <p className="text-sm text-zinc-500 mt-1">Start building your content intelligence</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111114] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl">

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

          <form onSubmit={handleSignup} className="space-y-3">
            {/* Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name (optional)"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                           pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600
                           outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
              />
            </div>

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
                placeholder="Password (8+ characters)"
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-[11px] text-zinc-700 text-center">
            By creating an account you agree to our terms of service.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
