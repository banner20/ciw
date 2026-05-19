'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import {
  Plus, Bookmark, ExternalLink, Trash2, Search, Link2,
  Edit3, X, Check, Lightbulb, Image as ImageIcon, LayoutGrid, List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SwipeItem, Platform, Idea } from '@/types';

// ── constants ─────────────────────────────────────────────────────────────────

const PLATFORMS: (Platform | 'all')[] = ['all', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'];

const PLATFORM_STYLES: Partial<Record<Platform, { pill: string; dot: string }>> = {
  instagram: { pill: 'bg-pink-500/15 text-pink-400 border-pink-500/20',   dot: 'bg-pink-400' },
  tiktok:    { pill: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',   dot: 'bg-cyan-400' },
  youtube:   { pill: 'bg-red-500/15 text-red-400 border-red-500/20',      dot: 'bg-red-400' },
  twitter:   { pill: 'bg-sky-500/15 text-sky-400 border-sky-500/20',      dot: 'bg-sky-400' },
  linkedin:  { pill: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400' },
};

// ── OG preview hook ───────────────────────────────────────────────────────────

type OGData = { image: string | null; title: string | null; favicon: string | null; domain: string | null };

const ogCache = new Map<string, OGData>();

function useOG(url: string | undefined) {
  const [data, setData] = useState<OGData | null>(url ? ogCache.get(url) ?? null : null);

  useEffect(() => {
    if (!url) return;
    if (ogCache.has(url)) { setData(ogCache.get(url)!); return; }
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: OGData | null) => {
        if (d) { ogCache.set(url, d); setData(d); }
      })
      .catch(() => null);
  }, [url]);

  return data;
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────

interface SwipeModalProps {
  initial?: SwipeItem;
  onClose: () => void;
}

function SwipeModal({ initial, onClose }: SwipeModalProps) {
  const { addSwipeItem, updateSwipeItem } = useStore();
  const isEdit = !!initial;

  const [title,    setTitle]    = useState(initial?.title    ?? '');
  const [url,      setUrl]      = useState(initial?.url      ?? '');
  const [notes,    setNotes]    = useState(initial?.notes    ?? '');
  const [creator,  setCreator]  = useState(initial?.creator  ?? '');
  const [platform, setPlatform] = useState<Platform | ''>(initial?.platform ?? '');
  const [tagInput, setTagInput] = useState(initial?.tags.join(', ') ?? '');

  const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);

  function submit() {
    if (!title.trim()) return;
    if (isEdit && initial) {
      updateSwipeItem(initial.id, { title: title.trim(), url: url.trim() || undefined, notes: notes.trim(), tags, platform: platform || undefined, creator: creator.trim() || undefined });
      toast.success('Swipe item updated');
    } else {
      addSwipeItem({ id: `swipe-${Date.now()}`, title: title.trim(), url: url.trim() || undefined, notes: notes.trim(), tags, platform: platform || undefined, creator: creator.trim() || undefined, savedAt: new Date().toISOString() });
      toast.success('Saved to swipe file');
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#18181c] border border-white/10 rounded-2xl p-5 w-[460px] space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{isEdit ? 'Edit item' : 'Add to swipe file'}</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <input autoFocus placeholder="Title / what it is…" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        <input placeholder="URL (optional)" value={url} onChange={e => setUrl(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        <div className="grid grid-cols-2 gap-3">
          <input placeholder="@creator" value={creator} onChange={e => setCreator(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
          <select value={platform} onChange={e => setPlatform(e.target.value as Platform | '')}
            className="bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none">
            <option value="">Platform…</option>
            {(['instagram','tiktok','youtube','twitter','linkedin'] as Platform[]).map(p => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>
        </div>

        <textarea placeholder="What made this work? What would you steal?" value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40 resize-none" />

        <input placeholder="Tags: hook, transition, b-roll…" value={tagInput} onChange={e => setTagInput(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
            {isEdit ? 'Save changes' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Link to idea modal ────────────────────────────────────────────────────────

function LinkIdeaModal({ item, onClose }: { item: SwipeItem; onClose: () => void }) {
  const { ideas, updateIdea } = useStore();
  const [search, setSearch] = useState('');

  const filtered = ideas.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  function link(idea: Idea) {
    const existing = idea.swipeRefs ?? [];
    if (existing.includes(item.id)) { toast.info('Already linked'); onClose(); return; }
    updateIdea(idea.id, { swipeRefs: [...existing, item.id] });
    toast.success(`Linked to "${idea.title.slice(0, 30)}"`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#18181c] border border-white/10 rounded-2xl p-4 w-[380px] space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Link to idea</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
        </div>
        <input autoFocus placeholder="Search ideas…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filtered.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">No ideas found</p>}
          {filtered.map(idea => (
            <button key={idea.id} onClick={() => link(idea)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left group">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              <span className="text-sm text-zinc-300 flex-1 truncate">{idea.title}</span>
              <span className="text-[10px] text-zinc-600 capitalize">{idea.status}</span>
              <Check className="w-3.5 h-3.5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ item, onEdit, onLink }: { item: SwipeItem; onEdit: () => void; onLink: () => void }) {
  const { deleteSwipeItem } = useStore();
  const og = useOG(item.url);
  const platformStyle = item.platform ? PLATFORM_STYLES[item.platform] : null;

  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl overflow-hidden group hover:border-white/[0.14] hover:shadow-lg hover:shadow-black/30 transition-all flex flex-col">
      {/* OG image */}
      {item.url && (
        <div className="relative h-36 bg-white/[0.03] shrink-0 overflow-hidden">
          {og?.image ? (
            <img src={og.image} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-zinc-800" />
            </div>
          )}
          {/* Overlay actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ExternalLink className="w-3.5 h-3.5 text-white" />
            </a>
            <button onClick={onEdit}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Edit3 className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={onLink}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={() => { deleteSwipeItem(item.id); toast.success('Removed from swipe file'); }}
              className="w-8 h-8 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-500/30 flex items-center justify-center hover:bg-red-500/40 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
          {/* Domain badge */}
          {og?.favicon && og?.domain && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
              <img src={og.favicon} alt="" className="w-3 h-3 rounded-sm" />
              <span className="text-[10px] text-zinc-400">{og.domain}</span>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-3.5 flex-1 flex flex-col gap-2 min-h-0">
        <div className="flex items-start gap-2">
          {!item.url && (
            <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Bookmark className="w-3 h-3 text-violet-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{item.title}</p>
            {item.creator && <p className="text-[10px] text-zinc-600 mt-0.5">@{item.creator}</p>}
          </div>
          {/* Actions (no-URL cards) */}
          {!item.url && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={onEdit} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={onLink} className="text-zinc-600 hover:text-violet-400 transition-colors"><Lightbulb className="w-3.5 h-3.5" /></button>
              <button onClick={() => { deleteSwipeItem(item.id); toast.success('Removed'); }} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        {item.notes && (
          <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3 flex-1">{item.notes}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-auto pt-1">
          {platformStyle && item.platform && (
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border capitalize', platformStyle.pill)}>
              {item.platform}
            </span>
          )}
          {item.tags.slice(0, 4).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.07] text-zinc-500">
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[10px] text-zinc-700">+{item.tags.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function ListRow({ item, onEdit, onLink }: { item: SwipeItem; onEdit: () => void; onLink: () => void }) {
  const { deleteSwipeItem } = useStore();
  const og = useOG(item.url);
  const platformStyle = item.platform ? PLATFORM_STYLES[item.platform] : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#15151a] border border-white/[0.07] group hover:border-white/[0.12] transition-all">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.07] shrink-0 flex items-center justify-center">
        {og?.image ? (
          <img src={og.image} alt="" className="w-full h-full object-cover" loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <Bookmark className="w-4 h-4 text-zinc-700" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{item.title}</span>
          {item.creator && <span className="text-xs text-zinc-600 shrink-0">@{item.creator}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {platformStyle && item.platform && (
            <span className={cn('px-1.5 py-px rounded-full text-[10px] border capitalize', platformStyle.pill)}>{item.platform}</span>
          )}
          {item.tags.slice(0, 5).map(t => (
            <span key={t} className="text-[10px] text-zinc-600 bg-white/[0.04] px-1.5 py-px rounded border border-white/[0.07]">{t}</span>
          ))}
          {og?.domain && (
            <span className="text-[10px] text-zinc-700">{og.domain}</span>
          )}
        </div>
      </div>

      {/* Notes preview */}
      {item.notes && (
        <p className="hidden lg:block text-xs text-zinc-600 max-w-[240px] truncate shrink-0">{item.notes}</p>
      )}

      {/* Date */}
      <span className="text-[10px] text-zinc-700 shrink-0">{new Date(item.savedAt).toLocaleDateString()}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-white/[0.04] transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.04] transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onLink} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-white/[0.04] transition-colors">
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { deleteSwipeItem(item.id); toast.success('Removed'); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-white/[0.04] transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Tag filter bar ────────────────────────────────────────────────────────────

function TagFilterBar({ items, active, onToggle }: {
  items: SwipeItem[];
  active: Set<string>;
  onToggle: (tag: string) => void;
}) {
  const allTags = Array.from(new Set(items.flatMap(i => i.tags))).sort();
  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {allTags.map(tag => (
        <button key={tag} onClick={() => onToggle(tag)}
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[11px] border transition-all',
            active.has(tag)
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
              : 'bg-white/[0.03] text-zinc-600 border-white/[0.07] hover:text-zinc-400 hover:border-white/[0.12]'
          )}>
          {tag}
        </button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SwipeView() {
  const { swipeItems } = useStore();
  const [showAdd,       setShowAdd]       = useState(false);
  const [editItem,      setEditItem]      = useState<SwipeItem | null>(null);
  const [linkItem,      setLinkItem]      = useState<SwipeItem | null>(null);
  const [search,        setSearch]        = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [activeTags,    setActiveTags]    = useState<Set<string>>(new Set());
  const [viewMode,      setViewMode]      = useState<'grid' | 'list'>('grid');
  const [showTagBar,    setShowTagBar]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }, []);

  const filtered = swipeItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !search || [item.title, item.notes, item.creator, ...item.tags]
      .some(s => s?.toLowerCase().includes(q));
    const matchPlatform = platformFilter === 'all' || item.platform === platformFilter;
    const matchTags = activeTags.size === 0 || item.tags.some(t => activeTags.has(t));
    return matchSearch && matchPlatform && matchTags;
  });

  // All unique tags from currently visible items
  const allTags = Array.from(new Set(swipeItems.flatMap(i => i.tags))).sort();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Swipe File</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {swipeItems.length} saved · {filtered.length !== swipeItems.length ? `${filtered.length} shown · ` : ''}inspiration &amp; references
            </p>
          </div>
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.07]">
            <button onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-400')}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-400')}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Search + platform filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              ref={searchRef}
              placeholder="Search… ( / )"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-52 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500/30"
            />
          </div>

          <div className="flex gap-0.5">
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize',
                  platformFilter === p ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-600 hover:text-zinc-300')}>
                {p}
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <button
              onClick={() => setShowTagBar(s => !s)}
              className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1',
                (showTagBar || activeTags.size > 0) ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-600 hover:text-zinc-300')}>
              Tags
              {activeTags.size > 0 && <span className="bg-violet-500 text-white rounded-full w-3.5 h-3.5 text-[9px] flex items-center justify-center">{activeTags.size}</span>}
            </button>
          )}

          {activeTags.size > 0 && (
            <button onClick={() => setActiveTags(new Set())} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {/* Tag filter bar */}
        {showTagBar && (
          <TagFilterBar items={swipeItems} active={activeTags} onToggle={toggleTag} />
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-5">
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
                {swipeItems.length === 0
                  ? 'Save content that inspires you — press C anywhere'
                  : 'Try adjusting your filters'}
              </div>
            </div>
            {swipeItems.length === 0 && (
              <button onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                Add first item
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(item => (
              <GridCard key={item.id} item={item}
                onEdit={() => setEditItem(item)}
                onLink={() => setLinkItem(item)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <ListRow key={item.id} item={item}
                onEdit={() => setEditItem(item)}
                onLink={() => setLinkItem(item)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAdd    && <SwipeModal onClose={() => setShowAdd(false)} />}
      {editItem   && <SwipeModal initial={editItem} onClose={() => setEditItem(null)} />}
      {linkItem   && <LinkIdeaModal item={linkItem} onClose={() => setLinkItem(null)} />}
    </div>
  );
}
