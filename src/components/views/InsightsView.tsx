'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RefreshCw, TrendingUp, BarChart2, ArrowRight, Zap, LineChart as LineChartIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { Insight, Video } from '@/types';
import TagChip from '@/components/TagChip';
import { generateInsightsFromData } from '@/lib/heuristics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TrendMode = 'account' | 'video';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#18181b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    fontSize: 11,
    color: '#e4e4e7',
  },
  labelStyle: { color: '#a1a1aa', marginBottom: 4 },
  cursor: { stroke: 'rgba(255,255,255,0.06)' },
};

const AXIS_TICK = { fontSize: 10, fill: '#52525b' };

function TrendChart({ videos }: { videos: Video[] }) {
  const [mode, setMode] = useState<TrendMode>('account');
  const [selectedVideoId, setSelectedVideoId] = useState<string>(videos[0]?.id ?? '');

  const accountData = [...videos]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(v => ({
      date: new Date(v.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      views: Math.round(v.metrics.views / 1000),
      retention: v.metrics.retention,
      saves: Math.round(v.metrics.saves / 1000),
    }));

  const selectedVideo = videos.find(v => v.id === selectedVideoId);
  const videoData = (selectedVideo?.metricHistory ?? []).map(s => ({
    date: new Date(s.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    views: Math.round(s.views / 1000),
    retention: s.retention,
    saves: Math.round(s.saves / 1000),
  }));

  const data = mode === 'account' ? accountData : videoData;

  return (
    <div className="px-6 pt-4 pb-5 border-b border-white/[0.06] bg-[#111114] shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-zinc-300">Performance Trend</span>
          <span className="text-[10px] text-zinc-600">
            {mode === 'account'
              ? `${accountData.length} videos by publish date`
              : `weekly growth · ${selectedVideo?.title.slice(0, 28)}${(selectedVideo?.title.length ?? 0) > 28 ? '…' : ''}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['account', 'video'] as TrendMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors',
                mode === m
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-600 hover:text-zinc-400'
              )}
            >
              {m === 'account' ? 'Account' : 'Video'}
            </button>
          ))}
          {mode === 'video' && (
            <select
              value={selectedVideoId}
              onChange={e => setSelectedVideoId(e.target.value)}
              className="ml-2 text-[10px] bg-white/[0.04] border border-white/[0.08] text-zinc-400 rounded px-1.5 py-0.5 outline-none"
            >
              {videos.map(v => (
                <option key={v.id} value={v.id} className="bg-zinc-900">
                  {v.title.slice(0, 36)}{v.title.length > 36 ? '…' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="flex items-center justify-center h-[120px] text-xs text-zinc-700">
          Not enough data points yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, color: '#71717a' }} />
            <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Views (K)" />
            <Line type="monotone" dataKey="retention" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Retention %" />
            <Line type="monotone" dataKey="saves" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} name="Saves (K)" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const TYPE_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  pattern: { bg: 'bg-violet-500/[0.06]', border: 'border-violet-500/20', badge: 'bg-violet-500/20 text-violet-300' },
  performance: { bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300' },
  comparison: { bg: 'bg-blue-500/[0.06]', border: 'border-blue-500/20', badge: 'bg-blue-500/20 text-blue-300' },
  recommendation: { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', badge: 'bg-amber-500/20 text-amber-300' },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const styles = TYPE_STYLES[insight.type] || TYPE_STYLES.pattern;
  const { videos } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn('rounded-xl border p-4 flex flex-col gap-3', styles.bg, styles.border)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none mt-0.5">{insight.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', styles.badge)}>
                {insight.type}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white leading-snug">{insight.title}</h3>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-zinc-500 mb-1">Confidence</div>
          <div className="w-16">
            <ScoreBar score={insight.score} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-zinc-400 leading-relaxed">{insight.summary}</p>

      {/* Tags */}
      {insight.relatedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.relatedTags.map(t => <TagChip key={t} name={t} size="xs" />)}
        </div>
      )}

      {/* Related videos */}
      {insight.relatedVideos.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <span>In:</span>
          {insight.relatedVideos.slice(0, 2).map(vid => {
            const v = videos.find(v => v.id === vid);
            return v ? (
              <span key={vid} className="text-zinc-500 truncate max-w-[120px]">{v.title.slice(0, 30)}{v.title.length > 30 ? '…' : ''}</span>
            ) : null;
          })}
          {insight.relatedVideos.length > 2 && <span>+{insight.relatedVideos.length - 2} more</span>}
        </div>
      )}
    </motion.div>
  );
}

export default function InsightsView() {
  const { videos, segments, insights, setInsights } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);

  function generateInsights() {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateInsightsFromData(
        videos.map(v => ({ id: v.id, title: v.title, metrics: v.metrics, language: v.language })),
        segments.map(s => ({ videoId: s.videoId, tags: s.tags, start: s.start, end: s.end }))
      );
      const newInsights = generated.map((ins, i) => ({
        ...ins,
        id: `gen-${Date.now()}-${i}`,
        createdAt: new Date().toISOString(),
        type: ins.type as Insight['type'],
      }));
      setInsights([...insights, ...newInsights]);
      setIsGenerating(false);
    }, 1200);
  }

  const byType = {
    recommendation: insights.filter(i => i.type === 'recommendation'),
    pattern: insights.filter(i => i.type === 'pattern'),
    performance: insights.filter(i => i.type === 'performance'),
    comparison: insights.filter(i => i.type === 'comparison'),
  };

  // Stats
  const avgRetention = videos.length
    ? Math.round(videos.reduce((s, v) => s + v.metrics.retention, 0) / videos.length)
    : 0;
  const totalViews = videos.reduce((s, v) => s + v.metrics.views, 0);
  const topVideo = [...videos].sort((a, b) => b.metrics.views - a.metrics.views)[0];
  const topTags = Object.entries(
    segments.flatMap(s => s.tags).reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#111114] shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Insights</h2>
          <span className="text-xs text-zinc-600">{insights.length} patterns found</span>
        </div>
        <Button
          onClick={generateInsights}
          disabled={isGenerating}
          size="sm"
          className="h-7 text-xs gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20"
          variant="outline"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
          {isGenerating ? 'Analyzing…' : 'Generate insights'}
        </Button>
      </div>

      {videos.length >= 2 && <TrendChart videos={videos} />}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 grid grid-cols-[1fr_280px] gap-6">
          {/* Main insights grid */}
          <div className="flex flex-col gap-4">
            {insights.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <Lightbulb className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No insights yet</p>
                <p className="text-xs mt-1">Click &quot;Generate insights&quot; to analyze your data</p>
              </div>
            )}

            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]"
                >
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-sm text-amber-300">Analyzing patterns across {videos.length} videos and {segments.length} segments…</span>
                </motion.div>
              )}
            </AnimatePresence>

            {Object.entries(byType).map(([type, typeInsights]) =>
              typeInsights.length > 0 ? (
                <div key={type}>
                  <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2 capitalize">{type}s</div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {typeInsights.map((ins, i) => <InsightCard key={ins.id} insight={ins} index={i} />)}
                  </div>
                </div>
              ) : null
            )}
          </div>

          {/* Sidebar stats */}
          <div className="flex flex-col gap-4">
            {/* Dataset summary */}
            <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Dataset</div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Videos', value: videos.length },
                  { label: 'Segments', value: segments.length },
                  { label: 'Tags applied', value: segments.reduce((s, seg) => s + seg.tags.length, 0) },
                  { label: 'Avg retention', value: `${avgRetention}%` },
                  { label: 'Total views', value: totalViews >= 1000000 ? `${(totalViews / 1000000).toFixed(1)}M` : `${(totalViews / 1000).toFixed(0)}K` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{label}</span>
                    <span className="text-xs font-semibold text-zinc-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top tags */}
            <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Most used tags
              </div>
              <div className="flex flex-col gap-2">
                {topTags.map(([tag, count]) => (
                  <div key={tag} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300 flex-1 truncate">{tag}</span>
                    <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${(count / (topTags[0]?.[1] || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-600 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top video */}
            {topVideo && (
              <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Best performer</div>
                <div className="text-xs font-semibold text-zinc-200 leading-tight mb-2">{topVideo.title}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { l: 'Views', v: topVideo.metrics.views >= 1000000 ? `${(topVideo.metrics.views / 1000000).toFixed(1)}M` : `${(topVideo.metrics.views / 1000).toFixed(0)}K` },
                    { l: 'Retention', v: `${topVideo.metrics.retention}%` },
                    { l: 'Saves', v: `${(topVideo.metrics.saves / 1000).toFixed(0)}K` },
                    { l: 'Follows', v: `${(topVideo.metrics.follows / 1000).toFixed(1)}K` },
                  ].map(({ l, v }) => (
                    <div key={l} className="rounded-lg bg-white/[0.03] p-2 text-center">
                      <div className="text-xs font-bold text-white">{v}</div>
                      <div className="text-[10px] text-zinc-600">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
