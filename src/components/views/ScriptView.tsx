'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, GripVertical, Clock, ChevronDown, Bookmark, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Script, ScriptSection, Idea } from '@/types';

// ── section type config ───────────────────────────────────────────────────────

const SECTION_TYPES: { id: ScriptSection['type']; label: string; color: string; hint: string }[] = [
  { id: 'hook',    label: 'Hook',    color: 'bg-red-500/20 text-red-400 border-red-500/20',    hint: 'First 3 seconds — stop the scroll' },
  { id: 'build',   label: 'Build',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/20', hint: 'Expand the promise, build tension' },
  { id: 'payoff',  label: 'Payoff',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', hint: 'Deliver the value / reveal' },
  { id: 'cta',     label: 'CTA',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/20',   hint: 'Call to action' },
  { id: 'custom',  label: 'Custom',  color: 'bg-violet-500/20 text-violet-400 border-violet-500/20', hint: 'Custom section' },
];

function typeConfig(t: ScriptSection['type']) {
  return SECTION_TYPES.find(s => s.id === t) ?? SECTION_TYPES[4];
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  onChange,
  onDelete,
}: {
  section: ScriptSection;
  onChange: (updates: Partial<ScriptSection>) => void;
  onDelete: () => void;
}) {
  const cfg = typeConfig(section.type);
  const [typeOpen, setTypeOpen] = useState(false);

  const wpm = 130; // avg speaking words per minute
  const wordCount = section.content.trim().split(/\s+/).filter(Boolean).length;
  const estSecs = Math.round((wordCount / wpm) * 60);

  return (
    <div className="group bg-[#18181c] border border-white/[0.07] rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
        <GripVertical className="w-3.5 h-3.5 text-zinc-700 cursor-grab shrink-0" />

        {/* Type picker */}
        <div className="relative">
          <button
            onClick={() => setTypeOpen(o => !o)}
            className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border', cfg.color)}
          >
            {cfg.label}
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>
          {typeOpen && (
            <div className="absolute top-7 left-0 z-20 bg-[#22222a] border border-white/10 rounded-lg py-1 w-36 shadow-xl" onClick={() => setTypeOpen(false)}>
              {SECTION_TYPES.map(t => (
                <button key={t.id} onClick={() => onChange({ type: t.id })}
                  className={cn('w-full text-left px-3 py-1.5 text-xs transition-colors', t.id === section.type ? 'text-violet-400' : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]')}>
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

        {/* Duration estimate */}
        {wordCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Clock className="w-3 h-3" />
            ~{estSecs}s
          </span>
        )}

        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hint */}
      <div className="px-3 pt-1.5 text-[10px] text-zinc-700 italic">{cfg.hint}</div>

      {/* Content */}
      <textarea
        value={section.content}
        onChange={e => onChange({ content: e.target.value })}
        placeholder="Write your script here…"
        rows={4}
        className="w-full bg-transparent px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none resize-none leading-relaxed"
      />
    </div>
  );
}

// ── Script editor ─────────────────────────────────────────────────────────────

function ScriptEditor({ script }: { script: Script }) {
  const { updateScript } = useStore();

  function updateSection(sectionId: string, updates: Partial<ScriptSection>) {
    updateScript(script.id, {
      sections: script.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
      updatedAt: new Date().toISOString(),
    });
  }

  function deleteSection(sectionId: string) {
    updateScript(script.id, {
      sections: script.sections.filter(s => s.id !== sectionId),
      updatedAt: new Date().toISOString(),
    });
  }

  function addSection(type: ScriptSection['type'] = 'custom') {
    const newSection: ScriptSection = {
      id: `sec-${Date.now()}`,
      type,
      label: SECTION_TYPES.find(t => t.id === type)?.label ?? 'Section',
      content: '',
    };
    updateScript(script.id, {
      sections: [...script.sections, newSection],
      updatedAt: new Date().toISOString(),
    });
  }

  const totalWords = script.sections.reduce((acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length, 0);
  const totalSecs  = Math.round((totalWords / 130) * 60);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-3">
      {/* Script title */}
      <input
        value={script.title}
        onChange={e => updateScript(script.id, { title: e.target.value, updatedAt: new Date().toISOString() })}
        className="w-full bg-transparent text-base font-semibold text-white placeholder:text-zinc-600 outline-none border-b border-white/[0.06] pb-2"
        placeholder="Script title…"
      />

      {/* Stats */}
      <div className="flex items-center gap-4 text-[11px] text-zinc-600">
        <span>{totalWords} words</span>
        <span>~{totalSecs}s estimated</span>
        <span>{script.sections.length} section{script.sections.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {script.sections.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            onChange={u => updateSection(section.id, u)}
            onDelete={() => deleteSection(section.id)}
          />
        ))}
      </div>

      {/* Add section */}
      <div className="flex flex-wrap gap-2 pt-2">
        {SECTION_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => addSection(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:opacity-80',
              t.color
            )}
          >
            <Plus className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Script list panel ─────────────────────────────────────────────────────────

function ScriptListPanel({
  scripts,
  ideas,
  activeId,
  onSelect,
  onCreate,
}: {
  scripts: Script[];
  ideas: Idea[];
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
          return (
            <button
              key={sc.id}
              onClick={() => onSelect(sc.id)}
              className={cn(
                'w-full text-left px-4 py-2.5 transition-colors border-l-2',
                sc.id === activeId
                  ? 'bg-white/[0.06] border-violet-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'
              )}
            >
              <div className="text-xs font-medium leading-snug line-clamp-1">{sc.title}</div>
              {idea && <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{idea.title}</div>}
              <div className="text-[10px] text-zinc-700 mt-0.5">{sc.sections.length} sections</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── References panel ─────────────────────────────────────────────────────────

function ReferencesPanel({ script }: { script: Script | null }) {
  const { ideas, swipeItems, setActiveView, setActiveWorkspace } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  // Find parent idea (if any) and its swipe refs
  const parentIdea = script?.ideaId ? ideas.find(i => i.id === script.ideaId) : null;
  const refs = parentIdea
    ? (parentIdea.swipeRefs ?? []).map(id => swipeItems.find(s => s.id === id)).filter(Boolean) as typeof swipeItems
    : [];

  // Always render the panel when there's a script — show empty state if no refs
  if (!script) return null;

  return (
    <div
      className={cn(
        'shrink-0 border-l border-white/[0.06] bg-[#111114] flex flex-col transition-all duration-200',
        collapsed ? 'w-9' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-3 border-b border-white/[0.06]">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
          title={collapsed ? 'Show references' : 'Hide references'}
        >
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', !collapsed && 'rotate-90')} />
        </button>
        {!collapsed && (
          <>
            <Bookmark className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-400 flex-1">References</span>
            <button
              onClick={() => { setActiveWorkspace('ideas'); setActiveView('swipe'); }}
              className="text-[10px] text-zinc-700 hover:text-violet-400 transition-colors"
              title="Open Swipe File"
            >
              ↗
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2">
          {refs.length === 0 ? (
            <div className="px-3 py-6 text-center space-y-2">
              <Bookmark className="w-5 h-5 text-zinc-800 mx-auto" />
              <p className="text-[11px] text-zinc-700 leading-relaxed">
                {parentIdea
                  ? 'No references linked to this idea yet.'
                  : 'Link this script to an idea to see its references here.'}
              </p>
              {parentIdea && (
                <button
                  onClick={() => { setActiveWorkspace('ideas'); setActiveView('swipe'); }}
                  className="text-[11px] text-violet-500 hover:text-violet-400 transition-colors"
                >
                  Browse Swipe File →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {refs.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1"
                >
                  <div className="flex items-start gap-1.5">
                    <Bookmark className="w-2.5 h-2.5 text-violet-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium text-zinc-200 leading-snug flex-1 line-clamp-2">
                      {item.title}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-700 hover:text-blue-400 transition-colors shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-zinc-600 leading-snug line-clamp-3 pl-4">
                      {item.notes}
                    </p>
                  )}
                  {(item.platform || item.creator) && (
                    <div className="flex items-center gap-2 pl-4">
                      {item.platform && (
                        <span className="text-[9px] text-zinc-700 capitalize">{item.platform}</span>
                      )}
                      {item.creator && (
                        <span className="text-[9px] text-zinc-700">@{item.creator}</span>
                      )}
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
  const { scripts, ideas, addScript, deleteScript, activeScriptId: storeScriptId, setActiveScriptId: setStoreScriptId } = useStore();
  // Use store-level activeScriptId (set when navigating from IdeaDetailPanel) as initial value,
  // then track locally — clear store copy so back-navigation is clean
  const [activeScriptId, setActiveScriptId] = useState<string | null>(
    storeScriptId ?? scripts[0]?.id ?? null
  );

  // When the store points us at a specific script (from idea panel), pick it up once
  if (storeScriptId && storeScriptId !== activeScriptId) {
    setActiveScriptId(storeScriptId);
    setStoreScriptId(null);
  }

  const activeScript = scripts.find(s => s.id === activeScriptId) ?? null;

  function createScript() {
    const sc: Script = {
      id: `script-${Date.now()}`,
      title: 'New Script',
      sections: [
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
          <ScriptEditor script={activeScript} />
          <ReferencesPanel script={activeScript} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Plus className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-400">No script selected</div>
            <div className="text-xs text-zinc-600 mt-1">Create a new script or select one from the list</div>
          </div>
          <button onClick={createScript} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
            New script
          </button>
        </div>
      )}
    </div>
  );
}
