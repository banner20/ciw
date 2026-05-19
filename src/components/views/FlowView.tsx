'use client';
import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Search, Layers, TrendingUp, ExternalLink, X, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Video, Segment } from '@/types';

// ── constants ─────────────────────────────────────────────────────────────────

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; solid: string }> = {
  descriptive: { bg: 'bg-blue-500/25',   border: 'border-blue-500/40',   text: 'text-blue-300',   solid: '#3b82f6' },
  framework:   { bg: 'bg-violet-500/25', border: 'border-violet-500/40', text: 'text-violet-300', solid: '#8b5cf6' },
  structural:  { bg: 'bg-amber-500/25',  border: 'border-amber-500/40',  text: 'text-amber-300',  solid: '#f59e0b' },
  audio:       { bg: 'bg-emerald-500/25',border: 'border-emerald-500/40',text: 'text-emerald-300',solid: '#10b981' },
  visual:      { bg: 'bg-pink-500/25',   border: 'border-pink-500/40',   text: 'text-pink-300',   solid: '#ec4899' },
  custom:      { bg: 'bg-zinc-500/25',   border: 'border-zinc-500/40',   text: 'text-zinc-300',   solid: '#6b7280' },
};

const LAYER_ORDER = ['descriptive', 'framework', 'structural', 'audio', 'visual', 'custom'];
const TRACK_HEIGHT = 14; // px per layer row
const TRACK_GAP    = 2;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
}

// ── Pattern detection ─────────────────────────────────────────────────────────
// A "pattern" is a tag that appears at the same relative position (±12%) in ≥2 videos

interface Pattern {
  tag:       string;
  videos:    string[]; // videoIds
  avgRelPos: number;   // 0-1
}

function detectPatterns(
  videos: Video[],
  segments: Segment[],
  minVideos = 2,
  tolerance = 0.12
): Pattern[] {
  // tag → [{videoId, relPos}]
  const tagMap: Record<string, { videoId: string; relPos: number }[]> = {};

  for (const seg of segments) {
    const video = videos.find(v => v.id === seg.videoId);
    if (!video || video.duration <= 0) continue;
    const relPos = (seg.start + seg.end) / 2 / video.duration;
    for (const tag of seg.tags) {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push({ videoId: seg.videoId, relPos });
    }
  }

  const patterns: Pattern[] = [];
  for (const [tag, occurrences] of Object.entries(tagMap)) {
    // Cluster occurrences within tolerance
    const used = new Set<number>();
    for (let i = 0; i < occurrences.length; i++) {
      if (used.has(i)) continue;
      const cluster = [occurrences[i]];
      used.add(i);
      for (let j = i + 1; j < occurrences.length; j++) {
        if (!used.has(j) && Math.abs(occurrences[j].relPos - occurrences[i].relPos) <= tolerance) {
          cluster.push(occurrences[j]);
          used.add(j);
        }
      }
      const uniqueVideos = [...new Set(cluster.map(c => c.videoId))];
      if (uniqueVideos.length >= minVideos) {
        patterns.push({
          tag,
          videos:    uniqueVideos,
          avgRelPos: cluster.reduce((a, c) => a + c.relPos, 0) / cluster.length,
        });
      }
    }
  }

  return patterns.sort((a, b) => b.videos.length - a.videos.length);
}

// ── Segment tooltip ───────────────────────────────────────────────────────────

interface TooltipData {
  seg:   Segment;
  video: Video;
  x:     number;
  y:     number;
}

function SegmentTooltip({ data, onClose }: { data: TooltipData; onClose: () => void }) {
  const lc = LAYER_COLORS[data.seg.layerType] ?? LAYER_COLORS.custom;
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: Math.min(data.x + 12, window.innerWidth - 260), top: data.y - 8 }}
    >
      <div className="w-56 bg-[#1e1e26] border border-white/[0.12] rounded-xl p-3 shadow-2xl space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lc.solid }} />
          <span className="text-xs font-semibold text-white truncate">{data.seg.label || 'Unnamed segment'}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>{fmt(data.seg.start)} → {fmt(data.seg.end)}</span>
          <span>·</span>
          <span>{data.seg.end - data.seg.start}s</span>
          <span>·</span>
          <span className="capitalize">{data.seg.layerType}</span>
        </div>
        {data.seg.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.seg.tags.map(t => (
              <span key={t} className={cn('px-1.5 py-0.5 rounded-full text-[10px] border', lc.bg, lc.border, lc.text)}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="text-[10px] text-zinc-600 truncate">{data.video.title}</div>
      </div>
    </div>
  );
}

// ── Video track ───────────────────────────────────────────────────────────────

interface TrackProps {
  video:          Video;
  segments:       Segment[];
  activeLayers:   Set<string>;
  patternMap:     Map<string, Pattern>; // tag → pattern
  highlightTag:   string | null;
  selectedSegId:  string | null;
  onSegClick:     (seg: Segment) => void;
  onHover:        (data: TooltipData | null) => void;
  onOpenTimeline: (videoId: string) => void;
}

function VideoTrack({
  video, segments, activeLayers, patternMap, highlightTag,
  selectedSegId, onSegClick, onHover, onOpenTimeline,
}: TrackProps) {
  const dur = video.duration || 1;

  // Group segments by layer, in display order
  const layerGroups = LAYER_ORDER
    .filter(l => activeLayers.has(l))
    .map(layer => ({
      layer,
      segs: segments.filter(s => s.videoId === video.id && s.layerType === layer)
                    .sort((a, b) => a.start - b.start),
    }))
    .filter(g => g.segs.length > 0);

  const trackH = Math.max(1, layerGroups.length) * (TRACK_HEIGHT + TRACK_GAP) - TRACK_GAP;

  const retentionPoints = video.retentionCurve ?? [];

  return (
    <div className="group/track">
      {/* Track header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-[180px] shrink-0 flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-4 rounded-full bg-violet-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate leading-tight">{video.title}</div>
            <div className="text-[10px] text-zinc-600">{fmt(dur)} · {video.platform}</div>
          </div>
        </div>
        <button
          onClick={() => onOpenTimeline(video.id)}
          className="opacity-0 group-hover/track:opacity-100 transition-opacity ml-auto shrink-0 flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300"
        >
          <ExternalLink className="w-3 h-3" />Timeline
        </button>
      </div>

      {/* Timeline bar area */}
      <div className="ml-[188px]">
        {/* Time ruler */}
        <div className="relative h-3 mb-1">
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <div key={pct} className="absolute flex flex-col items-center" style={{ left: `${pct * 100}%` }}>
              <div className="w-px h-2 bg-white/[0.08]" />
              <span className="text-[9px] text-zinc-700 -translate-x-1/2">{fmt(dur * pct)}</span>
            </div>
          ))}
        </div>

        {/* Retention curve background */}
        {retentionPoints.length > 1 && (
          <div className="relative h-3 mb-1 rounded overflow-hidden bg-white/[0.02]">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <polyline
                points={retentionPoints.map((r, i) =>
                  `${(i / (retentionPoints.length - 1)) * 100}%,${(1 - r / 100) * 100}%`
                ).join(' ')}
                fill="none"
                stroke="rgba(139,92,246,0.4)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        )}

        {/* Segment layers */}
        <div
          className="relative rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.06]"
          style={{ height: trackH }}
        >
          {layerGroups.map(({ layer, segs }, li) => {
            const top = li * (TRACK_HEIGHT + TRACK_GAP);
            return segs.map(seg => {
              const left  = (seg.start / dur) * 100;
              const width = Math.max(0.3, ((seg.end - seg.start) / dur) * 100);
              const lc    = LAYER_COLORS[layer] ?? LAYER_COLORS.custom;
              const isSelected = selectedSegId === seg.id;
              const hasPattern = seg.tags.some(t => patternMap.has(t));
              const isHighlighted = highlightTag ? seg.tags.includes(highlightTag) : false;
              const isDimmed = highlightTag && !isHighlighted;

              return (
                <div
                  key={seg.id}
                  className={cn(
                    'absolute rounded-sm border cursor-pointer transition-all',
                    lc.bg, lc.border,
                    isSelected && 'ring-1 ring-white/60 z-10',
                    isDimmed && 'opacity-20',
                    isHighlighted && 'ring-2 ring-yellow-400/60 z-10',
                  )}
                  style={{
                    left:   `${left}%`,
                    width:  `${width}%`,
                    top:    top,
                    height: TRACK_HEIGHT,
                    ...(hasPattern && !isDimmed ? { boxShadow: `0 0 0 1px ${lc.solid}80` } : {}),
                  }}
                  onClick={() => onSegClick(seg)}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onHover({ seg, video, x: rect.right, y: rect.top });
                  }}
                  onMouseLeave={() => onHover(null)}
                >
                  {width > 5 && (
                    <span className={cn('absolute inset-0 px-1 flex items-center text-[8px] font-medium truncate', lc.text)}>
                      {seg.label || seg.tags[0] || ''}
                    </span>
                  )}
                </div>
              );
            });
          })}

          {/* Empty state inside track */}
          {layerGroups.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-700">
              No segments for selected layers
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pattern sidebar ───────────────────────────────────────────────────────────

function PatternSidebar({
  patterns,
  highlightTag,
  onHighlight,
}: {
  patterns:     Pattern[];
  highlightTag: string | null;
  onHighlight:  (tag: string | null) => void;
}) {
  if (patterns.length === 0) {
    return (
      <div className="w-[200px] shrink-0 border-l border-white/[0.06] bg-[#111114] p-4">
        <div className="text-[11px] font-semibold text-zinc-500 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" />Patterns
        </div>
        <p className="text-[11px] text-zinc-700 leading-relaxed">
          Patterns appear when the same tag is used at similar positions across 2+ videos.
          Add segments to see patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="w-[200px] shrink-0 border-l border-white/[0.06] bg-[#111114] flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-violet-400" />
          Repeated Patterns
        </div>
        <p className="text-[10px] text-zinc-600 mt-0.5">Tags at similar positions</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {patterns.slice(0, 20).map(p => {
          const posLabel = p.avgRelPos < 0.15 ? 'opening' :
                           p.avgRelPos < 0.4  ? 'early' :
                           p.avgRelPos < 0.65 ? 'middle' :
                           p.avgRelPos < 0.85 ? 'late' : 'closing';
          const isActive = highlightTag === p.tag;
          return (
            <button
              key={p.tag}
              onClick={() => onHighlight(isActive ? null : p.tag)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl border transition-all',
                isActive
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12] hover:text-white'
              )}
            >
              <div className="text-[11px] font-medium truncate">{p.tag}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] text-zinc-600">{p.videos.length} videos · {posLabel}</span>
                <span className="text-[9px]" style={{ color: `hsl(${Math.round(p.avgRelPos * 240)}, 70%, 60%)` }}>
                  {Math.round(p.avgRelPos * 100)}%
                </span>
              </div>
              {/* Position bar */}
              <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-400/50"
                  style={{ width: '12%', marginLeft: `${Math.max(0, p.avgRelPos * 100 - 6)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FlowView() {
  const { videos, segments, setActiveVideo, setActiveView, activeVideoId } = useStore();

  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(LAYER_ORDER));
  const [highlightTag, setHighlightTag] = useState<string | null>(null);
  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [videoFilter, setVideoFilter] = useState<'all' | 'active'>('all');
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  const videosToShow = useMemo(() => {
    if (videoFilter === 'active' && activeVideoId) {
      return videos.filter(v => v.id === activeVideoId);
    }
    return [...videos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [videos, segments, videoFilter, activeVideoId]);

  const patterns = useMemo(() =>
    detectPatterns(videos, segments, 2, 0.12),
    [videos, segments]
  );

  const filteredPatterns = useMemo(() =>
    tagSearch
      ? patterns.filter(p => p.tag.toLowerCase().includes(tagSearch.toLowerCase()))
      : patterns,
    [patterns, tagSearch]
  );

  function handleSegClick(seg: Segment) {
    setSelectedSegId(seg.id === selectedSegId ? null : seg.id);
  }

  function handleOpenTimeline(videoId: string) {
    setActiveVideo(videoId);
    setActiveView('timeline');
  }

  function toggleLayer(layer: string) {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        if (next.size > 1) next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }

  const patternMap = useMemo(() => {
    const m = new Map<string, Pattern>();
    for (const p of patterns) m.set(p.tag, p);
    return m;
  }, [patterns]);

  if (!videos.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
          <Layers className="w-5 h-5 text-zinc-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-zinc-400">No videos yet</div>
          <div className="text-xs text-zinc-600 mt-1">Add videos and tag segments to see their flow patterns</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-white/[0.06] shrink-0 flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-white">Flow View</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Segment structure across {videosToShow.length} video{videosToShow.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Tag search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
              <input
                placeholder="Highlight tag…"
                value={tagSearch}
                onChange={e => { setTagSearch(e.target.value); if (e.target.value === '') setHighlightTag(null); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagSearch) {
                    const match = patterns.find(p => p.tag.toLowerCase().includes(tagSearch.toLowerCase()));
                    if (match) setHighlightTag(match.tag);
                  }
                  if (e.key === 'Escape') { setTagSearch(''); setHighlightTag(null); }
                }}
                className="pl-7 pr-3 py-1 w-40 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500/30"
              />
              {highlightTag && (
                <button onClick={() => { setHighlightTag(null); setTagSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Video filter */}
            <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.07]">
              {(['all', 'active'] as const).map(v => (
                <button key={v} onClick={() => setVideoFilter(v)}
                  className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize',
                    videoFilter === v ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-400')}>
                  {v === 'all' ? `All (${videos.length})` : 'Active'}
                </button>
              ))}
            </div>

            {/* Layer filter */}
            <div className="relative">
              <button onClick={() => setShowLayerPicker(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[11px] text-zinc-400 hover:text-white transition-colors">
                <Layers className="w-3 h-3" />
                Layers ({activeLayers.size})
                <ChevronDown className="w-3 h-3" />
              </button>
              {showLayerPicker && (
                <div className="absolute right-0 top-8 z-20 bg-[#1e1e26] border border-white/10 rounded-xl py-1.5 w-44 shadow-xl"
                     onClick={e => e.stopPropagation()}>
                  {LAYER_ORDER.map(layer => {
                    const lc = LAYER_COLORS[layer];
                    const active = activeLayers.has(layer);
                    return (
                      <button key={layer} onClick={() => toggleLayer(layer)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.04] transition-colors">
                        <div className={cn('w-3 h-3 rounded-sm border transition-colors', active ? lc.bg + ' ' + lc.border : 'bg-transparent border-white/20')} />
                        <span className={cn('text-xs capitalize', active ? lc.text : 'text-zinc-600')}>{layer}</span>
                        <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: lc.solid, opacity: active ? 1 : 0.3 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-2 border-b border-white/[0.04] flex items-center gap-4 shrink-0 flex-wrap">
          {LAYER_ORDER.filter(l => activeLayers.has(l)).map(layer => {
            const lc = LAYER_COLORS[layer];
            return (
              <div key={layer} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: lc.solid + '60', border: `1px solid ${lc.solid}80` }} />
                <span className="text-[10px] text-zinc-500 capitalize">{layer}</span>
              </div>
            );
          })}
          {patterns.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-3 rounded-sm bg-yellow-400/20 border border-yellow-400/40" />
              <span className="text-[10px] text-zinc-500">Highlighted pattern</span>
            </div>
          )}
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6" onClick={() => setShowLayerPicker(false)}>
          {videosToShow.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-zinc-600">
              No videos match current filter
            </div>
          ) : (
            videosToShow.map(video => (
              <VideoTrack
                key={video.id}
                video={video}
                segments={segments}
                activeLayers={activeLayers}
                patternMap={patternMap}
                highlightTag={highlightTag}
                selectedSegId={selectedSegId}
                onSegClick={handleSegClick}
                onHover={setTooltip}
                onOpenTimeline={handleOpenTimeline}
              />
            ))
          )}
        </div>
      </div>

      {/* Pattern sidebar */}
      <PatternSidebar
        patterns={filteredPatterns}
        highlightTag={highlightTag}
        onHighlight={setHighlightTag}
      />

      {/* Tooltip */}
      {tooltip && <SegmentTooltip data={tooltip} onClose={() => setTooltip(null)} />}
    </div>
  );
}
