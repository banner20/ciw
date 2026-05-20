'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bookmark, Link2, Tag, X, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import type { Platform, SwipeItem } from '@/types';

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'other'];

function detectPlatform(url: string): Platform | '' {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com'))    return 'tiktok';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('twitter.com') || lower.includes('x.com'))    return 'twitter';
  if (lower.includes('linkedin.com')) return 'linkedin';
  return '';
}

// ── Inner form (needs useSearchParams) ───────────────────────────────────────

function CaptureForm() {
  const params      = useSearchParams();
  const { addSwipeItem } = useStore();

  // Query params from bookmarklet (?url=&title=) or PWA share (?url=&title=&text=)
  const initUrl   = params.get('url')   ?? params.get('text') ?? '';
  const initTitle = params.get('title') ?? '';

  const [title,    setTitle]    = useState(initTitle);
  const [url,      setUrl]      = useState(initUrl);
  const [creator,  setCreator]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [platform, setPlatform] = useState<Platform | ''>(detectPlatform(initUrl));
  const [tagInput, setTagInput] = useState('');
  const [tags,     setTags]     = useState<string[]>([]);
  const [saved,    setSaved]    = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title on load; if title pre-filled focus notes instead
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80);
  }, []);

  // Auto-detect platform if URL changes
  useEffect(() => {
    if (url) setPlatform(detectPlatform(url));
  }, [url]);

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput) setTags(prev => prev.slice(0, -1));
  }

  function handleSave() {
    if (!title.trim() && !url.trim()) return;
    const item: SwipeItem = {
      id:       `swipe-${Date.now()}`,
      title:    title.trim() || url.trim(),
      url:      url.trim()   || undefined,
      creator:  creator.trim() || undefined,
      notes:    notes.trim(),
      tags,
      platform: (platform as Platform) || undefined,
      savedAt:  new Date().toISOString(),
    };
    addSwipeItem(item);
    setSaved(true);
    // Close popup after 1.2s, or redirect to app if opened as a full page
    setTimeout(() => {
      if (window.opener) {
        window.close();
      } else {
        window.location.href = '/';
      }
    }, 1200);
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-violet-400" />
          <p className="text-white font-semibold text-sm">Saved to Swipe File</p>
          <p className="text-zinc-600 text-xs">Closing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-start justify-center pt-8 pb-10 px-4">
      <div className="w-full max-w-sm bg-[#141418] border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-white flex-1">Save to Swipe File</span>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">

          {/* URL (shown first since it's usually pre-filled) */}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2
                          focus-within:border-violet-500/40 transition-colors">
            <Link2 className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="URL"
              className="flex-1 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 outline-none"
            />
          </div>

          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Title / what's inspiring you?"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                       text-sm text-white placeholder:text-zinc-600 outline-none
                       focus:border-violet-500/40 transition-colors"
          />

          {/* Platform chips */}
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setPlatform(platform === p ? '' : p)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors',
                  platform === p
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border border-white/[0.08]'
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Creator */}
          <input
            value={creator}
            onChange={e => setCreator(e.target.value)}
            placeholder="@creator (optional)"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2
                       text-sm text-zinc-300 placeholder:text-zinc-700 outline-none
                       focus:border-violet-500/40 transition-colors"
          />

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why does this work? What can you steal?"
            rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2
                       text-sm text-zinc-300 placeholder:text-zinc-700 outline-none
                       focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
          />

          {/* Tags */}
          <div className={cn(
            'flex flex-wrap items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2',
            'focus-within:border-violet-500/40 transition-colors min-h-[38px]'
          )}>
            <Tag className="w-3 h-3 text-zinc-600 shrink-0" />
            {tags.map(t => (
              <span key={t}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/15
                               text-violet-300 text-[11px] font-medium">
                #{t}
                <button onClick={() => setTags(prev => prev.filter(x => x !== t))}
                        className="text-violet-500 hover:text-red-400 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              placeholder={tags.length === 0 ? 'Tags (Enter to add)' : ''}
              className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 outline-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => window.opener ? window.close() : (window.location.href = '/')}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() && !url.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                       bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-xs font-semibold transition-colors"
          >
            <Bookmark className="w-3 h-3" />
            Save to Swipe File
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function CapturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    }>
      <CaptureForm />
    </Suspense>
  );
}
