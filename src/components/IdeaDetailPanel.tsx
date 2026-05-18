'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import {
  X, FileText, Film, ChevronRight, Check,
  Clock, Globe, Flame, Pencil, Trash2, Link2, BarChart2,
  ArrowRight, Plus, ExternalLink, Bookmark, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Idea, Platform, FormatType, Script, ScriptSection } from '@/types';

// ── helpers ───────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<FormatType, string> = {
  short: 'Short', long: 'Long', reel: 'Reel',
  story: 'Story', live: 'Live', other: 'Other',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Status pipeline ───────────────────────────────────────────────────────────

function StatusPipeline({ idea }: { idea: Idea }) {
  const { ideaColumns, updateIdea } = useStore();
  const currentIdx = ideaColumns.findIndex(c => c.id === idea.status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 shrink-0">
      {ideaColumns.map((col, idx) => {
        const done   = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <button
            key={col.id}
            onClick={() => updateIdea(idea.id, { status: col.id })}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-full',
              'transition-all whitespace-nowrap border',
              active
                ? 'text-white border-opacity-50'
                : done
                  ? 'text-zinc-400 border-transparent hover:border-white/10'
                  : 'text-zinc-600 border-transparent hover:border-white/10'
            )}
            style={active ? { borderColor: col.color, backgroundColor: `${col.color}20`, color: col.color } : {}}
            title={`Set status to ${col.label}`}
          >
            {done && <Check className="w-2.5 h-2.5" style={{ color: col.color }} />}
            {!done && !active && (
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            )}
            {active && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
            )}
            {col.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Script section ────────────────────────────────────────────────────────────

function ScriptSection({ idea }: { idea: Idea }) {
  const { scripts, addScript, updateIdea, setActiveScriptId, setActiveView, setActiveWorkspace } = useStore();

  const linkedScript = scripts.find(s => s.id === idea.scriptId);

  function createAndOpenScript() {
    const sections: ScriptSection[] = [
      { id: `sec-${Date.now()}-1`, type: 'hook',   label: 'Hook',   content: idea.hook ?? '' },
      { id: `sec-${Date.now()}-2`, type: 'build',  label: 'Build',  content: '' },
      { id: `sec-${Date.now()}-3`, type: 'payoff', label: 'Payoff', content: '' },
      { id: `sec-${Date.now()}-4`, type: 'cta',    label: 'CTA',    content: '' },
    ];
    const newScript: Script = {
      id:        `script-${Date.now()}`,
      ideaId:    idea.id,
      title:     idea.title,
      sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addScript(newScript);
    updateIdea(idea.id, { scriptId: newScript.id, status: idea.status === 'draft' ? 'scripting' : idea.status });
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

  const totalWords = linkedScript
    ? linkedScript.sections.reduce((s, sec) => s + sec.content.trim().split(/\s+/).filter(Boolean).length, 0)
    : 0;
  const estSecs = Math.round((totalWords / 130) * 60);

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
        <FileText className="w-3 h-3" />
        Script
      </div>

      {!linkedScript ? (
        <button
          onClick={createAndOpenScript}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-xl
                     bg-violet-600/10 border border-violet-500/20
                     text-violet-400 text-xs font-medium
                     hover:bg-violet-600/20 hover:border-violet-500/40 transition-all group"
        >
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <div className="text-left flex-1">
            <div className="font-semibold">Write script</div>
            <div className="text-[10px] text-violet-500 mt-0.5">
              Creates a script pre-filled with your hook · auto-links to this idea
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {/* Script header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
            <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="flex-1 text-xs font-medium text-zinc-200 truncate">{linkedScript.title}</span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
              <Clock className="w-3 h-3" />
              ~{estSecs}s
            </div>
          </div>
          {/* Section previews */}
          <div className="px-3 py-2 space-y-1">
            {linkedScript.sections.slice(0, 3).map(sec => (
              <div key={sec.id} className="flex items-start gap-2">
                <span className="text-[9px] font-medium text-zinc-600 uppercase w-10 shrink-0 pt-0.5">{sec.type}</span>
                <p className="text-[11px] text-zinc-500 line-clamp-1 flex-1">
                  {sec.content || <span className="italic text-zinc-700">empty</span>}
                </p>
              </div>
            ))}
            {linkedScript.sections.length > 3 && (
              <div className="text-[10px] text-zinc-700">+{linkedScript.sections.length - 3} more sections</div>
            )}
          </div>
          {/* Open button */}
          <button
            onClick={openScript}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-violet-400
                       hover:bg-violet-500/10 transition-colors border-t border-white/[0.05]"
          >
            Open in Script editor
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Video section ─────────────────────────────────────────────────────────────

function VideoSection({ idea }: { idea: Idea }) {
  const { videos, updateIdea, setActiveVideo } = useStore();
  const [picking, setPicking] = useState(false);

  const linkedVideo = videos.find(v => v.id === idea.linkedVideoId);

  function linkVideo(videoId: string) {
    updateIdea(idea.id, { linkedVideoId: videoId, status: 'published' });
    setPicking(false);
  }

  function openInIntelligence() {
    if (!linkedVideo) return;
    setActiveVideo(linkedVideo.id);
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
        <Film className="w-3 h-3" />
        Video
      </div>

      {!linkedVideo ? (
        <>
          <button
            onClick={() => setPicking(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-3 rounded-xl
                       bg-amber-500/10 border border-amber-500/20
                       text-amber-400 text-xs font-medium
                       hover:bg-amber-500/20 hover:border-amber-500/30 transition-all group"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">Link to video</div>
              <div className="text-[10px] text-amber-600 mt-0.5">
                Connect this idea to a video in your library
              </div>
            </div>
            <ChevronRight className={cn('w-3.5 h-3.5 opacity-60 transition-transform', picking && 'rotate-90')} />
          </button>

          <AnimatePresence>
            {picking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-white/[0.07] bg-[#15151a] overflow-hidden max-h-52 overflow-y-auto">
                  {videos.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-zinc-600 text-center">
                      No videos in library yet.<br />Upload one in Intelligence → Library.
                    </div>
                  ) : (
                    videos.map(v => (
                      <button
                        key={v.id}
                        onClick={() => linkVideo(v.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                                   hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07]
                                        flex items-center justify-center shrink-0">
                          <Film className="w-3.5 h-3.5 text-zinc-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-zinc-200 truncate">{v.title}</div>
                          <div className="text-[10px] text-zinc-600 capitalize">{v.platform} · {v.duration}s</div>
                        </div>
                        <div className="text-[10px] text-zinc-600">{fmt(v.metrics.views)} views</div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/[0.05]">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15
                            flex items-center justify-center shrink-0">
              <Film className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{linkedVideo.title}</div>
              <div className="text-[10px] text-zinc-500 capitalize">{linkedVideo.platform} · {linkedVideo.duration}s</div>
            </div>
            <button
              onClick={() => updateIdea(idea.id, { linkedVideoId: undefined })}
              className="text-zinc-700 hover:text-red-400 transition-colors"
              title="Unlink video"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-white/[0.05]">
            {[
              { label: 'Views',     value: fmt(linkedVideo.metrics.views) },
              { label: 'Retention', value: `${linkedVideo.metrics.retention}%` },
              { label: 'Saves',     value: fmt(linkedVideo.metrics.saves) },
            ].map(({ label, value }) => (
              <div key={label} className="px-3 py-2 text-center">
                <div className="text-xs font-bold text-white">{value}</div>
                <div className="text-[9px] text-zinc-600">{label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={openInIntelligence}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-400
                       hover:bg-white/[0.04] hover:text-white transition-colors border-t border-white/[0.05]"
          >
            Open in Intelligence
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Inspiration / swipe refs ──────────────────────────────────────────────────

function InspirationSection({ idea }: { idea: Idea }) {
  const { swipeItems, updateIdea, setActiveView, setActiveWorkspace } = useStore();
  const [picking, setPicking] = useState(false);
  const [search,  setSearch]  = useState('');

  const refs = (idea.swipeRefs ?? [])
    .map(id => swipeItems.find(s => s.id === id))
    .filter(Boolean) as typeof swipeItems;

  const unlinked = swipeItems.filter(s => !(idea.swipeRefs ?? []).includes(s.id));
  const filtered = unlinked.filter(s =>
    !search || [s.title, s.notes, s.creator, ...(s.tags ?? [])].some(t => t?.toLowerCase().includes(search.toLowerCase()))
  );

  function addRef(swipeId: string) {
    updateIdea(idea.id, { swipeRefs: [...(idea.swipeRefs ?? []), swipeId] });
  }
  function removeRef(swipeId: string) {
    updateIdea(idea.id, { swipeRefs: (idea.swipeRefs ?? []).filter(id => id !== swipeId) });
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
        <Bookmark className="w-3 h-3 text-violet-400" />
        Inspired by
        <button
          onClick={() => { setActiveWorkspace('ideas'); setActiveView('swipe'); }}
          className="ml-auto text-[10px] text-zinc-700 hover:text-violet-400 transition-colors"
        >
          Open swipe file ↗
        </button>
      </div>

      {/* Linked swipe items */}
      {refs.length > 0 && (
        <div className="space-y-1.5">
          {refs.map(item => (
            <div key={item.id}
                 className="flex items-start gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
              <Bookmark className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-200 truncate">{item.title}</div>
                {item.notes && (
                  <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2 mt-0.5">{item.notes}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {item.platform && <span className="text-[9px] text-zinc-700 capitalize">{item.platform}</span>}
                  {item.creator  && <span className="text-[9px] text-zinc-700">@{item.creator}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                     className="text-zinc-700 hover:text-blue-400 transition-colors" onClick={e => e.stopPropagation()}>
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

      {/* Add reference button */}
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

      {/* Picker dropdown */}
      <AnimatePresence>
        {picking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.07] bg-[#15151a] overflow-hidden">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
                <Search className="w-3 h-3 text-zinc-600 shrink-0" />
                <input
                  autoFocus
                  placeholder="Search swipe file…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 outline-none"
                />
              </div>
              {/* Results */}
              <div className="max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-zinc-700 text-center">
                    {swipeItems.length === 0
                      ? 'No swipe items yet. Add some in the Swipe File.'
                      : 'No matches — all items already linked or filtered out.'}
                  </div>
                ) : (
                  filtered.map(item => (
                    <button key={item.id} onClick={() => { addRef(item.id); setPicking(false); }}
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
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Stage hint ────────────────────────────────────────────────────────────────

function StageHint({ idea }: { idea: Idea }) {
  const { ideaColumns } = useStore();
  const currentIdx = ideaColumns.findIndex(c => c.id === idea.status);
  const col = ideaColumns[currentIdx];

  const hints: Record<string, { icon: React.ElementType; msg: string }> = {
    draft:      { icon: Pencil,   msg: 'Flesh out the hook and body, then start scripting.' },
    scripting:  { icon: FileText, msg: 'Write the script below — hook is pre-filled for you.' },
    ready:      { icon: Check,    msg: 'Script is done. Time to film!' },
    filmed:     { icon: Film,     msg: 'Filmed! Link the uploaded video to close the loop.' },
    published:  { icon: BarChart2,msg: 'Published — check the linked video\'s analytics.' },
  };

  const hint = hints[idea.status] ?? { icon: ArrowRight, msg: 'Move this idea to the next stage.' };
  const Icon = hint.icon;

  return col ? (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
         style={{ backgroundColor: `${col.color}12` }}>
      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: col.color }} />
      <p className="text-[11px] leading-relaxed" style={{ color: `${col.color}cc` }}>{hint.msg}</p>
    </div>
  ) : null;
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  ideaId: string;
  onClose: () => void;
}

export default function IdeaDetailPanel({ ideaId, onClose }: Props) {
  const { ideas, updateIdea, deleteIdea, ideaColumns } = useStore();
  const idea = ideas.find(i => i.id === ideaId);

  if (!idea) return null;

  const showVideoSection = ['filmed', 'published', ...(ideaColumns.slice(3).map(c => c.id))].includes(idea.status)
    || !!idea.linkedVideoId;

  function handleDelete() {
    if (window.confirm(`Delete "${idea!.title}"? This can't be undone.`)) {
      deleteIdea(ideaId);
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-[400px] bg-[#111114] border-l border-white/[0.08]
                   flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] shrink-0">
          <span className="text-[11px] text-zinc-500 font-medium">Idea</span>
          <ChevronRight className="w-3 h-3 text-zinc-700" />
          <span className="text-[11px] text-zinc-300 font-medium flex-1 truncate">{idea.title}</span>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded
                                               text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Title */}
          <input
            value={idea.title}
            onChange={e => updateIdea(idea.id, { title: e.target.value })}
            className="w-full text-base font-bold text-white bg-transparent outline-none
                       border-b border-white/[0.07] pb-2 placeholder:text-zinc-700"
            placeholder="Idea title…"
          />

          {/* Status pipeline */}
          <div className="space-y-2">
            <StatusPipeline idea={idea} />
            <StageHint idea={idea} />
          </div>

          {/* ── Brief ── */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-orange-400" />
              Brief
            </div>

            {/* Hook */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 font-medium">Hook</label>
              <textarea
                value={idea.hook}
                onChange={e => updateIdea(idea.id, { hook: e.target.value })}
                placeholder="One-liner that stops the scroll…"
                rows={2}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2
                           text-sm text-white placeholder:text-zinc-700 outline-none
                           focus:border-violet-500/30 resize-none"
              />
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 font-medium">Notes</label>
              <textarea
                value={idea.body}
                onChange={e => updateIdea(idea.id, { body: e.target.value })}
                placeholder="Outline, references, talking points…"
                rows={4}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2
                           text-sm text-zinc-300 placeholder:text-zinc-700 outline-none
                           focus:border-violet-500/30 resize-none leading-relaxed"
              />
            </div>

            {/* Platform + Format + Date row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-zinc-600 font-medium">Platform</label>
                <select
                  value={idea.platform ?? ''}
                  onChange={e => updateIdea(idea.id, { platform: (e.target.value as Platform) || undefined })}
                  className="w-full bg-[#1a1a1f] border border-white/[0.07] rounded-lg px-2 py-1.5
                             text-xs text-zinc-300 outline-none"
                >
                  <option value="">—</option>
                  {(['instagram','tiktok','youtube','twitter','linkedin'] as Platform[]).map(p => (
                    <option key={p} value={p} className="capitalize">{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-zinc-600 font-medium">Format</label>
                <select
                  value={idea.formatType ?? ''}
                  onChange={e => updateIdea(idea.id, { formatType: (e.target.value as FormatType) || undefined })}
                  className="w-full bg-[#1a1a1f] border border-white/[0.07] rounded-lg px-2 py-1.5
                             text-xs text-zinc-300 outline-none"
                >
                  <option value="">—</option>
                  {(Object.entries(FORMAT_LABELS) as [FormatType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-zinc-600 font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />Date
                </label>
                <input
                  type="date"
                  value={idea.scheduledDate ?? ''}
                  onChange={e => updateIdea(idea.id, { scheduledDate: e.target.value || undefined })}
                  className="w-full bg-[#1a1a1f] border border-white/[0.07] rounded-lg px-2 py-1.5
                             text-xs text-zinc-300 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ── Inspiration ── */}
          <InspirationSection idea={idea} />

          {/* ── Script ── */}
          <ScriptSection idea={idea} />

          {/* ── Video ── */}
          {showVideoSection && <VideoSection idea={idea} />}

          {/* ── Danger ── */}
          <div className="pt-2 border-t border-white/[0.06]">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete idea
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
