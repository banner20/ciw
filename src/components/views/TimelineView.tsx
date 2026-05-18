'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, Trash2, Sparkles, ChevronDown, X, FileText, Check, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Segment } from '@/types';
import TagChip from '@/components/TagChip';
import TagAutocomplete from '@/components/TagAutocomplete';
import { suggestTagsForLayer } from '@/lib/heuristics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RetentionImporter from '@/components/RetentionImporter';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const LAYER_TYPES = ['descriptive', 'framework', 'structural', 'audio', 'visual', 'custom'] as const;
type LayerKey = typeof LAYER_TYPES[number];

const LAYER_COLORS: Record<string, string> = {
  descriptive: '#3b82f6',
  framework:   '#8b5cf6',
  structural:  '#f59e0b',
  audio:       '#10b981',
  visual:      '#ec4899',
  custom:      '#6b7280',
};

// ─── Floating tag panel ───────────────────────────────────────────────────────

interface PanelProps {
  selection: { start: number; end: number };
  duration: number;
  videoId: string;
  layer: LayerKey;
  anchorPct: number;       // 0-100, left% within track area
  trackContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

function TagPanel({ selection, duration, videoId, layer, anchorPct, trackContainerRef, onClose }: PanelProps) {
  const { addSegment, incrementTagUsage } = useStore();
  const [tags, setTags]   = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>(layer);
  const panelRef = useRef<HTMLDivElement>(null);
  const suggestions = suggestTagsForLayer(selectedLayer, selection.start, selection.end, duration);
  const dur = Math.round(selection.end - selection.start);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  function save() {
    if (!tags.length && !label) return;
    const seg: Segment = {
      id: `seg-${Date.now()}`,
      videoId,
      start: selection.start,
      end:   selection.end,
      label: label || tags[0] || 'Segment',
      notes: '',
      layerType: selectedLayer,
      tags,
      color: LAYER_COLORS[selectedLayer],
    };
    addSegment(seg);
    tags.forEach(t => incrementTagUsage(t));
    onClose();
  }

  // Position: anchor to left edge of selection, flip left if near right edge
  const containerWidth = trackContainerRef.current?.clientWidth ?? 900;
  const TRACK_LEFT_OFFSET = 112;
  const TRACK_RIGHT_PAD   = 16;
  const trackPxWidth = containerWidth - TRACK_LEFT_OFFSET - TRACK_RIGHT_PAD;
  const panelWidth   = 320;
  let leftPx = TRACK_LEFT_OFFSET + (anchorPct / 100) * trackPxWidth;
  if (leftPx + panelWidth > containerWidth - 8) leftPx = Math.max(8, containerWidth - panelWidth - 8);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-2 z-50 w-80 rounded-xl border border-white/10 bg-[#1e1e24] shadow-2xl p-4"
      style={{ left: leftPx }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white">New segment</span>
        <span className="text-[11px] font-mono text-zinc-400">
          {formatTime(selection.start)} → {formatTime(selection.end)}
          <span className="text-zinc-600 ml-1">· {dur}s</span>
        </span>
        <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors ml-2">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Label */}
      <input
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="Label (optional)"
        autoFocus
        className="w-full mb-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
      />

      {/* Layer pills */}
      <div className="flex gap-1 mb-2.5 flex-wrap">
        {LAYER_TYPES.map(l => (
          <button
            key={l}
            onClick={() => setSelectedLayer(l)}
            className={cn(
              'px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all',
              selectedLayer === l ? 'border-transparent text-white' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300 bg-white/[0.02]'
            )}
            style={selectedLayer === l ? { background: LAYER_COLORS[l] + '28', color: LAYER_COLORS[l], borderColor: LAYER_COLORS[l] + '55' } : {}}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Tags + suggestions */}
      <TagAutocomplete selectedTags={tags} onChange={setTags} suggestions={suggestions} />

      {suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-[10px] text-amber-400/80">{selectedLayer} suggestions in dropdown</span>
        </div>
      )}

      <Button
        onClick={save}
        disabled={!tags.length && !label}
        size="sm"
        className="w-full mt-3 bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 gap-1.5 disabled:opacity-30"
      >
        <Check className="w-3.5 h-3.5" />
        Add segment
      </Button>
    </motion.div>
  );
}

// ─── Segment bar (draggable) ──────────────────────────────────────────────────

function SegmentBar({
  seg, duration, trackWidth, isSelected, onClick,
  onMoveStart,
}: {
  seg: Segment; duration: number; trackWidth: number;
  isSelected: boolean; onClick: () => void;
  onMoveStart: (segId: string, mouseX: number) => void;
}) {
  const left  = (seg.start / duration) * trackWidth;
  const width = Math.max(6, ((seg.end - seg.start) / duration) * trackWidth);

  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      style={{
        position: 'absolute', left, width,
        backgroundColor: seg.color + (isSelected ? 'ee' : 'aa'),
        borderLeft: `2px solid ${seg.color}`,
      }}
      className={cn(
        'h-full rounded-sm overflow-hidden transition-shadow cursor-grab active:cursor-grabbing',
        isSelected && 'ring-1 ring-white/30 shadow-lg'
      )}
      onMouseDown={e => {
        e.stopPropagation();
        onMoveStart(seg.id, e.clientX);
      }}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <span className="px-1 text-[9px] text-white font-medium drop-shadow line-clamp-1 pointer-events-none">
        {seg.tags[0] ?? seg.label}
      </span>
    </motion.div>
  );
}

// ─── Retention curve overlay ─────────────────────────────────────────────────

function RetentionOverlay({
  curve,
  trackLeftOffset,
  trackRightPad,
}: {
  curve: number[];
  trackLeftOffset: number;
  trackRightPad: number;
}) {
  // We render as an absolutely-positioned SVG that sits behind the track rows.
  // Height is driven by the parent's content height via a 100% tall div.
  const pts = curve.map((v, i) => {
    const xPct = (i / (curve.length - 1)) * 100;
    // y: 0 = top (100% retention), 100 = bottom (0% retention)
    const yPct = 100 - v;
    return { xPct, yPct };
  });

  const pathData = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.xPct},${p.yPct}`).join(' ');
  const areaData = `M0,100 ${pathData.replace('M', 'L')} L100,100 Z`;

  // Drop zones: segments where retention drops > 8% within 10% of video
  const drops: { xPct: number; dropAmt: number }[] = [];
  for (let i = 1; i < curve.length; i++) {
    const drop = curve[i - 1] - curve[i];
    if (drop > 8) drops.push({ xPct: (i / (curve.length - 1)) * 100, dropAmt: drop });
  }

  return (
    <div
      className="absolute pointer-events-none z-[5]"
      style={{
        left: trackLeftOffset,
        right: trackRightPad,
        top: 8, // below ruler
        bottom: 0,
      }}
    >
      <svg
        className="w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Filled area */}
        <path d={areaData} fill="url(#retentionGrad)" />
        {/* Curve line */}
        <path d={pathData} fill="none" stroke="#8b5cf6" strokeWidth="0.6" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />
        {/* Drop markers */}
        {drops.map((d, i) => (
          <line key={i} x1={d.xPct} y1="0" x2={d.xPct} y2="100"
            stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.35"
            strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* Percentage labels at key points */}
      <div className="absolute inset-0 flex items-start justify-between pointer-events-none px-1" style={{ top: 2 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const idx = Math.round(t * (curve.length - 1));
          const val = curve[idx];
          return (
            <span key={t} className="text-[8px] text-violet-400/60 font-mono tabular-nums leading-none">
              {Math.round(val)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function TimelineView() {
  const {
    activeVideoId, videos, segments,
    addSegment, deleteSegment, updateSegment,
    selectedSegmentId, setSelectedSegment,
    incrementTagUsage, updateVideo,
  } = useStore();

  const video     = videos.find(v => v.id === activeVideoId);
  const videoSegs = segments.filter(s => s.videoId === activeVideoId);

  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);

  // New-segment drag
  const [isDragging,    setIsDragging]    = useState(false);
  const [dragStart,     setDragStart]     = useState<number | null>(null);
  const [dragEnd,       setDragEnd]       = useState<number | null>(null);
  const [dragLayerType, setDragLayerType] = useState<LayerKey>('descriptive');
  const [hoverTime,     setHoverTime]     = useState<number | null>(null);
  const [showPanel,     setShowPanel]     = useState(false);

  // Move existing segment
  const [movingSegId,      setMovingSegId]      = useState<string | null>(null);
  const [moveStartMouseX,  setMoveStartMouseX]  = useState(0);
  const [moveOriginalStart, setMoveOriginalStart] = useState(0);
  const [moveOriginalEnd,   setMoveOriginalEnd]   = useState(0);
  const [movePreview,      setMovePreview]       = useState<{ start: number; end: number } | null>(null);

  // Script panel
  const [scriptOpen, setScriptOpen] = useState(true);
  const [scriptText, setScriptText] = useState(video?.script ?? '');
  useEffect(() => { setScriptText(video?.script ?? ''); }, [activeVideoId, video?.script]);
  function saveScript() {
    if (video && scriptText !== (video.script ?? '')) updateVideo(video.id, { script: scriptText });
  }

  // Retention importer
  const [showImporter, setShowImporter] = useState(false);
  const retentionCurve = video?.retentionCurve ?? null;

  const duration = video?.duration || 60;

  const TRACK_LEFT_OFFSET = 112; // px-4 (16) + w-24 label (96)
  const TRACK_RIGHT_PAD   = 16;

  const trackWidth = useCallback(() =>
    timelineRef.current
      ? timelineRef.current.clientWidth - TRACK_LEFT_OFFSET - TRACK_RIGHT_PAD
      : 800,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  function timeFromX(clientX: number): number {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const tw   = rect.width - TRACK_LEFT_OFFSET - TRACK_RIGHT_PAD;
    const relX = Math.max(0, Math.min(clientX - (rect.left + TRACK_LEFT_OFFSET), tw));
    return (relX / tw) * duration;
  }

  function pctFromTime(t: number) { return (t / duration) * 100; }

  // ── drag to create ────────────────────────────────────────────────────────

  function startDrag(e: React.MouseEvent, layer: LayerKey) {
    if (showPanel || movingSegId) return;
    e.preventDefault();
    const t = timeFromX(e.clientX);
    setIsDragging(true);
    setDragStart(t);
    setDragEnd(t);
    setDragLayerType(layer);
    setSelectedSegment(null);
  }

  function handleContainerMouseMove(e: React.MouseEvent) {
    const t = timeFromX(e.clientX);
    setHoverTime(t);

    if (isDragging) {
      setDragEnd(t);
      return;
    }

    if (movingSegId) {
      const dx   = e.clientX - moveStartMouseX;
      const tw   = trackWidth();
      const dtSec = (dx / tw) * duration;
      const segDur = moveOriginalEnd - moveOriginalStart;
      const newStart = Math.max(0, Math.min(moveOriginalStart + dtSec, duration - segDur));
      setMovePreview({ start: newStart, end: newStart + segDur });
    }
  }

  function handleContainerMouseUp(e: React.MouseEvent) {
    // Commit segment move
    if (movingSegId && movePreview) {
      updateSegment(movingSegId, { start: movePreview.start, end: movePreview.end });
      setMovingSegId(null);
      setMovePreview(null);
      return;
    }

    if (!isDragging) return;
    setIsDragging(false);
    const start = dragStart ?? 0;
    const end   = timeFromX(e.clientX);
    if (Math.abs(end - start) > 0.3) {
      setDragEnd(end);
      setShowPanel(true);
    } else {
      const t = timeFromX(e.clientX);
      setCurrentTime(t);
      if (videoRef.current) videoRef.current.currentTime = t;
      setDragStart(null);
      setDragEnd(null);
    }
  }

  function handleContainerMouseLeave() {
    setHoverTime(null);
    if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null); }
    if (movingSegId && movePreview) {
      updateSegment(movingSegId, { start: movePreview.start, end: movePreview.end });
      setMovingSegId(null);
      setMovePreview(null);
    }
  }

  function startMove(segId: string, mouseX: number) {
    if (showPanel) return;
    const seg = videoSegs.find(s => s.id === segId);
    if (!seg) return;
    setMovingSegId(segId);
    setMoveStartMouseX(mouseX);
    setMoveOriginalStart(seg.start);
    setMoveOriginalEnd(seg.end);
    setMovePreview({ start: seg.start, end: seg.end });
    setSelectedSegment(segId);
  }

  function closePanel() {
    setShowPanel(false);
    setDragStart(null);
    setDragEnd(null);
  }

  // ── playback ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const iv = setInterval(() => {
      if (videoRef.current && isPlaying) setCurrentTime(videoRef.current.currentTime);
      else if (!videoRef.current && isPlaying) {
        setCurrentTime(t => {
          const n = t + 0.1;
          if (n >= duration) { setIsPlaying(false); return 0; }
          return n;
        });
      }
    }, 100);
    return () => clearInterval(iv);
  }, [isPlaying, duration]);

  function togglePlay() {
    if (!videoRef.current) { setIsPlaying(p => !p); return; }
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else           { videoRef.current.play();  setIsPlaying(true);  }
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const layerGroups: Record<string, Segment[]> = {};
  for (const seg of videoSegs) {
    if (!layerGroups[seg.layerType]) layerGroups[seg.layerType] = [];
    layerGroups[seg.layerType].push(seg);
  }

  const tw          = trackWidth();
  const playheadPct = pctFromTime(currentTime);

  const selStart    = Math.min(dragStart ?? 0, dragEnd ?? 0);
  const selEnd      = Math.max(dragStart ?? 0, dragEnd ?? 0);
  const selLeftPct  = pctFromTime(selStart);
  const selWidthPct = pctFromTime(selEnd) - selLeftPct;
  const showDragSel = (isDragging || showPanel) && selWidthPct > 0.1;

  const selectedSeg = videoSegs.find(s => s.id === selectedSegmentId);

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600">
        <p className="text-sm">No video selected — open one from the Library</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ cursor: movingSegId ? 'grabbing' : 'default' }}>

      {/* ── Player ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-black flex items-center gap-4 px-6 py-3 shrink-0" style={{ height: 140 }}>
        <div className="h-full aspect-video rounded-lg bg-[#1a1a1f] border border-white/[0.06] flex items-center justify-center relative overflow-hidden">
          {(video.fileUrl || video.objectUrl) ? (
            <video
              ref={videoRef}
              src={video.fileUrl || video.objectUrl}
              className="h-full w-full object-contain"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-zinc-700">
              <Play className="w-8 h-8 fill-zinc-700" />
              <span className="text-xs">No file · drag timeline rows to annotate</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div>
            <div className="text-sm font-semibold text-white line-clamp-1">{video.title}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{video.platform} · {video.language} · {video.formatType}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }} className="text-zinc-500 hover:text-white transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors">
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white" />}
            </button>
            <span className="text-xs font-mono text-zinc-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer" onClick={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const t = ((e.clientX - r.left) / r.width) * duration;
            setCurrentTime(t); if (videoRef.current) videoRef.current.currentTime = t;
          }}>
            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${playheadPct}%` }} />
          </div>
        </div>

        {selectedSeg && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="w-52 h-full border border-white/[0.06] rounded-lg bg-[#1a1a1f] p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white truncate">{selectedSeg.label}</span>
              <button onClick={() => setSelectedSegment(null)} className="text-zinc-600 hover:text-white shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">{formatTime(selectedSeg.start)} → {formatTime(selectedSeg.end)}</div>
            <div className="flex flex-wrap gap-1 flex-1">{selectedSeg.tags.map(t => <TagChip key={t} name={t} size="xs" />)}</div>
            <button onClick={() => { deleteSegment(selectedSeg.id); setSelectedSegment(null); }}
              className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 transition-colors mt-auto">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Script + Retention toolbar ────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/[0.06] bg-[#111114]">
        <div className="flex items-center">
          <button onClick={() => setScriptOpen(o => !o)} className="flex-1 flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] transition-colors">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400">Script</span>
            {!scriptOpen && scriptText && <span className="text-xs text-zinc-600 truncate flex-1 text-left ml-1">{scriptText.split('\n')[0].slice(0, 80)}</span>}
            {scriptText && scriptOpen && <span className="text-[10px] text-zinc-600 ml-auto mr-1">{scriptText.length} chars</span>}
            <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-600 transition-transform', !scriptOpen && '-rotate-90')} />
          </button>
          {/* Retention import button */}
          <button
            onClick={() => setShowImporter(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-l border-white/[0.06] shrink-0 transition-colors',
              retentionCurve
                ? 'text-violet-400 hover:text-violet-300'
                : 'text-zinc-600 hover:text-zinc-300',
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {retentionCurve ? 'Retention ✓' : 'Add Retention'}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {scriptOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <textarea value={scriptText} onChange={e => setScriptText(e.target.value)} onBlur={saveScript}
                placeholder="Paste your script or transcript here…"
                className="w-full px-4 py-2 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-700 resize-none outline-none leading-relaxed"
                rows={4} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Timeline scroll area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0f0f13] min-h-0">

        {/* Ruler */}
        <div className="sticky top-0 z-10 bg-[#0f0f13] border-b border-white/[0.06]">
          <div className="flex items-center px-4 py-1">
            <div className="w-24 shrink-0 text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Layer</div>
            <div className="relative flex-1 h-5">
              {Array.from({ length: Math.floor(duration) + 1 }, (_, i) => {
                if (i % Math.max(1, Math.floor(duration / 10)) !== 0) return null;
                return (
                  <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: `${(i / duration) * 100}%` }}>
                    <div className="w-px h-2 bg-white/10" />
                    <span className="text-[9px] text-zinc-600 -ml-2">{formatTime(i)}</span>
                  </div>
                );
              })}
              {hoverTime !== null && !showPanel && (
                <div className="absolute top-0 pointer-events-none" style={{ left: `${pctFromTime(hoverTime)}%` }}>
                  <div className="w-px h-2 bg-violet-400" />
                  <span className="text-[9px] text-violet-400 whitespace-nowrap bg-[#0f0f13] px-0.5 -ml-3">{formatTime(hoverTime)}</span>
                </div>
              )}
              <div className="absolute top-0 w-px h-5 bg-violet-500" style={{ left: `${playheadPct}%` }} />
            </div>
          </div>
        </div>

        {/* Tracks container */}
        <div
          ref={timelineRef}
          className="relative px-4 pb-4 select-none"
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseLeave}
        >
          {/* Ghost cursor line */}
          {hoverTime !== null && !showPanel && (
            <div className="absolute top-0 bottom-0 w-px pointer-events-none z-20"
              style={{
                left: `calc(${TRACK_LEFT_OFFSET}px + ${pctFromTime(hoverTime)}% * (100% - ${TRACK_LEFT_OFFSET + TRACK_RIGHT_PAD}px) / 100)`,
                background: isDragging ? 'transparent' : 'rgba(139,92,246,0.3)',
              }}
            />
          )}

          {/* Drag selection */}
          {showDragSel && (
            <>
              <div className="absolute top-0 bottom-0 pointer-events-none z-10 rounded"
                style={{
                  left:  `calc(${TRACK_LEFT_OFFSET}px + ${selLeftPct}% * (100% - ${TRACK_LEFT_OFFSET + TRACK_RIGHT_PAD}px) / 100)`,
                  width: `calc(${selWidthPct}% * (100% - ${TRACK_LEFT_OFFSET + TRACK_RIGHT_PAD}px) / 100)`,
                  background: LAYER_COLORS[dragLayerType] + '22',
                  border: `2px solid ${LAYER_COLORS[dragLayerType]}99`,
                }}
              />
              {/* Time badge */}
              <div className="absolute z-30 pointer-events-none"
                style={{ left: `calc(${TRACK_LEFT_OFFSET}px + ${selLeftPct}% * (100% - ${TRACK_LEFT_OFFSET + TRACK_RIGHT_PAD}px) / 100)`, top: 4 }}>
                <span className="text-[10px] font-mono text-white bg-zinc-900/90 border border-white/10 rounded px-1.5 py-0.5 whitespace-nowrap shadow">
                  {formatTime(selStart)} → {formatTime(selEnd)}
                  {selEnd > selStart && <span className="text-zinc-500 ml-1">· {Math.round(selEnd - selStart)}s</span>}
                </span>
              </div>
            </>
          )}

          {/* Floating tag panel — appears right at selection */}
          <AnimatePresence>
            {showPanel && dragStart !== null && dragEnd !== null && (
              <TagPanel
                selection={{ start: Math.min(dragStart, dragEnd), end: Math.max(dragStart, dragEnd) }}
                duration={duration}
                videoId={activeVideoId!}
                layer={dragLayerType}
                anchorPct={selLeftPct}
                trackContainerRef={timelineRef}
                onClose={closePanel}
              />
            )}
          </AnimatePresence>

          {/* Retention curve overlay — spans all track rows */}
          {retentionCurve && retentionCurve.length > 1 && (
            <RetentionOverlay
              curve={retentionCurve}
              trackLeftOffset={TRACK_LEFT_OFFSET}
              trackRightPad={TRACK_RIGHT_PAD}
            />
          )}

          {/* Track rows */}
          <div className="flex flex-col gap-1 mt-2">
            {LAYER_TYPES.map(layerType => {
              const segs = layerGroups[layerType] ?? [];
              return (
                <div key={layerType} className="flex items-center gap-0 group/row">
                  <div className="w-24 shrink-0 flex items-center gap-1.5 py-1">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: LAYER_COLORS[layerType] + (segs.length ? 'ff' : '44') }} />
                    <span className={cn('text-[10px] font-medium capitalize', segs.length ? 'text-zinc-400' : 'text-zinc-700')}>
                      {layerType}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'flex-1 relative rounded cursor-crosshair transition-colors',
                      segs.length ? 'h-8 bg-white/[0.025]' : 'h-7 bg-white/[0.01] border border-dashed border-white/[0.05]',
                      dragLayerType === layerType && isDragging && 'bg-white/[0.04]',
                    )}
                    onMouseDown={e => startDrag(e, layerType)}
                  >
                    {!segs.length && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-800 group-hover/row:text-zinc-600 transition-colors pointer-events-none">
                        drag to annotate
                      </span>
                    )}

                    {segs.map(seg => {
                      // Show move preview if this seg is being moved
                      const displaySeg = movingSegId === seg.id && movePreview
                        ? { ...seg, ...movePreview }
                        : seg;
                      return (
                        <SegmentBar
                          key={seg.id}
                          seg={displaySeg}
                          duration={duration}
                          trackWidth={tw}
                          isSelected={selectedSegmentId === seg.id}
                          onClick={() => setSelectedSegment(selectedSegmentId === seg.id ? null : seg.id)}
                          onMoveStart={startMove}
                        />
                      );
                    })}

                    <div className="absolute top-0 bottom-0 w-px bg-violet-500/40 pointer-events-none" style={{ left: `${playheadPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Segment list ─────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] bg-[#111114] shrink-0 max-h-32 overflow-y-auto">
        <div className="px-4 py-1.5 flex items-center gap-2 border-b border-white/[0.04] sticky top-0 bg-[#111114]">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Segments</span>
          <span className="text-[10px] text-zinc-700">{videoSegs.length}</span>
        </div>
        {videoSegs.sort((a, b) => a.start - b.start).map(seg => (
          <div key={seg.id} onClick={() => setSelectedSegment(seg.id)}
            className={cn('flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:bg-white/[0.03] transition-colors', selectedSegmentId === seg.id && 'bg-violet-500/10')}>
            <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-20">{formatTime(seg.start)} → {formatTime(seg.end)}</span>
            <span className="text-xs text-zinc-300 font-medium shrink-0">{seg.label}</span>
            <div className="flex gap-1 flex-wrap">{seg.tags.map(t => <TagChip key={t} name={t} size="xs" />)}</div>
          </div>
        ))}
      </div>

      {/* ── Retention importer modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showImporter && video && (
          <RetentionImporter
            duration={duration}
            videoId={video.id}
            existingCurve={retentionCurve ?? undefined}
            onApply={(curve, method) => {
              updateVideo(video.id, { retentionCurve: curve, retentionCurveMethod: method });
            }}
            onClose={() => setShowImporter(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
