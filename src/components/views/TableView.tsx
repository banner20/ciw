'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Filter, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Segment } from '@/types';
import TagChip from '@/components/TagChip';
import TagAutocomplete from '@/components/TagAutocomplete';
import { cn } from '@/lib/utils';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const LAYER_COLORS: Record<string, string> = {
  descriptive: '#3b82f6',
  framework: '#8b5cf6',
  structural: '#f59e0b',
  audio: '#10b981',
  visual: '#ec4899',
  custom: '#6b7280',
};

type SortKey = 'start' | 'end' | 'duration' | 'label' | 'layerType';

interface EditState {
  segId: string;
  label: string;
  tags: string[];
  notes: string;
}

export default function TableView() {
  const { videos, segments, activeVideoId, updateSegment, deleteSegment, addSegment, setSelectedSegment, selectedSegmentId } = useStore();
  const activeVideo = videos.find(v => v.id === activeVideoId);

  const [sortKey, setSortKey] = useState<SortKey>('start');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterLayer, setFilterLayer] = useState<string>('all');
  const [filterVideo, setFilterVideo] = useState<string>(activeVideoId || 'all');
  const [editState, setEditState] = useState<EditState | null>(null);

  const displaySegs = useMemo(() => {
    let segs = [...segments];
    if (filterVideo !== 'all') segs = segs.filter(s => s.videoId === filterVideo);
    if (filterLayer !== 'all') segs = segs.filter(s => s.layerType === filterLayer);
    segs.sort((a, b) => {
      let av: string | number = a[sortKey as keyof Segment] as string | number;
      let bv: string | number = b[sortKey as keyof Segment] as string | number;
      if (sortKey === 'duration') { av = a.end - a.start; bv = b.end - b.start; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return segs;
  }, [segments, filterVideo, filterLayer, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function startEdit(seg: Segment) {
    setEditState({ segId: seg.id, label: seg.label, tags: [...seg.tags], notes: seg.notes });
  }

  function saveEdit() {
    if (!editState) return;
    updateSegment(editState.segId, { label: editState.label, tags: editState.tags, notes: editState.notes });
    setEditState(null);
  }

  const videoMap = Object.fromEntries(videos.map(v => [v.id, v.title]));
  const layers = ['all', 'descriptive', 'framework', 'structural', 'audio', 'visual', 'custom'];

  function addNewRow() {
    const vid = filterVideo !== 'all' ? filterVideo : (activeVideoId || videos[0]?.id);
    if (!vid) return;
    const video = videos.find(v => v.id === vid);
    const newSeg: Segment = {
      id: `seg-${Date.now()}`,
      videoId: vid,
      start: 0,
      end: 5,
      label: 'New segment',
      notes: '',
      layerType: 'descriptive',
      tags: [],
      color: LAYER_COLORS.descriptive,
    };
    addSegment(newSeg);
    setTimeout(() => startEdit(newSeg), 50);
  }

  const ColHeader = ({ label, sortable, sortId }: { label: string; sortable?: boolean; sortId?: SortKey }) => (
    <th
      className={cn('text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider py-2 px-3', sortable && 'cursor-pointer hover:text-zinc-300')}
      onClick={() => sortable && sortId && toggleSort(sortId)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortable && <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </div>
    </th>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#111114] shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>
        <select
          value={filterVideo}
          onChange={e => setFilterVideo(e.target.value)}
          className="h-7 px-2 rounded bg-white/[0.04] border border-white/10 text-xs text-zinc-300"
        >
          <option value="all">All videos</option>
          {videos.map(v => <option key={v.id} value={v.id}>{v.title.slice(0, 40)}</option>)}
        </select>
        <select
          value={filterLayer}
          onChange={e => setFilterLayer(e.target.value)}
          className="h-7 px-2 rounded bg-white/[0.04] border border-white/10 text-xs text-zinc-300"
        >
          {layers.map(l => <option key={l} value={l}>{l === 'all' ? 'All layers' : l}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-zinc-600">{displaySegs.length} segments</span>
        <button
          onClick={addNewRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add row
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#111114]">
            <tr className="border-b border-white/[0.06]">
              <ColHeader label="Layer" />
              <ColHeader label="Video" />
              <ColHeader label="Start" sortable sortId="start" />
              <ColHeader label="End" sortable sortId="end" />
              <ColHeader label="Duration" sortable sortId="duration" />
              <ColHeader label="Label" sortable sortId="label" />
              <ColHeader label="Tags" />
              <ColHeader label="Notes" />
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {displaySegs.map((seg, i) => {
              const isEditing = editState?.segId === seg.id;
              const isSelected = selectedSegmentId === seg.id;
              return (
                <motion.tr
                  key={seg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedSegment(isSelected ? null : seg.id)}
                  className={cn(
                    'border-b border-white/[0.04] cursor-pointer transition-colors group',
                    isSelected ? 'bg-violet-500/[0.08]' : 'hover:bg-white/[0.02]',
                    i % 2 === 0 ? '' : 'bg-white/[0.01]'
                  )}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LAYER_COLORS[seg.layerType] || '#6b7280' }} />
                      <span className="text-[10px] text-zinc-500 capitalize">{seg.layerType}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[11px] text-zinc-400 line-clamp-1 max-w-[120px]">{videoMap[seg.videoId]?.slice(0, 25) || '—'}</span>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-zinc-300">{formatTime(seg.start)}</td>
                  <td className="py-2 px-3 font-mono text-xs text-zinc-300">{formatTime(seg.end)}</td>
                  <td className="py-2 px-3 font-mono text-xs text-zinc-500">{formatTime(seg.end - seg.start)}</td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        value={editState.label}
                        onChange={e => setEditState(s => s ? { ...s, label: e.target.value } : s)}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-white/[0.04] border border-violet-500/40 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs text-zinc-200 font-medium">{seg.label}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <div onClick={e => e.stopPropagation()}>
                        <TagAutocomplete
                          selectedTags={editState.tags}
                          onChange={tags => setEditState(s => s ? { ...s, tags } : s)}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {seg.tags.slice(0, 3).map(t => <TagChip key={t} name={t} size="xs" />)}
                        {seg.tags.length > 3 && <span className="text-[10px] text-zinc-600">+{seg.tags.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        value={editState.notes}
                        onChange={e => setEditState(s => s ? { ...s, notes: e.target.value } : s)}
                        onClick={e => e.stopPropagation()}
                        placeholder="Notes…"
                        className="w-full bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-xs text-zinc-300 outline-none"
                      />
                    ) : (
                      <span className="text-xs text-zinc-600 line-clamp-1">{seg.notes || '—'}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditState(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(seg)} className="text-zinc-500 hover:text-zinc-300"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteSegment(seg.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {displaySegs.length === 0 && (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
            No segments match the current filters
          </div>
        )}
      </div>
    </div>
  );
}
