'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { TrendingUp, TrendingDown, Minus, BarChart2, Eye, Heart, Share2, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Video, Segment, Tag, Platform, FormatType } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const METRIC_KEYS = [
  { key: 'views',       label: 'Views',       icon: Eye,     color: 'text-blue-400',    fmt: fmt },
  { key: 'retention',   label: 'Retention',   icon: Clock,   color: 'text-violet-400',  fmt: (n: number) => `${n}%` },
  { key: 'saves',       label: 'Saves',       icon: Heart,   color: 'text-pink-400',    fmt: fmt },
  { key: 'shares',      label: 'Shares',      icon: Share2,  color: 'text-emerald-400', fmt: fmt },
  { key: 'follows',     label: 'Follows',     icon: Users,   color: 'text-amber-400',   fmt: fmt },
] as const;

type MetricKey = typeof METRIC_KEYS[number]['key'];

// ── Column sort header ─────────────────────────────────────────────────────────

function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium cursor-pointer hover:text-zinc-300 transition-colors select-none" onClick={onClick}>
      <span className="flex items-center gap-1">
        {label}
        {active && (dir === 'desc' ? '↓' : '↑')}
      </span>
    </th>
  );
}

// ── Trend arrow ───────────────────────────────────────────────────────────────

function Trend({ value, good = 'up' }: { value: number; good?: 'up' | 'down' }) {
  if (value === 0) return <Minus className="w-3 h-3 text-zinc-600" />;
  const isGood = good === 'up' ? value > 0 : value < 0;
  return value > 0
    ? <TrendingUp className={cn('w-3 h-3', isGood ? 'text-emerald-400' : 'text-red-400')} />
    : <TrendingDown className={cn('w-3 h-3', isGood ? 'text-emerald-400' : 'text-red-400')} />;
}

// ── Platform comparison ────────────────────────────────────────────────────────

function PlatformBreakdown({ videos }: { videos: Video[] }) {
  const platforms = [...new Set(videos.map(v => v.platform))] as Platform[];

  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
      <div className="text-xs font-semibold text-zinc-400 mb-3">Platform comparison</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Platform</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Videos</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Avg views</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Avg retention</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Avg saves</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map(platform => {
              const pvids = videos.filter(v => v.platform === platform);
              return (
                <tr key={platform} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-zinc-300 capitalize font-medium">{platform}</td>
                  <td className="py-2 px-3 text-zinc-400">{pvids.length}</td>
                  <td className="py-2 px-3 text-zinc-400">{fmt(Math.round(avg(pvids.map(v => v.metrics.views))))}</td>
                  <td className="py-2 px-3 text-zinc-400">{Math.round(avg(pvids.map(v => v.metrics.retention)))}%</td>
                  <td className="py-2 px-3 text-zinc-400">{fmt(Math.round(avg(pvids.map(v => v.metrics.saves))))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Format comparison ──────────────────────────────────────────────────────────

function FormatBreakdown({ videos }: { videos: Video[] }) {
  const formats = [...new Set(videos.map(v => v.formatType))] as FormatType[];

  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
      <div className="text-xs font-semibold text-zinc-400 mb-3">Format comparison</div>
      <div className="space-y-2">
        {formats.map(format => {
          const fvids = videos.filter(v => v.formatType === format);
          const retAvg = Math.round(avg(fvids.map(v => v.metrics.retention)));
          const viewsAvg = Math.round(avg(fvids.map(v => v.metrics.views)));
          return (
            <div key={format} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
              <div className="w-16 text-xs text-zinc-400 capitalize">{format}</div>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min((retAvg / 100) * 100, 100)}%` }} />
              </div>
              <div className="text-[11px] text-zinc-500 w-12 text-right">{retAvg}% ret</div>
              <div className="text-[11px] text-zinc-600 w-14 text-right">{fmt(viewsAvg)} views</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tag performance table ──────────────────────────────────────────────────────

function TagPerformanceTable({ videos, segments, tags }: {
  videos: Video[];
  segments: Segment[];
  tags: Tag[];
}) {
  // For each tag, find all segments with that tag, get their video metrics
  const tagRows = tags.map(tag => {
    const segs = segments.filter(s => s.tags.includes(tag.name));
    const vids = [...new Set(segs.map(s => s.videoId))].map(id => videos.find(v => v.id === id)).filter(Boolean);
    const avgRet  = vids.length ? Math.round(avg(vids.map(v => v!.metrics.retention))) : 0;
    const avgViews = vids.length ? Math.round(avg(vids.map(v => v!.metrics.views))) : 0;
    return { tag, videoCount: vids.length, segCount: segs.length, avgRet, avgViews };
  }).filter(r => r.segCount > 0).sort((a, b) => b.avgRet - a.avgRet);

  if (!tagRows.length) {
    return (
      <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
        <div className="text-xs font-semibold text-zinc-400 mb-3">Tag performance</div>
        <div className="text-xs text-zinc-700 py-4 text-center">Tag some segments to see performance data here</div>
      </div>
    );
  }

  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
      <div className="text-xs font-semibold text-zinc-400 mb-3">Tag performance (by avg retention of tagged segments)</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Tag</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Videos</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Segments</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Avg retention</th>
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Avg views</th>
            </tr>
          </thead>
          <tbody>
            {tagRows.slice(0, 15).map(({ tag, videoCount, segCount, avgRet, avgViews }) => (
              <tr key={tag.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-zinc-300 font-medium">{tag.name}</span>
                  </span>
                </td>
                <td className="py-2 px-3 text-zinc-500">{videoCount}</td>
                <td className="py-2 px-3 text-zinc-500">{segCount}</td>
                <td className="py-2 px-3">
                  <span className={cn('font-medium', avgRet >= 60 ? 'text-emerald-400' : avgRet >= 40 ? 'text-amber-400' : 'text-zinc-400')}>
                    {avgRet}%
                  </span>
                </td>
                <td className="py-2 px-3 text-zinc-500">{fmt(avgViews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Video table ────────────────────────────────────────────────────────────────

function VideoTable({ videos }: { videos: Video[] }) {
  const [sortKey, setSortKey]   = useState<MetricKey>('views');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');

  function toggleSort(key: MetricKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...videos].sort((a, b) => {
    const av = a.metrics[sortKey as keyof typeof a.metrics] as number;
    const bv = b.metrics[sortKey as keyof typeof b.metrics] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
      <div className="text-xs font-semibold text-zinc-400 mb-3">All videos</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Title</th>
              {METRIC_KEYS.map(m => (
                <SortTh key={m.key} label={m.label} active={sortKey === m.key} dir={sortDir} onClick={() => toggleSort(m.key)} />
              ))}
              <th className="text-left py-2 px-3 text-[11px] text-zinc-500 font-medium">Platform</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(v => (
              <tr key={v.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3 text-zinc-200 font-medium max-w-[200px]">
                  <span className="block truncate">{v.title}</span>
                </td>
                {METRIC_KEYS.map(m => {
                  const val = v.metrics[m.key as keyof typeof v.metrics] as number;
                  return (
                    <td key={m.key} className={cn('py-2 px-3 font-medium', m.color)}>
                      {m.fmt(val)}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-zinc-500 capitalize">{v.platform}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportsView() {
  const { videos, segments, tags } = useStore();

  if (videos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <BarChart2 className="w-10 h-10 text-zinc-700 mx-auto" />
          <div className="text-sm font-medium text-zinc-500">No data to report</div>
          <div className="text-xs text-zinc-700">Add videos and tag segments to see reports</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-white">Reports</h2>
        <div className="text-xs text-zinc-600">{videos.length} videos · {segments.length} segments · {tags.length} tags</div>
      </div>

      <PlatformBreakdown videos={videos} />
      <FormatBreakdown videos={videos} />
      <TagPerformanceTable videos={videos} segments={segments} tags={tags} />
      <VideoTable videos={videos} />
    </div>
  );
}
