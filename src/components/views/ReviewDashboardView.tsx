'use client';
import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import {
  TrendingUp, Eye, Heart, Share2, Film, Tag,
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown,
  Minus, BarChart2, List, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { Video, Segment } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function scoreVideo(v: Video, maxViews: number, maxSaves: number): number {
  const nViews     = maxViews > 0 ? v.metrics.views / maxViews : 0;
  const nSaves     = maxSaves > 0 ? v.metrics.saves / maxSaves : 0;
  const nRetention = v.metrics.retention / 100;
  return Math.round((nViews * 0.4 + nRetention * 0.4 + nSaves * 0.2) * 100);
}

function scoreBadgeColor(score: number) {
  if (score >= 75) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
  if (score >= 45) return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
  return 'bg-red-500/15 text-red-400 border-red-500/25';
}

// ── Custom tooltip for recharts ────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e26] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs space-y-1">
      {label && <div className="text-zinc-500 mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400 capitalize">{p.name}:</span>
          <span className="text-white font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, sub, trend,
}: {
  label: string; value: string; icon: React.ElementType;
  color: string; sub?: string; trend?: 'up' | 'down' | 'flat';
}) {
  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="flex items-center gap-1.5">
        {trend === 'up'   && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
        {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-400" />}
        {trend === 'flat' && <Minus className="w-3 h-3 text-zinc-600" />}
        {sub && <span className="text-[11px] text-zinc-600">{sub}</span>}
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ videos }: { videos: Video[] }) {
  const chartData = useMemo(() => {
    const buckets: Record<string, { month: string; views: number; saves: number; count: number }> = {};
    for (const v of videos) {
      const key = v.createdAt.slice(0, 7);
      if (!buckets[key]) buckets[key] = { month: key, views: 0, saves: 0, count: 0 };
      buckets[key].views += v.metrics.views;
      buckets[key].saves += v.metrics.saves;
      buckets[key].count++;
    }
    return Object.values(buckets)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: new Date(d.month + '-02').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      }));
  }, [videos]);

  const platformMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of videos) m[v.platform] = (m[v.platform] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [videos]);

  const retentionDist = useMemo(() =>
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(b => ({
      label: `${b}–${b + 10}`,
      count: videos.filter(v => v.metrics.retention >= b && v.metrics.retention < b + 10).length,
    }))
  , [videos]);

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Film className="w-8 h-8 text-zinc-700" />
        <div>
          <p className="text-sm font-medium text-zinc-500">No video data yet</p>
          <p className="text-xs text-zinc-700 mt-1">Add videos in the Library to see analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Views &amp; saves over time</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[10px] text-zinc-600">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-[10px] text-zinc-600">Saves</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gSaves" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="views" name="views" stroke="#8b5cf6" strokeWidth={2} fill="url(#gViews)" />
            <Area type="monotone" dataKey="saves" name="saves" stroke="#ec4899" strokeWidth={2} fill="url(#gSaves)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="text-xs font-semibold text-zinc-400 mb-3">Platform split</div>
          <div className="space-y-2.5">
            {platformMap.map(([platform, count]) => (
              <div key={platform} className="flex items-center gap-2.5">
                <span className="text-xs text-zinc-400 capitalize w-20 truncate">{platform}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${(count / videos.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600 w-12 text-right">{count} video{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="text-xs font-semibold text-zinc-400 mb-4">Retention distribution</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={retentionDist} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="videos" fill="#8b5cf6" radius={[3, 3, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-zinc-600 mt-2">
            {videos.filter(v => v.metrics.retention >= 50).length} of {videos.length} videos above 50% retention
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Videos tab ────────────────────────────────────────────────────────────────

type SortKey = 'score' | 'views' | 'retention' | 'saves' | 'shares' | 'date';

function VideosTab({ videos }: { videos: Video[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [search,  setSearch]  = useState('');

  const maxViews = useMemo(() => Math.max(...videos.map(v => v.metrics.views), 1), [videos]);
  const maxSaves = useMemo(() => Math.max(...videos.map(v => v.metrics.saves), 1), [videos]);

  const sorted = useMemo(() => {
    const filtered = videos.filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()));
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'score')     diff = scoreVideo(a, maxViews, maxSaves) - scoreVideo(b, maxViews, maxSaves);
      if (sortKey === 'views')     diff = a.metrics.views - b.metrics.views;
      if (sortKey === 'retention') diff = a.metrics.retention - b.metrics.retention;
      if (sortKey === 'saves')     diff = a.metrics.saves - b.metrics.saves;
      if (sortKey === 'shares')    diff = a.metrics.shares - b.metrics.shares;
      if (sortKey === 'date')      diff = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? diff : -diff;
    });
  }, [videos, sortKey, sortAsc, search, maxViews, maxSaves]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button onClick={() => handleSort(k)}
        className={cn('flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
          active ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400')}>
        {label}
        {active
          ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
          : <ChevronDown className="w-3 h-3 opacity-30" />}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search videos…"
        className="w-full max-w-xs bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5
                   text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-violet-500/30"
      />
      <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="grid items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]"
             style={{ gridTemplateColumns: '1fr 60px 72px 76px 60px 60px 60px' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Video</span>
          <SortHeader label="Score" k="score" />
          <SortHeader label="Views" k="views" />
          <SortHeader label="Ret." k="retention" />
          <SortHeader label="Saves" k="saves" />
          <SortHeader label="Shares" k="shares" />
          <SortHeader label="Date" k="date" />
        </div>
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-700">No videos found</div>
        ) : sorted.map(v => {
          const score = scoreVideo(v, maxViews, maxSaves);
          return (
            <div key={v.id}
                 className="grid items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                 style={{ gridTemplateColumns: '1fr 60px 72px 76px 60px 60px 60px' }}>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200 truncate">{v.title}</div>
                <div className="text-[10px] text-zinc-600 capitalize mt-0.5">{v.platform} · {v.formatType}</div>
              </div>
              <div>
                <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-bold border', scoreBadgeColor(score))}>
                  {score}
                </span>
              </div>
              <div className="text-xs text-zinc-300 font-medium">{fmt(v.metrics.views)}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-1 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                  <div
                    className={cn('h-full rounded-full', v.metrics.retention >= 60 ? 'bg-emerald-500' : v.metrics.retention >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${v.metrics.retention}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400">{v.metrics.retention}%</span>
              </div>
              <div className="text-xs text-zinc-400">{fmt(v.metrics.saves)}</div>
              <div className="text-xs text-zinc-400">{fmt(v.metrics.shares)}</div>
              <div className="text-[10px] text-zinc-600">
                {new Date(v.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tags tab ──────────────────────────────────────────────────────────────────

type TagSortKey = 'avgViews' | 'avgRetention' | 'avgSaves' | 'count';

function TagsTab({ videos, segments }: { videos: Video[]; segments: Segment[] }) {
  const [sortKey, setSortKey] = useState<TagSortKey>('avgViews');

  const tagStats = useMemo(() => {
    const tagNames = [...new Set(segments.flatMap(s => s.tags))];
    return tagNames.map(tagName => {
      const taggedSegs   = segments.filter(s => s.tags.includes(tagName));
      const videoIds     = [...new Set(taggedSegs.map(s => s.videoId))];
      const taggedVideos = videos.filter(v => videoIds.includes(v.id));
      if (taggedVideos.length === 0) return null;
      return {
        name:         tagName,
        count:        videoIds.length,
        avgViews:     Math.round(taggedVideos.reduce((s, v) => s + v.metrics.views, 0) / taggedVideos.length),
        avgRetention: Math.round(taggedVideos.reduce((s, v) => s + v.metrics.retention, 0) / taggedVideos.length),
        avgSaves:     Math.round(taggedVideos.reduce((s, v) => s + v.metrics.saves, 0) / taggedVideos.length),
      };
    }).filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [videos, segments, sortKey]);

  const top10    = tagStats.slice(0, 10);
  const maxViews = Math.max(...tagStats.map(t => t.avgViews), 1);

  if (tagStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Hash className="w-8 h-8 text-zinc-700" />
        <div>
          <p className="text-sm font-medium text-zinc-500">No tag data yet</p>
          <p className="text-xs text-zinc-700 mt-1">Add tags to video segments to see performance analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Avg views by tag (top 10)</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 16, left: 64, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={62} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="avgViews" name="avg views" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="grid gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]"
             style={{ gridTemplateColumns: '1fr 52px 90px 72px 72px' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Tag</span>
          {([['Videos','count'],['Avg Views','avgViews'],['Avg Ret.','avgRetention'],['Avg Saves','avgSaves']] as [string, TagSortKey][]).map(([label, key]) => (
            <button key={key} onClick={() => setSortKey(key)}
              className={cn('flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                sortKey === key ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400')}>
              {label}
              <ChevronDown className={cn('w-3 h-3', sortKey === key ? '' : 'opacity-30')} />
            </button>
          ))}
        </div>
        {tagStats.map(t => (
          <div key={t.name}
               className="grid gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors items-center"
               style={{ gridTemplateColumns: '1fr 52px 90px 72px 72px' }}>
            <span className="text-xs text-zinc-200 truncate">{t.name}</span>
            <span className="text-xs text-zinc-500">{t.count}</span>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${(t.avgViews / maxViews) * 100}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 w-10 text-right shrink-0">{fmt(t.avgViews)}</span>
            </div>
            <span className={cn('text-xs', t.avgRetention >= 60 ? 'text-emerald-400' : t.avgRetention >= 40 ? 'text-amber-400' : 'text-zinc-500')}>
              {t.avgRetention}%
            </span>
            <span className="text-xs text-zinc-500">{fmt(t.avgSaves)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'videos' | 'tags';

export default function ReviewDashboardView() {
  const { videos, segments, tags } = useStore();
  const [tab, setTab] = useState<Tab>('overview');

  const maxViews = useMemo(() => Math.max(...videos.map(v => v.metrics.views), 1), [videos]);
  const maxSaves = useMemo(() => Math.max(...videos.map(v => v.metrics.saves), 1), [videos]);

  const totalViews   = useMemo(() => videos.reduce((s, v) => s + v.metrics.views, 0), [videos]);
  const totalSaves   = useMemo(() => videos.reduce((s, v) => s + v.metrics.saves, 0), [videos]);
  const avgRetention = useMemo(() =>
    videos.length ? Math.round(videos.reduce((s, v) => s + v.metrics.retention, 0) / videos.length) : 0,
  [videos]);
  const avgScore     = useMemo(() =>
    videos.length ? Math.round(videos.reduce((s, v) => s + scoreVideo(v, maxViews, maxSaves), 0) / videos.length) : 0,
  [videos, maxViews, maxSaves]);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview',       icon: TrendingUp },
    { id: 'videos',   label: 'Videos',         icon: List },
    { id: 'tags',     label: 'Tag Analytics',  icon: Tag },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5 max-w-5xl mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Review</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {videos.length} video{videos.length !== 1 ? 's' : ''} · {segments.length} segments · {tags.length} tags
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Total views"   value={fmt(totalViews)}    icon={Eye}        color="bg-blue-500/15 text-blue-400"        sub={`across ${videos.length} videos`} />
          <KpiCard label="Avg retention" value={`${avgRetention}%`} icon={TrendingUp}  color="bg-violet-500/15 text-violet-400"   sub="watch-through rate" trend={avgRetention >= 50 ? 'up' : avgRetention >= 30 ? 'flat' : 'down'} />
          <KpiCard label="Total saves"   value={fmt(totalSaves)}    icon={Heart}       color="bg-pink-500/15 text-pink-400"        sub="bookmarked" />
          <KpiCard label="Avg score"     value={String(avgScore)}   icon={Share2}      color="bg-emerald-500/15 text-emerald-400"  sub="views · retention · saves" trend={avgScore >= 50 ? 'up' : 'flat'} />
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06] w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === t.id ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab videos={videos} />}
        {tab === 'videos'   && <VideosTab   videos={videos} />}
        {tab === 'tags'     && <TagsTab     videos={videos} segments={segments} />}

      </div>
    </div>
  );
}
