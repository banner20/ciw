'use client';
import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import {
  Plus, Trash2, GripVertical, Clock, ChevronDown, Bookmark,
  ExternalLink, ChevronRight, Sparkles, RefreshCw, Minimize2,
  Maximize2, Copy, Download, Zap, X, Check, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Script, ScriptSection, Idea } from '@/types';

// ── constants ─────────────────────────────────────────────────────────────────

const WPM = 130;

const SECTION_TYPES: { id: ScriptSection['type']; label: string; color: string; hint: string }[] = [
  { id: 'hook',   label: 'Hook',   color: 'bg-red-500/20 text-red-400 border-red-500/20',       hint: 'First 3 seconds — stop the scroll' },
  { id: 'build',  label: 'Build',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/20', hint: 'Expand the promise, build tension' },
  { id: 'payoff', label: 'Payoff', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', hint: 'Deliver the value / reveal' },
  { id: 'cta',    label: 'CTA',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/20',    hint: 'Call to action' },
  { id: 'custom', label: 'Custom', color: 'bg-violet-500/20 text-violet-400 border-violet-500/20', hint: 'Custom section' },
];

function typeCfg(t: ScriptSection['type']) {
  return SECTION_TYPES.find(s => s.id === t) ?? SECTION_TYPES[4];
}

function fmtTime(secs: number) {
  if (secs < 60) return `~${secs}s`;
  return `~${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ── AI streaming helper ───────────────────────────────────────────────────────

async function streamAI(
  action: string,
  context: Record<string, string>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, context }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      onError(err.error ?? 'AI request failed');
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) { onError('No stream'); return; }
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : String(e));
  }
}

function buildContext(script: Script, idea: Idea | null): Record<string, string> {
  return {
    ideaTitle:     idea?.title ?? script.title,
    ideaHook:      idea?.hook ?? '',
    talkingPoints: idea?.talkingPoints?.map(t => t.text).join(', ') ?? '',
    platform:      idea?.platform ?? '',
    format:        idea?.formatType ?? '',
  };
}

// ── Hook variations modal ─────────────────────────────────────────────────────

function HookVariationsModal({
  script,
  idea,
  onClose,
  onUse,
}: {
  script: Script;
  idea: Idea | null;
  onClose: () => void;
  onUse: (text: string) => void;
}) {
  const [hooks,   setHooks]   = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState<number | null>(null);

  const generate = useCallback(async () => {
    setHooks([]);
    setLoading(true);
    let full = '';
    await streamAI(
      'hooks',
      buildContext(script, idea),
      chunk => { full += chunk; },
      () => {
        const lines = full.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        setHooks(lines);
        setLoading(false);
      },
      err => { toast.error(err); setLoading(false); },
    );
  }, [script, idea]);

  // Auto-generate on open
  useState(() => { generate(); });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#141418] border border-white/[0.09] rounded-2xl w-[520px] shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]">
          <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-white flex-1">Hook Variations</span>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-violet-400 transition-colors disabled:opacity-40">
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Regenerate
          </button>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 ml-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hooks list */}
        <div className="p-4 space-y-2 min-h-[200px]">
          {loading && hooks.length === 0 && (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating hooks…</span>
            </div>
          )}
          {hooks.map((hook, i) => (
            <div key={i} className="group flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all">
              <span className="text-[10px] font-mono text-zinc-700 mt-0.5 shrink-0 w-4">{i + 1}</span>
              <p className="flex-1 text-sm text-zinc-200 leading-relaxed">{hook}</p>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hook);
                    setCopied(i);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors"
                >
                  {copied === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { onUse(hook); onClose(); toast.success('Hook added to script'); }}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-medium transition-colors"
                >
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  idea,
  script,
  onChange,
  onDelete,
}: {
  section: ScriptSection;
  idea: Idea | null;
  script: Script;
  onChange: (updates: Partial<ScriptSection>) => void;
  onDelete: () => void;
}) {
  const cfg        = typeCfg(section.type);
  const [typeOpen, setTypeOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null); // action name
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = section.content.trim().split(/\s+/).filter(Boolean).length;
  const estSecs   = Math.round((wordCount / WPM) * 60);
  const isEmpty   = wordCount === 0;

  async function runAI(action: 'generate' | 'rewrite' | 'expand' | 'shorten') {
    setAiLoading(action);
    let streamed = '';
    const ctx = { ...buildContext(script, idea), sectionType: section.type, currentContent: section.content };

    await streamAI(
      action,
      ctx,
      chunk => {
        streamed += chunk;
        onChange({ content: streamed });
        // scroll textarea to bottom
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      },
      () => {
        setAiLoading(null);
        toast.success(action === 'generate' ? 'Section generated' : action === 'rewrite' ? 'Section rewritten' : action === 'expand' ? 'Section expanded' : 'Section shortened');
      },
      err => {
        setAiLoading(null);
        toast.error(`AI error: ${err}`);
      },
    );
  }

  const isStreaming = aiLoading !== null;

  return (
    <div className="group bg-[#18181c] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
        <GripVertical className="w-3.5 h-3.5 text-zinc-700 cursor-grab shrink-0" />

        {/* Type picker */}
        <div className="relative">
          <button onClick={() => setTypeOpen(o => !o)}
            className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border', cfg.color)}>
            {cfg.label}<ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>
          {typeOpen && (
            <div className="absolute top-7 left-0 z-20 bg-[#22222a] border border-white/10 rounded-lg py-1 w-36 shadow-xl" onClick={() => setTypeOpen(false)}>
              {SECTION_TYPES.map(t => (
                <button key={t.id} onClick={() => onChange({ type: t.id })}
                  className={cn('w-full text-left px-3 py-1.5 text-xs transition-colors',
                    t.id === section.type ? 'text-violet-400' : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]')}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Label */}
        <input
          value={section.label}
          onChange={e => onChange({ label: e.target.value })}
          className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 outline-none"
          placeholder="Section label…"
        />

        {/* Word count + duration */}
        {wordCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600 shrink-0">
            <Clock className="w-3 h-3" />{wordCount}w · {fmtTime(estSecs)}
          </span>
        )}

        {/* AI actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isEmpty ? (
            <button
              onClick={() => runAI('generate')}
              disabled={isStreaming}
              title="Generate with AI"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium
                         bg-violet-500/15 border border-violet-500/25 text-violet-400
                         hover:bg-violet-500/25 transition-colors disabled:opacity-40"
            >
              {isStreaming ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
              Generate
            </button>
          ) : (
            <>
              <button onClick={() => runAI('rewrite')} disabled={isStreaming} title="Rewrite with AI"
                className="p-1 rounded text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-40">
                {aiLoading === 'rewrite' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => runAI('expand')} disabled={isStreaming} title="Expand"
                className="p-1 rounded text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
                {aiLoading === 'expand' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => runAI('shorten')} disabled={isStreaming} title="Shorten"
                className="p-1 rounded text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40">
                {aiLoading === 'shorten' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>

        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hint */}
      <div className="px-3 pt-1.5 text-[10px] text-zinc-700 italic">{cfg.hint}</div>

      {/* Content */}
      <textarea
        ref={textareaRef}
        value={section.content}
        onChange={e => onChange({ content: e.target.value })}
        placeholder={isStreaming ? '' : 'Write here or click Generate…'}
        rows={4}
        className={cn(
          'w-full bg-transparent px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none resize-none leading-relaxed',
          isStreaming && 'animate-pulse'
        )}
      />
    </div>
  );
}

// ── Script editor ─────────────────────────────────────────────────────────────

function ScriptEditor({ script, idea }: { script: Script; idea: Idea | null }) {
  const { updateScript } = useStore();
  const [showHooks, setShowHooks] = useState(false);

  function updateSection(id: string, updates: Partial<ScriptSection>) {
    updateScript(script.id, {
      sections: script.sections.map(s => s.id === id ? { ...s, ...updates } : s),
      updatedAt: new Date().toISOString(),
    });
  }

  function deleteSection(id: string) {
    updateScript(script.id, {
      sections: script.sections.filter(s => s.id !== id),
      updatedAt: new Date().toISOString(),
    });
  }

  function addSection(type: ScriptSection['type'] = 'custom') {
    updateScript(script.id, {
      sections: [...script.sections, {
        id: `sec-${Date.now()}`,
        type,
        label: SECTION_TYPES.find(t => t.id === type)?.label ?? 'Section',
        content: '',
      }],
      updatedAt: new Date().toISOString(),
    });
  }

  // Adds a hook as the first section (or updates existing hook section)
  function applyHook(text: string) {
    const hookSection = script.sections.find(s => s.type === 'hook');
    if (hookSection) {
      updateSection(hookSection.id, { content: text });
    } else {
      updateScript(script.id, {
        sections: [
          { id: `sec-${Date.now()}`, type: 'hook', label: 'Hook', content: text },
          ...script.sections,
        ],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const totalWords = script.sections.reduce((a, s) => a + s.content.trim().split(/\s+/).filter(Boolean).length, 0);
  const totalSecs  = Math.round((totalWords / WPM) * 60);

  function copyToClipboard() {
    const text = script.sections
      .map(s => `[${s.label.toUpperCase()}]\n${s.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Script copied to clipboard');
  }

  function exportTxt() {
    const text = [
      script.title,
      idea ? `Idea: ${idea.title}` : '',
      `Platform: ${idea?.platform ?? '—'} | ~${totalWords} words | ${fmtTime(totalSecs)}`,
      '',
      ...script.sections.map(s => `[${s.label.toUpperCase()}]\n${s.content || '(empty)'}`),
    ].filter(l => l !== null).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script exported');
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-3 min-w-0">
      {/* Title */}
      <input
        value={script.title}
        onChange={e => updateScript(script.id, { title: e.target.value, updatedAt: new Date().toISOString() })}
        className="w-full bg-transparent text-base font-semibold text-white placeholder:text-zinc-600 outline-none border-b border-white/[0.06] pb-2"
        placeholder="Script title…"
      />

      {/* Stats + actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span className={cn(totalWords > 0 ? 'text-zinc-400' : '')}>{totalWords} words</span>
          <span>{fmtTime(totalSecs)}</span>
          <span>{script.sections.length} section{script.sections.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowHooks(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
                     bg-violet-500/10 border border-violet-500/20 text-violet-400
                     hover:bg-violet-500/20 transition-colors"
        >
          <Zap className="w-3 h-3" />
          Hook variations
        </button>
        <button onClick={copyToClipboard}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-white border border-white/[0.07] hover:border-white/[0.14] transition-colors">
          <Copy className="w-3 h-3" />Copy
        </button>
        <button onClick={exportTxt}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-white border border-white/[0.07] hover:border-white/[0.14] transition-colors">
          <Download className="w-3 h-3" />.txt
        </button>
      </div>

      {/* Linked idea badge */}
      {idea && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-xs text-violet-300 truncate">From: {idea.title}</span>
          {idea.hook && (
            <span className="text-xs text-zinc-600 italic truncate hidden lg:block">· "{idea.hook}"</span>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {script.sections.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            idea={idea}
            script={script}
            onChange={u => updateSection(section.id, u)}
            onDelete={() => deleteSection(section.id)}
          />
        ))}
      </div>

      {/* Add section */}
      <div className="flex flex-wrap gap-2 pt-2">
        {SECTION_TYPES.map(t => (
          <button key={t.id} onClick={() => addSection(t.id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:opacity-80', t.color)}>
            <Plus className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {/* Hook variations modal */}
      {showHooks && (
        <HookVariationsModal
          script={script}
          idea={idea}
          onClose={() => setShowHooks(false)}
          onUse={applyHook}
        />
      )}
    </div>
  );
}

// ── Script list panel ─────────────────────────────────────────────────────────

function ScriptListPanel({ scripts, ideas, activeId, onSelect, onCreate }: {
  scripts: Script[];
  ideas:   Idea[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-[220px] shrink-0 border-r border-white/[0.06] flex flex-col bg-[#111114]">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400">Scripts</span>
        <button onClick={onCreate} className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-violet-400 hover:bg-white/[0.06] transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {scripts.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-zinc-700">No scripts yet.<br />Click + to create one.</div>
        )}
        {scripts.map(sc => {
          const idea = ideas.find(i => i.id === sc.ideaId);
          const words = sc.sections.reduce((a, s) => a + s.content.trim().split(/\s+/).filter(Boolean).length, 0);
          return (
            <button key={sc.id} onClick={() => onSelect(sc.id)}
              className={cn('w-full text-left px-4 py-2.5 transition-colors border-l-2',
                sc.id === activeId
                  ? 'bg-white/[0.06] border-violet-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]')}>
              <div className="text-xs font-medium leading-snug line-clamp-1">{sc.title}</div>
              {idea && <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{idea.title}</div>}
              <div className="text-[10px] text-zinc-700 mt-0.5">{words > 0 ? `${words}w · ` : ''}{sc.sections.length} sections</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── References panel ──────────────────────────────────────────────────────────

function ReferencesPanel({ script }: { script: Script | null }) {
  const { ideas, swipeItems, setActiveView, setActiveWorkspace } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const parentIdea = script?.ideaId ? ideas.find(i => i.id === script.ideaId) : null;
  const refs = parentIdea
    ? (parentIdea.swipeRefs ?? []).map(id => swipeItems.find(s => s.id === id)).filter(Boolean) as typeof swipeItems
    : [];

  if (!script) return null;

  return (
    <div className={cn('shrink-0 border-l border-white/[0.06] bg-[#111114] flex flex-col transition-all duration-200',
      collapsed ? 'w-9' : 'w-[220px]')}>
      <div className="flex items-center gap-1.5 px-2 py-3 border-b border-white/[0.06]">
        <button onClick={() => setCollapsed(c => !c)}
          className="w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors">
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', !collapsed && 'rotate-90')} />
        </button>
        {!collapsed && (
          <>
            <Bookmark className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-400 flex-1">References</span>
            <button onClick={() => { setActiveWorkspace('ideas'); setActiveView('swipe'); }}
              className="text-[10px] text-zinc-700 hover:text-violet-400 transition-colors">↗</button>
          </>
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2">
          {refs.length === 0 ? (
            <div className="px-3 py-6 text-center space-y-2">
              <Bookmark className="w-5 h-5 text-zinc-800 mx-auto" />
              <p className="text-[11px] text-zinc-700 leading-relaxed">
                {parentIdea ? 'No references linked yet.' : 'Link this script to an idea to see references here.'}
              </p>
              {parentIdea && (
                <button onClick={() => { setActiveWorkspace('ideas'); setActiveView('swipe'); }}
                  className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors">
                  Browse Swipe File →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {refs.map(item => (
                <div key={item.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <Bookmark className="w-2.5 h-2.5 text-violet-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium text-zinc-200 leading-snug flex-1 line-clamp-2">{item.title}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="text-zinc-700 hover:text-blue-400 transition-colors shrink-0" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {item.notes && <p className="text-[10px] text-zinc-600 leading-snug line-clamp-3 pl-4">{item.notes}</p>}
                  {(item.platform || item.creator) && (
                    <div className="flex items-center gap-2 pl-4">
                      {item.platform && <span className="text-[9px] text-zinc-700 capitalize">{item.platform}</span>}
                      {item.creator && <span className="text-[9px] text-zinc-700">@{item.creator}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ScriptView() {
  const { scripts, ideas, addScript, activeScriptId: storeScriptId, setActiveScriptId: setStoreScriptId } = useStore();
  const [activeScriptId, setActiveScriptId] = useState<string | null>(
    storeScriptId ?? scripts[0]?.id ?? null
  );

  if (storeScriptId && storeScriptId !== activeScriptId) {
    setActiveScriptId(storeScriptId);
    setStoreScriptId(null);
  }

  const activeScript = scripts.find(s => s.id === activeScriptId) ?? null;
  const linkedIdea   = activeScript?.ideaId ? (ideas.find(i => i.id === activeScript.ideaId) ?? null) : null;

  function createScript() {
    const sc: Script = {
      id:        `script-${Date.now()}`,
      title:     'New Script',
      sections:  [
        { id: `sec-${Date.now()}-1`, type: 'hook',   label: 'Hook',   content: '' },
        { id: `sec-${Date.now()}-2`, type: 'build',  label: 'Build',  content: '' },
        { id: `sec-${Date.now()}-3`, type: 'payoff', label: 'Payoff', content: '' },
        { id: `sec-${Date.now()}-4`, type: 'cta',    label: 'CTA',    content: '' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addScript(sc);
    setActiveScriptId(sc.id);
  }

  return (
    <div className="h-full flex overflow-hidden">
      <ScriptListPanel
        scripts={scripts}
        ideas={ideas}
        activeId={activeScriptId}
        onSelect={setActiveScriptId}
        onCreate={createScript}
      />

      {activeScript ? (
        <>
          <ScriptEditor script={activeScript} idea={linkedIdea} />
          <ReferencesPanel script={activeScript} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-400">No script selected</div>
            <div className="text-xs text-zinc-600 mt-1">Create a script or open one from an idea brief</div>
          </div>
          <button onClick={createScript} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
            New script
          </button>
        </div>
      )}
    </div>
  );
}
