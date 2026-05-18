'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import TagChip from '@/components/TagChip';
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

export default function FlowView() {
  const { videos, segments, activeVideoId, selectedSegmentId, setSelectedSegment, setActiveVideo, setActiveView } = useStore();

  const videosToShow = activeVideoId
    ? videos.filter(v => v.id === activeVideoId)
    : videos.slice(0, 2);

  function getVideoSegments(videoId: string) {
    return [...segments.filter(s => s.videoId === videoId)].sort((a, b) => a.start - b.start);
  }

  function handleNodeClick(segId: string, videoId: string) {
    setSelectedSegment(segId);
    if (videoId !== activeVideoId) {
      setActiveVideo(videoId);
    }
  }

  if (!videos.length) {
    return <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No videos to display</div>;
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-sm font-semibold text-white">Flow View</h2>
        <span className="text-xs text-zinc-600">— segment progression per video</span>
      </div>

      <div className="flex flex-col gap-10">
        {videosToShow.map(video => {
          const segs = getVideoSegments(video.id);
          // Group by descriptive layer primarily
          const mainSegs = segs.filter(s => s.layerType === 'descriptive').length > 0
            ? segs.filter(s => s.layerType === 'descriptive')
            : segs;

          // Unique time ranges for nodes
          const nodes = mainSegs;

          return (
            <div key={video.id}>
              {/* Video header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 rounded-full bg-violet-500" />
                <div>
                  <div className="text-sm font-semibold text-white">{video.title}</div>
                  <div className="text-xs text-zinc-500">{video.duration}s · {video.platform}</div>
                </div>
                <button
                  onClick={() => { setActiveVideo(video.id); }}
                  className="ml-auto text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Open in timeline →
                </button>
              </div>

              {nodes.length === 0 ? (
                <div className="px-4 py-6 rounded-xl border border-dashed border-white/[0.06] text-center text-xs text-zinc-600">
                  No segments yet — add segments in the Timeline view
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="flex items-start gap-0 min-w-max">
                    {nodes.map((seg, i) => {
                      const isSelected = selectedSegmentId === seg.id;
                      const width = Math.max(100, Math.min(180, (seg.end - seg.start) * 8));
                      // Framework tags for this time range
                      const fwTags = segs.filter(s =>
                        s.layerType === 'framework' &&
                        s.start < seg.end &&
                        s.end > seg.start
                      ).flatMap(s => s.tags);

                      return (
                        <div key={seg.id} className="flex items-start">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleNodeClick(seg.id, video.id)}
                            className={cn(
                              'cursor-pointer rounded-xl border p-3 flex flex-col gap-2 transition-all',
                              isSelected
                                ? 'border-violet-500/60 bg-violet-500/[0.08] shadow-lg shadow-violet-500/10'
                                : 'border-white/[0.07] bg-[#15151a] hover:border-white/[0.14] hover:bg-[#1a1a21]'
                            )}
                            style={{ width }}
                          >
                            {/* Time range */}
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono text-zinc-500">{formatTime(seg.start)}</span>
                              <span className="text-[9px] font-mono text-zinc-600">{formatTime(seg.end)}</span>
                            </div>

                            {/* Color bar */}
                            <div
                              className="h-1 rounded-full"
                              style={{ backgroundColor: LAYER_COLORS[seg.layerType] || '#6b7280' }}
                            />

                            {/* Label */}
                            <div className="text-xs font-semibold text-zinc-100 leading-tight line-clamp-2">{seg.label}</div>

                            {/* Descriptive tags */}
                            <div className="flex flex-wrap gap-1">
                              {seg.tags.slice(0, 2).map(t => (
                                <TagChip key={t} name={t} size="xs" />
                              ))}
                            </div>

                            {/* Framework tags (overlapping) */}
                            {fwTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 border-t border-white/[0.06] pt-1.5">
                                {[...new Set(fwTags)].slice(0, 2).map(t => (
                                  <TagChip key={t} name={t} size="xs" />
                                ))}
                              </div>
                            )}

                            {/* Duration indicator */}
                            <div className="text-[9px] text-zinc-600 text-right">{seg.end - seg.start}s</div>
                          </motion.div>

                          {/* Arrow connector */}
                          {i < nodes.length - 1 && (
                            <div className="flex items-center self-center mx-1">
                              <ArrowRight className="w-4 h-4 text-zinc-700" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Framework overlay legend */}
      <div className="mt-8 p-4 rounded-xl border border-white/[0.06] bg-[#111114]">
        <div className="text-xs font-semibold text-zinc-400 mb-3">Layer legend</div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(LAYER_COLORS).map(([layer, color]) => (
            <div key={layer} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-zinc-500 capitalize">{layer}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
