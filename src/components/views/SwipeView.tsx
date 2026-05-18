'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Bookmark, ExternalLink, Trash2, Search, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SwipeItem, Platform } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────────

const PLATFORM_STYLES: Partial<Record<Platform, string>> = {
  instagram: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  tiktok:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  youtube:   'bg-red-500/15 text-red-400 border-red-500/20',
  twitter:   'bg-sky-500/15 text-sky-400 border-sky-500/20',
  linkedin:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

// ── Add item modal ─────────────────────────────────────────────────────────────

function AddSwipeModal({ onClose }: { onClose: () => void }) {
  const { addSwipeItem } = useStore();
  const [title,    setTitle]    = useState('');
  const [url,      setUrl]      = useState('');
  const [notes,    setNotes]    = useState('');
  const [creator,  setCreator]  = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [tagInput, setTagInput] = useState('');

  const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);

  function submit() {
    if (!title.trim()) return;
    addSwipeItem({
      id:        `swipe-${Date.now()}`,
      title:     title.trim(),
      url:       url.trim() || undefined,
      notes:     notes.trim(),
      tags,
      platform:  platform || undefined,
      creator:   creator.trim() || undefined,
      savedAt:   new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#18181c] border border-white/10 rounded-2xl p-5 w-[440px] space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-white">Add to swipe file</div>

        <input autoFocus placeholder="Title / what it is…" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        <input placeholder="URL (optional)" value={url} onChange={e => setUrl(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Creator / @handle" value={creator} onChange={e => setCreator(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
          <select value={platform} onChange={e => setPlatform(e.target.value as Platform | '')}
            className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none">
            <option value="">Platform…</option>
            {(['instagram','tiktok','youtube','twitter','linkedin'] as Platform[]).map(p => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>
        </div>

        <textarea placeholder="What made this work? What would you steal?" value={notes} onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40 resize-none" />

        <input placeholder="Tags (comma-separated): hook, b-roll, transition…" value={tagInput} onChange={e => setTagInput(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
            Save
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Swipe card ────────────────────────────────────────────────────────────────

function SwipeCard({ item }: { item: SwipeItem }) {
  const { deleteSwipeItem } = useStore();
  const platformStyle = item.platform ? (PLATFORM_STYLES[item.platform] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20') : null;

  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4 space-y-3 group hover:border-white/[0.12] transition-all">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
          <Bookmark className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white leading-snug">{item.title}</div>
          {item.creator && (
            <div className="text-[10px] text-zinc-600 mt-0.5">@{item.creator}</div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-blue-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => deleteSwipeItem(item.id)}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">{item.notes}</p>
      )}

      {/* Tags + platform */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {platformStyle && item.platform && (
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize', platformStyle)}>
            {item.platform}
          </span>
        )}
        {item.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.07] text-zinc-500">
            {tag}
          </span>
        ))}
      </div>

      {/* Saved date */}
      <div className="text-[10px] text-zinc-700">
        Saved {new Date(item.savedAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SwipeView() {
  const { swipeItems } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch]   = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  const platforms: (Platform | 'all')[] = ['all', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'];

  const filtered = swipeItems.filter(item => {
    const matchSearch = !search || [item.title, item.notes, item.creator, ...item.tags]
      .some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const matchPlatform = platformFilter === 'all' || item.platform === platformFilter;
    return matchSearch && matchPlatform;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Swipe File</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{swipeItems.length} saved · inspiration &amp; references</p>
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500/30"
            />
          </div>
          <div className="flex gap-1">
            {platforms.map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize',
                  platformFilter === p ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-600 hover:text-zinc-300')}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-400">
                {swipeItems.length === 0 ? 'Swipe file is empty' : 'No results'}
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                {swipeItems.length === 0 ? 'Save content that inspires you' : 'Try a different search'}
              </div>
            </div>
            {swipeItems.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                Add first item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(item => <SwipeCard key={item.id} item={item} />)}
          </div>
        )}
      </div>

      {showAdd && <AddSwipeModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
