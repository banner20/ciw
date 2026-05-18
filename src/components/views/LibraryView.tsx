'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Eye, Heart, Share2, TrendingUp, Film, Plus, Pencil } from 'lucide-react';
import { useStore } from '@/store/useStore';
import TagChip from '@/components/TagChip';
import AddVideoModal from '@/components/AddVideoModal';
import { Video } from '@/types';
import { Button } from '@/components/ui/button';

function formatNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok:    'bg-black text-white border-zinc-700',
  instagram: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white border-transparent',
  youtube:   'bg-red-600 text-white border-transparent',
  twitter:   'bg-sky-500 text-white border-transparent',
  linkedin:  'bg-blue-700 text-white border-transparent',
  other:     'bg-zinc-700 text-zinc-200 border-zinc-600',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', other: 'Other',
};

function VideoCard({
  video,
  onClick,
  onEdit,
  segmentTags,
}: {
  video: Video;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  segmentTags: string[];
}) {
  const hasMetrics = video.metrics.views > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-white/[0.07] bg-[#15151a] hover:border-violet-500/30 hover:bg-[#17171d] transition-all overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="w-10 h-10 text-zinc-700" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/50 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
        >
          <Pencil className="w-3 h-3 text-zinc-300" />
        </button>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
          {formatDuration(video.duration)}
        </div>

        {/* Platform badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold border ${PLATFORM_COLORS[video.platform]}`}>
          {video.platform}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-zinc-100 leading-tight line-clamp-2 group-hover:text-white transition-colors">
            {video.title}
          </h3>
          <span className="shrink-0 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {LANG_LABELS[video.language]}
          </span>
        </div>

        {/* Metrics — show placeholder if not yet fetched */}
        {hasMetrics ? (
          <div className="grid grid-cols-4 gap-1 mb-3">
            {[
              { icon: Eye,       value: formatNum(video.metrics.views),           label: 'views' },
              { icon: TrendingUp,value: `${video.metrics.retention}%`,            label: 'retention' },
              { icon: Heart,     value: formatNum(video.metrics.saves),           label: 'saves' },
              { icon: Share2,    value: formatNum(video.metrics.shares),          label: 'shares' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="text-xs font-semibold text-zinc-200">{value}</div>
                <div className="text-[9px] text-zinc-600">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/[0.15]">
            <span className="text-[10px] text-amber-400/70">📊 Metrics pending platform sync</span>
          </div>
        )}

        {/* Tags */}
        {segmentTags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {segmentTags.slice(0, 4).map(tag => (
              <TagChip key={tag} name={tag} size="xs" />
            ))}
            {segmentTags.length > 4 && (
              <span className="text-[10px] text-zinc-600">+{segmentTags.length - 4}</span>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-zinc-700">No segments yet — annotate in Timeline</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export default function LibraryView() {
  const { videos, segments, searchQuery, setActiveVideo, activeProjectId } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | undefined>(undefined);

  const filtered = videos
    .filter(v => !activeProjectId || v.projectId === activeProjectId)
    .filter(v => !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()));

  function getVideoTags(videoId: string) {
    const segs = segments.filter(s => s.videoId === videoId);
    return [...new Set(segs.flatMap(s => s.tags))];
  }

  const totalViews   = filtered.reduce((sum, v) => sum + v.metrics.views, 0);
  const avgRetention = filtered.length
    ? Math.round(filtered.reduce((sum, v) => sum + v.metrics.retention, 0) / filtered.length)
    : 0;

  function openAdd() {
    setEditingVideo(undefined);
    setModalOpen(true);
  }

  function openEdit(video: Video, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingVideo(video);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-white/[0.06] bg-[#111114] shrink-0">
        <div>
          <div className="text-xs text-zinc-500">Videos</div>
          <div className="text-lg font-semibold text-white">{filtered.length}</div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div>
          <div className="text-xs text-zinc-500">Total views</div>
          <div className="text-lg font-semibold text-white">{formatNum(totalViews)}</div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div>
          <div className="text-xs text-zinc-500">Avg retention</div>
          <div className="text-lg font-semibold text-white">{avgRetention}%</div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div>
          <div className="text-xs text-zinc-500">Total segments</div>
          <div className="text-lg font-semibold text-white">
            {segments.filter(s => filtered.some(v => v.id === s.videoId)).length}
          </div>
        </div>

        {/* Add video button */}
        <div className="ml-auto">
          <Button
            onClick={openAdd}
            size="sm"
            className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add video
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Film className="w-8 h-8 opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-400 font-medium">No videos yet</p>
              <p className="text-xs text-zinc-600 mt-1">Add your first video to start annotating</p>
            </div>
            <Button
              onClick={openAdd}
              size="sm"
              className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add your first video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setActiveVideo(video.id)}
                onEdit={(e) => openEdit(video, e)}
                segmentTags={getVideoTags(video.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AddVideoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editVideo={editingVideo}
      />
    </div>
  );
}
