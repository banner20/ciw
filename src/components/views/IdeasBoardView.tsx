'use client';
import { useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Plus, GripVertical, Trash2, Check, X, MoreHorizontal, ChevronRight, Globe, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Idea, IdeaColumn, IdeaStatus, Platform } from '@/types';
import IdeaDetailPanel from '@/components/IdeaDetailPanel';

// ── colour palette for new columns ────────────────────────────────────────────

const PALETTE = [
  '#71717a','#3b82f6','#8b5cf6','#f59e0b','#10b981',
  '#ef4444','#ec4899','#14b8a6','#f97316','#a855f7',
];

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Add idea modal ─────────────────────────────────────────────────────────────

function AddIdeaModal({ defaultStatus, onClose }: { defaultStatus: IdeaStatus; onClose: () => void }) {
  const { addIdea, activeProjectId } = useStore();
  const [title,    setTitle]    = useState('');
  const [hook,     setHook]     = useState('');
  const [body,     setBody]     = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram');

  function submit() {
    if (!title.trim()) return;
    addIdea({
      id:        `idea-${Date.now()}`,
      projectId: activeProjectId ?? 'proj-1',
      title:     title.trim(),
      hook:      hook.trim(),
      body:      body.trim(),
      status:    defaultStatus,
      platform,
      tags:      [],
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#18181c] border border-white/10 rounded-2xl p-5 w-[420px] space-y-3 shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-white">New idea</div>

        <input autoFocus placeholder="Title…" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
        <input placeholder="Hook (one-liner)…" value={hook} onChange={e => setHook(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
        <textarea placeholder="Notes…" value={body} onChange={e => setBody(e.target.value)} rows={2}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40 resize-none" />

        <div className="flex items-center gap-2 flex-wrap">
          {(['instagram','tiktok','youtube','twitter','linkedin'] as Platform[]).map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={cn('px-2 py-1 rounded-lg text-xs capitalize transition-colors border',
                platform === p ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300 border-transparent')}>
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={submit} disabled={!title.trim()}
            className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
            Add idea
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Idea card ─────────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea:         Idea;
  col:          IdeaColumn;
  columns:      IdeaColumn[];
  onDragStart:  (e: React.DragEvent, id: string) => void;
  onDragEnd:    () => void;
}

function IdeaCard({ idea, col, columns, onDragStart, onDragEnd, onOpen }: IdeaCardProps & { onOpen: (id: string) => void }) {
  const { updateIdea, scripts } = useStore();
  const [menu, setMenu] = useState(false);

  const nextCol      = columns[columns.findIndex(c => c.id === idea.status) + 1];
  const hasScript    = !!idea.scriptId && scripts.some(s => s.id === idea.scriptId);
  const hasVideo     = !!idea.linkedVideoId;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idea.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(idea.id)}
      className="bg-[#1e1e24] border border-white/[0.07] rounded-xl p-3 space-y-2 group
                 hover:border-white/[0.14] transition-all cursor-pointer
                 active:opacity-70 active:scale-[0.98] select-none"
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <GripVertical
          className="w-3.5 h-3.5 text-zinc-700 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
          onMouseDown={e => e.stopPropagation()}
        />
        <p className="flex-1 text-xs font-medium text-white leading-snug">{idea.title}</p>
        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); setMenu(m => !m); }}
            className="w-5 h-5 flex items-center justify-center rounded text-zinc-600
                       hover:text-zinc-300 hover:bg-white/[0.06] transition-colors
                       opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-6 z-20 bg-[#22222a] border border-white/10
                            rounded-lg py-1 w-40 shadow-xl text-xs" onClick={() => setMenu(false)}>
              {columns.filter(c => c.id !== idea.status).map(c => (
                <button key={c.id} onClick={() => updateIdea(idea.id, { status: c.id })}
                  className="w-full text-left px-3 py-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white
                             flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hook */}
      {idea.hook && (
        <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2 italic pl-5">
          "{idea.hook}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 pl-5">
        {idea.platform && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Globe className="w-2.5 h-2.5" />{idea.platform}
          </span>
        )}
        {/* indicator chips */}
        {hasScript && (
          <span className="flex items-center gap-0.5 text-[9px] text-violet-500 bg-violet-500/10
                           border border-violet-500/15 rounded-full px-1.5 py-0.5">
            <FileText className="w-2 h-2" />script
          </span>
        )}
        {hasVideo && (
          <span className="flex items-center gap-0.5 text-[9px] text-emerald-500 bg-emerald-500/10
                           border border-emerald-500/15 rounded-full px-1.5 py-0.5">
            ▶ video
          </span>
        )}
        <div className="flex-1" />
        {nextCol && (
          <button
            onClick={e => { e.stopPropagation(); updateIdea(idea.id, { status: nextCol.id }); }}
            title={`Move to ${nextCol.label}`}
            className="flex items-center gap-0.5 text-[10px] text-zinc-700 hover:text-violet-400 transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Column header — inline rename + colour picker ─────────────────────────────

interface ColumnHeaderProps {
  col:       IdeaColumn;
  colCount:  number;
  onRename:  (id: string, label: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete:  (id: string) => void;
}

function ColumnHeader({ col, colCount, onRename, onRecolor, onDelete }: ColumnHeaderProps) {
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(col.label);
  const [pickerOpen, setPickerOpen] = useState(false);

  function commitRename() {
    if (value.trim()) onRename(col.id, value.trim());
    else setValue(col.label);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2 px-1 mb-3 select-none group/hdr">
      {/* Colour dot — click to open picker */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen(o => !o)}
          className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-transparent hover:ring-white/30 transition-all"
          style={{ backgroundColor: col.color }}
          title="Change colour"
        />
        {pickerOpen && (
          <div className="absolute top-5 left-0 z-30 bg-[#22222a] border border-white/10
                          rounded-xl p-2.5 shadow-xl flex gap-1.5 flex-wrap w-[130px]"
               onClick={e => e.stopPropagation()}>
            {PALETTE.map(hex => (
              <button key={hex} onClick={() => { onRecolor(col.id, hex); setPickerOpen(false); }}
                className={cn('w-6 h-6 rounded-full ring-1 ring-transparent hover:ring-white/50 transition-all',
                  hex === col.color && 'ring-white/80')}
                style={{ backgroundColor: hex }} />
            ))}
          </div>
        )}
      </div>

      {/* Label — click to rename */}
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setValue(col.label); setEditing(false); } }}
          className="flex-1 text-xs font-semibold bg-white/[0.06] border border-violet-500/40
                     rounded px-1.5 py-0.5 text-white outline-none min-w-0"
          style={{ color: col.color }}
        />
      ) : (
        <span
          className="text-xs font-semibold cursor-text flex-1 truncate"
          style={{ color: col.color }}
          onClick={() => setEditing(true)}
          title="Click to rename"
        >
          {col.label}
        </span>
      )}

      {/* Delete — only shown on hover, disabled if only 1 column */}
      <button
        onClick={() => colCount > 1 && onDelete(col.id)}
        title={colCount <= 1 ? 'Need at least one column' : `Delete "${col.label}"`}
        className={cn('opacity-0 group-hover/hdr:opacity-100 transition-opacity w-4 h-4',
          'flex items-center justify-center rounded text-zinc-600',
          colCount > 1 ? 'hover:text-red-400 cursor-pointer' : 'cursor-not-allowed')}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Column drop zone ──────────────────────────────────────────────────────────

interface ColumnProps {
  col:              IdeaColumn;
  columns:          IdeaColumn[];
  ideas:            Idea[];
  colCount:         number;
  isDragOver:       boolean;
  isColDragOver:    boolean;
  onAddIdea:        () => void;
  onOpenIdea:       (id: string) => void;
  onRename:         (id: string, label: string) => void;
  onRecolor:        (id: string, color: string) => void;
  onDeleteCol:      (id: string) => void;
  onIdeaDragStart:  (e: React.DragEvent, id: string) => void;
  onIdeaDragEnd:    () => void;
  onColDragStart:   (e: React.DragEvent, id: string) => void;
  onColDragEnd:     () => void;
  onDragOver:       (e: React.DragEvent, colId: string) => void;
  onDrop:           (e: React.DragEvent, colId: string) => void;
  onDragLeave:      () => void;
}

function Column({
  col, columns, ideas, colCount,
  isDragOver, isColDragOver,
  onAddIdea, onOpenIdea, onRename, onRecolor, onDeleteCol,
  onIdeaDragStart, onIdeaDragEnd,
  onColDragStart, onColDragEnd,
  onDragOver, onDrop, onDragLeave,
}: ColumnProps) {
  return (
    <div
      className="flex flex-col w-[230px] flex-shrink-0"
      onDragOver={e => onDragOver(e, col.id)}
      onDrop={e => onDrop(e, col.id)}
      onDragLeave={onDragLeave}
    >
      {/* Draggable column handle */}
      <div
        draggable
        onDragStart={e => onColDragStart(e, col.id)}
        onDragEnd={onColDragEnd}
        className={cn(
          'rounded-t-xl px-2 pt-2 pb-1 transition-all cursor-grab active:cursor-grabbing',
          isColDragOver && 'ring-2 ring-inset ring-violet-500/60'
        )}
        style={{ backgroundColor: isColDragOver ? hexToRgba(col.color, 0.08) : 'transparent' }}
      >
        <ColumnHeader
          col={col}
          colCount={colCount}
          onRename={onRename}
          onRecolor={onRecolor}
          onDelete={onDeleteCol}
        />
      </div>

      {/* Cards area */}
      <div
        className={cn(
          'flex-1 space-y-2 min-h-[120px] rounded-b-xl px-1 pb-1 transition-all',
          isDragOver && 'ring-2 ring-inset rounded-xl'
        )}
        style={{
          backgroundColor: isDragOver ? hexToRgba(col.color, 0.07) : 'transparent',
          boxShadow:       isDragOver ? `inset 0 0 0 2px ${hexToRgba(col.color, 0.5)}` : 'none',
        }}
      >
        {ideas.map(idea => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            col={col}
            columns={columns}
            onDragStart={onIdeaDragStart}
            onDragEnd={onIdeaDragEnd}
            onOpen={onOpenIdea}
          />
        ))}
        {isDragOver && ideas.length === 0 && (
          <div className="h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-[11px]"
               style={{ borderColor: hexToRgba(col.color, 0.4), color: hexToRgba(col.color, 0.6) }}>
            Drop here
          </div>
        )}
      </div>

      {/* Add idea button */}
      <button
        onClick={onAddIdea}
        className="mt-2 mx-1 flex items-center gap-1.5 py-2 rounded-xl border border-dashed
                   border-white/[0.07] hover:border-opacity-50 text-zinc-600 text-xs
                   transition-colors group/add"
        style={{ '--hover-color': col.color } as React.CSSProperties}
        onMouseEnter={e => (e.currentTarget.style.borderColor = hexToRgba(col.color, 0.4))}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
      >
        <Plus className="w-3.5 h-3.5 ml-3 transition-colors group-hover/add:text-white" />
        <span className="group-hover/add:text-white transition-colors">Add idea</span>
      </button>
    </div>
  );
}

// ── Add column button ─────────────────────────────────────────────────────────

function AddColumnButton({ onAdd }: { onAdd: (label: string, color: string) => void }) {
  const [open,  setOpen]  = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PALETTE[0]);

  function submit() {
    if (!label.trim()) return;
    onAdd(label.trim(), color);
    setLabel('');
    setColor(PALETTE[0]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center w-[56px] flex-shrink-0
                   h-24 rounded-xl border border-dashed border-white/[0.07]
                   hover:border-violet-500/30 text-zinc-700 hover:text-violet-400
                   transition-colors gap-1 self-start mt-9"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[9px] font-medium leading-none text-center px-1">New column</span>
      </button>
    );
  }

  return (
    <div className="w-[200px] flex-shrink-0 bg-[#18181c] border border-white/10 rounded-xl p-3 space-y-2.5 self-start mt-9">
      <input
        autoFocus
        placeholder="Column name…"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5
                   text-xs text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40"
      />
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map(hex => (
          <button key={hex} onClick={() => setColor(hex)}
            className={cn('w-5 h-5 rounded-full ring-1 ring-transparent hover:ring-white/50 transition-all',
              hex === color && 'ring-white/80')}
            style={{ backgroundColor: hex }} />
        ))}
      </div>
      <div className="flex gap-1.5">
        <button onClick={submit} disabled={!label.trim()}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500
                     text-white transition-colors disabled:opacity-40">
          Add
        </button>
        <button onClick={() => setOpen(false)}
          className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white
                     border border-white/10 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IdeasBoardView() {
  const { ideas, updateIdea, ideaColumns, setIdeaColumns } = useStore();
  const [addingTo,    setAddingTo]    = useState<IdeaStatus | null>(null);
  const [openIdeaId,  setOpenIdeaId]  = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragColOver, setDragColOver]     = useState<string | null>(null);

  // What's being dragged — 'idea:<id>' or 'col:<id>'
  const dragPayload = useRef<string | null>(null);

  // ── idea drag ──────────────────────────────────────────────────────────────

  const handleIdeaDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragPayload.current = `idea:${id}`;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `idea:${id}`);
  }, []);

  const handleIdeaDragEnd = useCallback(() => {
    dragPayload.current = null;
    setDragOverColId(null);
  }, []);

  // ── column drag ────────────────────────────────────────────────────────────

  const handleColDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragPayload.current = `col:${id}`;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `col:${id}`);
    e.stopPropagation(); // don't bubble to idea drag handlers
  }, []);

  const handleColDragEnd = useCallback(() => {
    dragPayload.current = null;
    setDragColOver(null);
  }, []);

  // ── dragover / drop (shared for columns as drop targets) ──────────────────

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const payload = dragPayload.current;
    if (!payload) return;
    if (payload.startsWith('idea:')) {
      setDragOverColId(colId);
      setDragColOver(null);
    } else if (payload.startsWith('col:')) {
      setDragColOver(colId);
      setDragOverColId(null);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColId(null);
    setDragColOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const payload = dragPayload.current ?? e.dataTransfer.getData('text/plain');
    if (!payload) return;

    if (payload.startsWith('idea:')) {
      const ideaId = payload.slice(5);
      updateIdea(ideaId, { status: targetColId });
    } else if (payload.startsWith('col:')) {
      const srcId = payload.slice(4);
      if (srcId === targetColId) return;
      // Reorder: move srcId to the position of targetColId
      const cols = [...ideaColumns];
      const fromIdx = cols.findIndex(c => c.id === srcId);
      const toIdx   = cols.findIndex(c => c.id === targetColId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = cols.splice(fromIdx, 1);
      cols.splice(toIdx, 0, moved);
      setIdeaColumns(cols);
    }

    setDragOverColId(null);
    setDragColOver(null);
    dragPayload.current = null;
  }, [updateIdea, ideaColumns, setIdeaColumns]);

  // ── column CRUD ────────────────────────────────────────────────────────────

  function renameColumn(id: string, label: string) {
    setIdeaColumns(ideaColumns.map(c => c.id === id ? { ...c, label } : c));
  }

  function recolorColumn(id: string, color: string) {
    setIdeaColumns(ideaColumns.map(c => c.id === id ? { ...c, color } : c));
  }

  function deleteColumn(id: string) {
    if (ideaColumns.length <= 1) return;
    // Move ideas from deleted column to the first remaining column
    const remaining = ideaColumns.filter(c => c.id !== id);
    const fallback  = remaining[0].id;
    ideas.filter(i => i.status === id).forEach(i => updateIdea(i.id, { status: fallback }));
    setIdeaColumns(remaining);
  }

  function addColumn(label: string, color: string) {
    setIdeaColumns([
      ...ideaColumns,
      { id: `col-${Date.now()}`, label, color },
    ]);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white">Ideas Board</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {ideas.length} idea{ideas.length !== 1 ? 's' : ''} ·{' '}
            drag cards between columns · drag column headers to reorder
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setAddingTo(ideaColumns[0]?.id ?? 'draft')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500
                     text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New idea
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
        <div className="flex gap-4 h-full min-w-max items-start">
          {ideaColumns.map(col => (
            <Column
              key={col.id}
              col={col}
              columns={ideaColumns}
              ideas={ideas.filter(i => i.status === col.id)}
              colCount={ideaColumns.length}
              isDragOver={dragOverColId === col.id}
              isColDragOver={dragColOver === col.id}
              onAddIdea={() => setAddingTo(col.id)}
              onOpenIdea={setOpenIdeaId}
              onRename={renameColumn}
              onRecolor={recolorColumn}
              onDeleteCol={deleteColumn}
              onIdeaDragStart={handleIdeaDragStart}
              onIdeaDragEnd={handleIdeaDragEnd}
              onColDragStart={handleColDragStart}
              onColDragEnd={handleColDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={handleDragLeave}
            />
          ))}

          <AddColumnButton onAdd={addColumn} />
        </div>
      </div>

      {addingTo && (
        <AddIdeaModal defaultStatus={addingTo} onClose={() => setAddingTo(null)} />
      )}

      <AnimatePresence>
        {openIdeaId && (
          <IdeaDetailPanel ideaId={openIdeaId} onClose={() => setOpenIdeaId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
