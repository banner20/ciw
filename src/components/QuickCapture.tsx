'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Bookmark, Link2, Tag, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import type { Platform, SwipeItem } from '@/types';

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'other'];

export default function QuickCapture() {
  const { addSwipeItem } = useStore();
  const [open, setOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);

  // Form fields
  const [title,    setTitle]    = useState('');
  const [url,      setUrl]      = useState('');
  const [creator,  setCreator]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [tagInput, setTagInput] = useState('');
  const [tags,     setTags]     = useState<string[]>([]);

  const titleRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: 'C' opens capture (when not in an input)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (!isInput && e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus title when opened
  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 80);
  }, [open]);

  function reset() {
    setTitle(''); setUrl(''); setCreator(''); setNotes('');
    setPlatform(''); setTagInput(''); setTags([]);
  }

  function handleClose() { setOpen(false); reset(); }

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
    if (!title.trim()) return;
    const item: SwipeItem = {
      id:        `swipe-${Date.now()}`,
      title:     title.trim(),
      url:       url.trim() || undefined,
      creator:   creator.trim() || undefined,
      notes:     notes.trim(),
      tags,
      platform:  (platform as Platform) || undefined,
      savedAt:   new Date().toISOString(),
    };
    addSwipeItem(item);
    handleClose();
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Quick capture (press C)"
        className={cn(
          'fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full shadow-lg',
          'flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-zinc-800 border border-white/10 rotate-45'
            : 'bg-violet-600 hover:bg-violet-500 hover:scale-105'
        )}
      >
        {open ? (
          <X className="w-4 h-4 text-white" />
        ) : (
          <Plus className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Capture overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="qc-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              key="qc-panel"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{   opacity: 0, scale: 0.96, y: 12  }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="fixed bottom-20 right-5 z-50 w-[360px] bg-[#141418] border border-white/[0.09]
                         rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Bookmark className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-white flex-1">Quick Capture</span>
                <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 bg-white/[0.04] rounded border border-white/[0.06]">C</span>
              </div>

              {/* Form */}
              <div className="p-4 space-y-3">

                {/* Title (required) */}
                <input
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && url === '' && notes === '' && handleSave()}
                  placeholder="What's inspiring you? *"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                             text-sm text-white placeholder:text-zinc-600 outline-none
                             focus:border-violet-500/40 transition-colors"
                />

                {/* URL */}
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2
                                focus-within:border-violet-500/40 transition-colors">
                  <Link2 className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="URL (optional)"
                    className="flex-1 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 outline-none"
                  />
                </div>

                {/* Creator + Platform row */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={creator}
                    onChange={e => setCreator(e.target.value)}
                    placeholder="@creator"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2
                               text-sm text-zinc-300 placeholder:text-zinc-700 outline-none
                               focus:border-violet-500/40 transition-colors"
                  />

                  {/* Platform dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setPlatformOpen(o => !o)}
                      className="w-full flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08]
                                 rounded-xl px-3 py-2 text-sm text-left transition-colors
                                 hover:border-white/[0.14] focus:border-violet-500/40"
                    >
                      <span className={cn('flex-1 truncate', platform ? 'text-zinc-300 capitalize' : 'text-zinc-700')}>
                        {platform || 'Platform'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
                    </button>
                    <AnimatePresence>
                      {platformOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 mt-1 z-10 bg-[#1e1e26]
                                     border border-white/10 rounded-xl py-1 shadow-xl"
                          onClick={() => setPlatformOpen(false)}
                        >
                          <button
                            onClick={() => setPlatform('')}
                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]"
                          >
                            — None
                          </button>
                          {PLATFORMS.map(p => (
                            <button
                              key={p}
                              onClick={() => setPlatform(p)}
                              className={cn(
                                'w-full text-left px-3 py-1.5 text-xs capitalize transition-colors hover:bg-white/[0.04]',
                                platform === p ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Notes */}
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Why does this work? What can you steal?"
                  rows={3}
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
                              className="text-violet-500 hover:text-red-400 transition-colors leading-none">
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
                  onClick={handleClose}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                             bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                             text-white text-xs font-semibold transition-colors"
                >
                  <Bookmark className="w-3 h-3" />
                  Save to Swipe File
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
