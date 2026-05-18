'use client';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import {
  Plus, Trash2, Check, Flame, FileText, Film, Bookmark,
  ExternalLink, X, ChevronRight, Clock, Hash, Target,
  Square, Link2, ArrowRight, Search, BookOpen, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Idea, Platform, FormatType, IdeaTalkingPoint, IdeaChecklistItem, Script,
} from '@/types';

// ── constants ──────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<FormatType, string> = {
  short: 'Short', long: 'Long', reel: 'Reel',
  story: 'Story', live: 'Live', other: 'Other',
};

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  tiktok:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  youtube:   'bg-red-500/15 text-red-400 border-red-500/20',
  twitter:   'bg-sky-500/15 text-sky-400 border-sky-500/20',
  linkedin:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  other:     'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

// chars per platform for caption counter
const CAPTION_LIMITS: Record<string, number> = {
  instagram: 2200, tiktok: 2200, youtube: 5000,
  twitter: 280, linkedin: 3000, other: 2200,
};

// ── helpers ────────────────────────────────────────────────────────────────────

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label, color = 'text-zinc-500' }: {
  icon: React.ElementType; label: string; color?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}

// ── Talking Points ─────────────────────────────────────────────────────────────

function TalkingPointsSection({ idea }: { idea: Idea }) {
  const { updateIdea } = useStore();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const points = idea.talkingPoints ?? [];

  function add() {
    const text = draft.trim();
    if (!text) return;
    updateIdea(idea.id, {
      talkingPoints: [...points, { id: uid(), text }],
    });
    setDraft('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function updatePoint(id: string, text: string) {
    updateIdea(idea.id, {
      talkingPoints: points.map(p => p.id === id ? { ...p, text } : p),
    });
  }

  function removePoint(id: string) {
    updateIdea(idea.id, {
      talkingPoints: points.filter(p => p.id !== id),
    });
  }

  return (
    <div className="space-y-2">
      <SectionLabel icon={Target} label="Talking Points" color="text-violet-400" />
      <div className="space-y-1.5">
        {points.map((p, idx) => (
          <div key={p.id} className="flex items-start gap-2.5 group">
            <span className="w-5 h-5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold
                             flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <input
              value={p.text}
              onChange={e => updatePoint(p.id, e.target.value)}
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700
                         outline-none border-b border-transparent focus:border-white/[0.10] py-0.5"
            />
            <button
              onClick={() => removePoint(p.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400
                         transition-all shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full border border-dashed border-white/[0.12]
                         text-zinc-700 text-[10px] font-bold flex items-center justify-center shrink-0">
          {points.length + 1}
        </span>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add talking point…"
          className="flex-1 bg-transparent text-sm text-zinc-500 placeholder:text-zinc-700
                     outline-none border-b border-transparent focus:border-white/[0.10] py-0.5
                     focus:text-zinc-200"
        />
        {draft.trim() && (
          <button onClick={add} className="text-violet-400 hover:text-violet-300 transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shoot Checklist ────────────────────────────────────────────────────────────

const DEFAULT_CHECKLIST: Omit<IdeaChecklistItem, 'id'>[] = [
  { text: 'Location / backdrop ready',   done: false },
  { text: 'Lighting set up',              done: false },
  { text: 'Outfit / look prepared',       done: false },
  { text: 'Props ready',                  done: false },
  { text: 'Script memorised / printed',   done: false },
];

function ChecklistSection({ idea }: { idea: Idea }) {
  const { updateIdea } = useStore();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const items = idea.shootChecklist ?? [];

  function seedDefaults() {
    updateIdea(idea.id, {
      shootChecklist: DEFAULT_CHECKLIST.map(d => ({ ...d, id: uid() })),
    });
  }

  function toggle(id: string) {
    updateIdea(idea.id, {
      shootChecklist: items.map(i => i.id === id ? { ...i, done: !i.done } : i),
    });
  }

  function updateText(id: string, text: string) {
    updateIdea(idea.id, {
      shootChecklist: items.map(i => i.id === id ? { ...i, text } : i),
    });
  }

  function removeItem(id: string) {
    updateIdea(idea.id, {
      shootChecklist: items.filter(i => i.id !== id),
    });
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    updateIdea(idea.id, {
      shootChecklist: [...items, { id: uid(), text, done: false }],
    });
    setDraft('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const doneCount = items.filter(i => i.done).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <SectionLabel icon={Check} label="Shoot Checklist" color="text-emerald-400" />
        {items.length > 0 && (
          <span className="text-[10px] text-zinc-600 ml-auto">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <button
          onClick={seedDefaults}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed
                     border-white/[0.08] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.16]
                     text-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add shoot checklist — or use defaults
        </button>
      ) : (
        <>
          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
            />
          </div>

          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 group">
                <button
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                    item.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-white/20 hover:border-emerald-400'
                  )}
                >
                  {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <input
                  value={item.text}
                  onChange={e => updateText(item.id, e.target.value)}
                  className={cn(
                    'flex-1 bg-transparent text-sm outline-none border-b border-transparent',
                    'focus:border-white/[0.10] py-0.5',
                    item.done ? 'text-zinc-600 line-through' : 'text-zinc-300'
                  )}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add item input */}
      {items.length > 0 && (
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded border border-dashed border-white/[0.12] shrink-0" />
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add item…"
            className="flex-1 bg-transparent text-sm text-zinc-500 placeholder:text-zinc-700
                       outline-none border-b border-transparent focus:border-white/[0.10] py-0.5
                       focus:text-zinc-200"
          />
          {draft.trim() && (
            <button onClick={add} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Caption section ────────────────────────────────────────────────────────────

function CaptionSection({ idea }: { idea: Idea }) {
  const { updateIdea } = useStore();
  const caption = idea.caption ?? '';
  const limit   = CAPTION_LIMITS[idea.platform ?? 'other'] ?? 2200;
  const over    = caption.length > limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <SectionLabel icon={Pencil} label="Caption" color="text-sky-400" />
        <span className={cn('ml-auto text-[10px]', over ? 'text-red-400 font-medium' : 'text-zinc-600')}>
          {caption.length.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <textarea
        value={caption}
        onChange={e => updateIdea(idea.id, { caption: e.target.value })}
        placeholder="Write your caption here… pull in your hook, tease the value, end with a CTA."
        rows={5}
        className={cn(
          'w-full bg-white/[0.03] border rounded-xl px-3 py-2.5 text-sm placeholder:text-zinc-700',
          'outline-none resize-none leading-relaxed transition-colors',
          over
            ? 'border-red-500/30 text-red-200'
            : 'border-white/[0.07] text-zinc-300 focus:border-sky-500/30'
        )}
      />
      {over && (
        <p className="text-[11px] text-red-400">
          {(caption.length - limit).toLocaleString()} characters over limit for {idea.platform ?? 'this platform'}
        </p>
      )}
    </div>
  );
}

// ── Hashtags section ───────────────────────────────────────────────────────────

function HashtagsSection({ idea }: { idea: Idea }) {
  const { updateIdea } = useStore();
  const [draft, setDraft] = useState('');
  const tags = idea.hashtags ?? [];

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      updateIdea(idea.id, { hashtags: [...tags, t] });
    }
    setDraft('');
  }

  function removeTag(t: string) {
    updateIdea(idea.id, { hashtags: tags.filter(x => x !== t) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <SectionLabel icon={Hash} label="Hashtags" color="text-amber-400" />
        {tags.length > 0 && (
          <span className="ml-auto text-[10px] text-zinc-600">{tags.length} tag{tags.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className={cn(
        'flex flex-wrap items-center gap-1.5 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2',
        'focus-within:border-amber-500/30 transition-colors min-h-[44px]'
      )}>
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-md
                                   bg-amber-500/10 text-amber-300 text-[11px] font-medium border border-amber-500/15">
            #{t}
            <button onClick={() => removeTag(t)} className="text-amber-500/60 hover:text-red-400 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(draft); }
            if (e.key === 'Backspace' && !draft)    removeTag(tags[tags.length - 1]);
          }}
          placeholder={tags.length === 0 ? '#hashtag — press Enter to add' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-300
                     placeholder:text-zinc-700 outline-none"
        />
      </div>
      {tags.length > 0 && (
        <button
          onClick={() => {
            const text = tags.map(t => `#${t}`).join(' ');
            navigator.clipboard.writeText(text).catch(() => {});
          }}
          className="text-[11px] text-zinc-600 hover:text-amber-400 transition-colors"
        >
          Copy all hashtags
        </button>
      )}
    </div>
  );
}

// ── References section ─────────────────────────────────────────────────────────

function ReferencesSection({ idea }: { idea: Idea }) {
  const { swipeItems, updateIdea, setActiveView, setActiveWorkspace } = useStore();
  const [picking, setPicking] = useState(false);
  const [search, setSearch]   = useState('');

  const refs     = (idea.swipeRefs ?? []).map(id => swipeItems.find(s => s.id === id)).filter(Boolean) as typeof swipeItems;
  const unlinked = swipeItems.filter(s => !(idea.swipeRefs ?? []).includes(s.id));
  const filtered = unlinked.filter(s =>
    !search || [s.title, s.notes, s.creator, ...(s.tags ?? [])].some(t => t?.toLowerCase().includes(search.toLowerCase()))
  );

  function addRef(id: string) {
    updateIdea(idea.id, { swipeRefs: [...(idea.swipeRefs ?? []), id] });
    setPicking(false);
    setSearch('');
  }

  function removeRef(id: string) {
    updateIdea(idea.id, { swipeRefs: (idea.swipeRefs ?? []).filter(x => x !== id) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <SectionLabel icon={Bookmark} label="References / Inspiration" color="text-violet-400" />
        <button
          onClick={() => { setActiveWorkspace('ideas'); setActiveView('swipe'); }}
          className="ml-auto text-[10px] text-zinc-700 hover:text-violet-400 transition-colors"
        >
          Open swipe file ↗
        </button>
      </div>

      {refs.length > 0 && (
        <div className="space-y-1.5">
          {refs.map(item => (
            <div key={item.id}
                 className="flex items-start gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
              <Bookmark className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-200 truncate">{item.title}</div>
                {item.notes && (
                  <p className="text-[10px] text-zinc-600 line-clamp-2 mt-0.5 leading-snug">{item.notes}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {item.platform && <span className="text-[9px] text-zinc-700 capitalize">{item.platform}</span>}
                  {item.creator  && <span className="text-[9px] text-zinc-700">@{item.creator}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                     className="text-zinc-700 hover:text-blue-400 transition-colors"
                     onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button onClick={() => removeRef(item.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => { setPicking(p => !p); setSearch(''); }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
          picking
            ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
            : 'border-dashed border-white/[0.08] text-zinc-600 hover:border-white/[0.16] hover:text-zinc-400'
        )}
      >
        <Plus className="w-3 h-3" />
        {refs.length === 0 ? 'Link inspiration from swipe file' : 'Add another reference'}
      </button>

      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.07] bg-[#15151a] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
                <Search className="w-3 h-3 text-zinc-600 shrink-0" />
                <input autoFocus placeholder="Search swipe file…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 outline-none" />
              </div>
              <div className="max-h-44 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-zinc-700 text-center">
                    {swipeItems.length === 0 ? 'No swipe items yet.' : 'All items linked or nothing matches.'}
                  </div>
                ) : filtered.map(item => (
                  <button key={item.id} onClick={() => addRef(item.id)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left
                               hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0">
                    <Bookmark className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-300 truncate">{item.title}</div>
                      {item.notes && (
                        <p className="text-[10px] text-zinc-600 line-clamp-1 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Links section ──────────────────────────────────────────────────────────────

function LinksSection({ idea }: { idea: Idea }) {
  const { scripts, videos, addScript, updateIdea, setActiveScriptId, setActiveView, setActiveWorkspace } = useStore();
  const [pickingVideo, setPickingVideo] = useState(false);

  const linkedScript = scripts.find(s => s.id === idea.scriptId);
  const linkedVideo  = videos.find(v => v.id === idea.linkedVideoId);

  function createScript() {
    const newScript: Script = {
      id:        `script-${Date.now()}`,
      ideaId:    idea.id,
      title:     idea.title,
      sections: [
        { id: uid(), type: 'hook',   label: 'Hook',   content: idea.hook ?? '' },
        { id: uid(), type: 'build',  label: 'Build',  content: '' },
        { id: uid(), type: 'payoff', label: 'Payoff', content: '' },
        { id: uid(), type: 'cta',    label: 'CTA',    content: '' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addScript(newScript);
    updateIdea(idea.id, { scriptId: newScript.id });
    setActiveScriptId(newScript.id);
    setActiveWorkspace('ideas');
    setActiveView('script');
  }

  function openScript() {
    if (!linkedScript) return;
    setActiveScriptId(linkedScript.id);
    setActiveWorkspace('ideas');
    setActiveView('script');
  }

  return (
    <div className="space-y-3">
      <SectionLabel icon={Link2} label="Linked content" color="text-zinc-400" />

      {/* Script */}
      {linkedScript ? (
        <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
          <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="flex-1 text-xs font-medium text-zinc-200 truncate">{linkedScript.title}</span>
          <button onClick={openScript}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
            Open <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button onClick={createScript}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 border
                     border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/15 transition-all group">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Write script — pre-fills your hook</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Video */}
      {linkedVideo ? (
        <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
          <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-200 truncate">{linkedVideo.title}</div>
            <div className="text-[10px] text-zinc-600">{fmt(linkedVideo.metrics.views)} views · {linkedVideo.metrics.retention}% retention</div>
          </div>
          <button onClick={() => updateIdea(idea.id, { linkedVideoId: undefined })}
            className="text-zinc-700 hover:text-red-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button onClick={() => setPickingVideo(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border
                       border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/15 transition-all group">
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Link to a published video</span>
            <ChevronRight className={cn('w-3.5 h-3.5 opacity-50 transition-transform', pickingVideo && 'rotate-90')} />
          </button>
          <AnimatePresence>
            {pickingVideo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-white/[0.07] bg-[#15151a] max-h-44 overflow-y-auto">
                  {videos.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-zinc-700 text-center">
                      No videos in library yet.
                    </div>
                  ) : videos.map(v => (
                    <button key={v.id}
                      onClick={() => { updateIdea(idea.id, { linkedVideoId: v.id }); setPickingVideo(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                                 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0">
                      <Film className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-zinc-300 truncate">{v.title}</div>
                        <div className="text-[10px] text-zinc-600 capitalize">{v.platform} · {v.duration}s</div>
                      </div>
                      <div className="text-[10px] text-zinc-600">{fmt(v.metrics.views)}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ── Brief list item ────────────────────────────────────────────────────────────

function BriefListItem({
  idea, active, onClick,
}: { idea: Idea; active: boolean; onClick: () => void }) {
  const { ideaColumns } = useStore();
  const col = ideaColumns.find(c => c.id === idea.status);
  const dotColor = col?.color ?? '#71717a';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 transition-colors border-l-2',
        active
          ? 'bg-white/[0.06] border-violet-500 text-white'
          : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="text-xs font-medium line-clamp-1 flex-1">{idea.title}</span>
      </div>
      <div className="flex items-center gap-2 pl-3 text-[10px] text-zinc-700">
        {idea.platform && <span className="capitalize">{idea.platform}</span>}
        {idea.scheduledDate && (
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {idea.scheduledDate}
          </span>
        )}
        {!idea.platform && !idea.scheduledDate && (
          <span className="capitalize">{col?.label ?? idea.status}</span>
        )}
      </div>
    </button>
  );
}

// ── Brief editor ───────────────────────────────────────────────────────────────

function BriefEditor({ idea }: { idea: Idea }) {
  const { updateIdea, ideaColumns } = useStore();

  const platformColor = idea.platform ? PLATFORM_COLORS[idea.platform] : null;
  const col = ideaColumns.find(c => c.id === idea.status);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-6 space-y-8">

        {/* ── Header ── */}
        <div className="space-y-3">
          <input
            value={idea.title}
            onChange={e => updateIdea(idea.id, { title: e.target.value })}
            className="w-full text-xl font-bold text-white bg-transparent outline-none
                       border-b border-white/[0.07] pb-2 placeholder:text-zinc-700"
            placeholder="Brief title…"
          />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium"
                 style={col ? { borderColor: `${col.color}40`, backgroundColor: `${col.color}15`, color: col.color } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col?.color ?? '#71717a' }} />
              {col?.label ?? idea.status}
            </div>

            {/* Platform */}
            {platformColor && (
              <span className={cn('px-2.5 py-1 rounded-full border text-[11px] font-medium capitalize', platformColor)}>
                {idea.platform}
              </span>
            )}

            {/* Format */}
            {idea.formatType && (
              <span className="px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] text-zinc-400">
                {FORMAT_LABELS[idea.formatType]}
              </span>
            )}

            {/* Date */}
            {idea.scheduledDate && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-500/20
                               bg-emerald-500/10 text-[11px] text-emerald-400">
                <Clock className="w-2.5 h-2.5" />
                {idea.scheduledDate}
              </span>
            )}

            {/* Inline selectors */}
            <div className="flex items-center gap-1.5 ml-auto">
              <select
                value={idea.platform ?? ''}
                onChange={e => updateIdea(idea.id, { platform: (e.target.value as Platform) || undefined })}
                className="bg-transparent text-[11px] text-zinc-600 outline-none cursor-pointer hover:text-zinc-400"
              >
                <option value="">Platform —</option>
                {(['instagram','tiktok','youtube','twitter','linkedin','other'] as Platform[]).map(p => (
                  <option key={p} value={p} className="capitalize bg-[#18181c]">{p}</option>
                ))}
              </select>
              <select
                value={idea.formatType ?? ''}
                onChange={e => updateIdea(idea.id, { formatType: (e.target.value as FormatType) || undefined })}
                className="bg-transparent text-[11px] text-zinc-600 outline-none cursor-pointer hover:text-zinc-400"
              >
                <option value="">Format —</option>
                {(Object.entries(FORMAT_LABELS) as [FormatType, string][]).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#18181c]">{v}</option>
                ))}
              </select>
              <input
                type="date"
                value={idea.scheduledDate ?? ''}
                onChange={e => updateIdea(idea.id, { scheduledDate: e.target.value || undefined })}
                className="bg-transparent text-[11px] text-zinc-600 outline-none cursor-pointer hover:text-zinc-400"
              />
            </div>
          </div>

          {/* Status pipeline */}
          <div className="flex items-center gap-1 flex-wrap pt-1">
            {ideaColumns.map((c, idx) => {
              const currentIdx = ideaColumns.findIndex(x => x.id === idea.status);
              const done   = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <button key={c.id} onClick={() => updateIdea(idea.id, { status: c.id })}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all border"
                  style={active ? { borderColor: c.color, backgroundColor: `${c.color}20`, color: c.color } : {}}
                  title={`Set to ${c.label}`}>
                  {done && <Check className="w-2 h-2" style={{ color: c.color }} />}
                  {!done && !active && <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
                  {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />}
                  <span className={cn(!active && !done ? 'text-zinc-600' : '')}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-white/[0.05]" />

        {/* ── Hook ── */}
        <div className="space-y-2">
          <SectionLabel icon={Flame} label="Hook" color="text-orange-400" />
          <textarea
            value={idea.hook}
            onChange={e => updateIdea(idea.id, { hook: e.target.value })}
            placeholder="The first line that stops someone mid-scroll. Make it punchy, specific, visual."
            rows={2}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5
                       text-sm text-white placeholder:text-zinc-700 outline-none
                       focus:border-orange-500/30 resize-none leading-relaxed"
          />
        </div>

        {/* ── Concept ── */}
        <div className="space-y-2">
          <SectionLabel icon={BookOpen} label="Concept & Notes" color="text-zinc-400" />
          <textarea
            value={idea.body}
            onChange={e => updateIdea(idea.id, { body: e.target.value })}
            placeholder="What's this video really about? Who is it for? What's the one thing they walk away with?"
            rows={5}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5
                       text-sm text-zinc-300 placeholder:text-zinc-700 outline-none
                       focus:border-white/[0.15] resize-none leading-relaxed"
          />
        </div>

        {/* ── Talking Points ── */}
        <TalkingPointsSection idea={idea} />

        {/* ── Shoot Checklist ── */}
        <ChecklistSection idea={idea} />

        {/* ── Caption ── */}
        <CaptionSection idea={idea} />

        {/* ── Hashtags ── */}
        <HashtagsSection idea={idea} />

        {/* ── References ── */}
        <ReferencesSection idea={idea} />

        {/* ── Links ── */}
        <LinksSection idea={idea} />

        {/* ── Bottom space ── */}
        <div className="h-8" />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function BriefsView() {
  const { ideas, ideaColumns, addIdea, deleteIdea, activeProjectId } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(ideas[0]?.id ?? null);
  const [filter, setFilter]         = useState<string>('all');
  const [search, setSearch]         = useState('');

  const FILTERS = [
    { id: 'all', label: 'All' },
    ...ideaColumns.map(c => ({ id: c.id, label: c.label })),
  ];

  const filtered = ideas
    .filter(i => filter === 'all' || i.status === filter)
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()));

  const selectedIdea = ideas.find(i => i.id === selectedId);

  function createNew() {
    const idea: Idea = {
      id:         `idea-${Date.now()}`,
      projectId:  activeProjectId ?? 'proj-1',
      title:      'New brief',
      hook:       '',
      body:       '',
      status:     ideaColumns[0]?.id ?? 'draft',
      tags:       [],
      createdAt:  new Date().toISOString(),
    };
    addIdea(idea);
    setSelectedId(idea.id);
  }

  // If selected idea got deleted or filtered out, clear selection
  useEffect(() => {
    if (selectedId && !ideas.find(i => i.id === selectedId)) {
      setSelectedId(ideas[0]?.id ?? null);
    }
  }, [ideas, selectedId]);

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left list panel ── */}
      <div className="w-[240px] shrink-0 border-r border-white/[0.06] flex flex-col bg-[#111114]">

        {/* Header */}
        <div className="px-3 py-3 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Briefs</span>
            <button onClick={createNew}
              className="w-5 h-5 flex items-center justify-center rounded text-zinc-500
                         hover:text-violet-400 hover:bg-white/[0.06] transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-700" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-6 pr-2 py-1.5
                         text-xs text-zinc-300 placeholder:text-zinc-700 outline-none"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 px-2 py-2 border-b border-white/[0.04]">
          {FILTERS.slice(0, 4).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                filter === f.id ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-600 hover:text-zinc-400')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-xs text-zinc-700">
                {search ? 'No matches' : 'No briefs yet'}
              </div>
              {!search && (
                <button onClick={createNew}
                  className="mt-2 text-[11px] text-violet-500 hover:text-violet-400 transition-colors">
                  Create one →
                </button>
              )}
            </div>
          ) : (
            filtered.map(idea => (
              <BriefListItem
                key={idea.id}
                idea={idea}
                active={selectedId === idea.id}
                onClick={() => setSelectedId(idea.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right editor ── */}
      {selectedIdea ? (
        <BriefEditor idea={selectedIdea} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07]
                          flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-400">No brief selected</div>
            <div className="text-xs text-zinc-600 mt-1">
              Select a brief from the list or create a new one
            </div>
          </div>
          <button onClick={createNew}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500
                       text-white text-sm font-medium transition-colors">
            New brief
          </button>
        </div>
      )}
    </div>
  );
}
