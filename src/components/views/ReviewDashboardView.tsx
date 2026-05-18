'use client';
import { useStore } from '@/store/useStore';
import { TrendingUp, Eye, Heart, Share2, Users, Film, Tag, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

// ── Top video row ─────────────────────────────────────────────────────────────

function TopVideoRow({ rank, title, views, retention, platform }: {
  rank: number; title: string; views: number; retention: number; platform: string;
}) {
  const retentionColor =
    retention >= 60 ? 'text-emerald-400' :
    retention >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-zinc-700 w-5 text-right shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-zinc-200 truncate">{title}</div>
        <div className="text-[10px] text-zinc-600 capitalize">{platform}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-zinc-300">{fmt(views)}</div>
        <div className={cn('text-[10px]', retentionColor)}>{retention}% ret.</div>
      </div>
    </div>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────

function MiniBarChart({ data, color = '#8b5cf6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm opacity-80"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ── Tag performance ───────────────────────────────────────────────────────────

function TagPerformanceRow({ name, usageCount, color }: { name: string; usageCount: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-xs text-zinc-300 truncate">{name}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min((usageCount / 20) * 100, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[10px] text-zinc-600 w-4 text-right">{usageCount}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReviewDashboardView() {
  const { videos, segments, tags, insights, ideas, goals } = useStore();

  // Aggregate metrics
  const totalViews     = videos.reduce((s, v) => s + v.metrics.views, 0);
  const totalSaves     = videos.reduce((s, v) => s + v.metrics.saves, 0);
  const totalShares    = videos.reduce((s, v) => s + v.metrics.shares, 0);
  const avgRetention   = videos.length
    ? Math.round(videos.reduce((s, v) => s + v.metrics.retention, 0) / videos.length)
    : 0;

  // Top 5 videos by views
  const topVideos = [...videos].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5);

  // Top tags by usage
  const topTags = [...tags].sort((a, b) => b.usageCount - a.usageCount).slice(0, 8);

  // Platform breakdown
  const platformMap: Record<string, number> = {};
  for (const v of videos) {
    platformMap[v.platform] = (platformMap[v.platform] ?? 0) + 1;
  }
  const platforms = Object.entries(platformMap).sort((a, b) => b[1] - a[1]);

  // Goals summary
  const activeGoals   = goals.filter(g => g.status === 'active').length;
  const achievedGoals = goals.filter(g => g.status === 'achieved').length;

  // Retention distribution (sparkline using actual data)
  const retentionBuckets = [0,10,20,30,40,50,60,70,80,90].map(bucket =>
    videos.filter(v => v.metrics.retention >= bucket && v.metrics.retention < bucket + 10).length
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Review Dashboard</h2>
        <div className="text-xs text-zinc-600">{videos.length} videos · {segments.length} segments</div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total views"    value={fmt(totalViews)}   icon={Eye}       color="bg-blue-500/15 text-blue-400"    sub={`across ${videos.length} videos`} />
        <StatCard label="Avg retention"  value={`${avgRetention}%`} icon={TrendingUp} color="bg-violet-500/15 text-violet-400" sub="watch through rate" />
        <StatCard label="Total saves"    value={fmt(totalSaves)}   icon={Heart}     color="bg-pink-500/15 text-pink-400"    sub="bookmarked" />
        <StatCard label="Total shares"   value={fmt(totalShares)}  icon={Share2}    color="bg-emerald-500/15 text-emerald-400" sub="amplification" />
      </div>

      {/* Row 2: top videos + tag cloud */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top videos */}
        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Film className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-400">Top videos by views</span>
          </div>
          {topVideos.length === 0 ? (
            <div className="text-xs text-zinc-700 py-4 text-center">No videos yet</div>
          ) : (
            topVideos.map((v, i) => (
              <TopVideoRow key={v.id} rank={i + 1} title={v.title}
                views={v.metrics.views} retention={v.metrics.retention} platform={v.platform} />
            ))
          )}
        </div>

        {/* Tag usage */}
        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-400">Top tags by usage</span>
          </div>
          {topTags.length === 0 ? (
            <div className="text-xs text-zinc-700 py-4 text-center">No tags yet</div>
          ) : (
            topTags.map(t => (
              <TagPerformanceRow key={t.id} name={t.name} usageCount={t.usageCount} color={t.color} />
            ))
          )}
        </div>
      </div>

      {/* Row 3: retention distribution + platform split + goals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Retention dist */}
        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="text-xs font-semibold text-zinc-400 mb-3">Retention distribution</div>
          <MiniBarChart data={retentionBuckets} color="#8b5cf6" />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-zinc-700">0%</span>
            <span className="text-[9px] text-zinc-700">100%</span>
          </div>
          <div className="text-[10px] text-zinc-600 mt-2">
            {videos.filter(v => v.metrics.retention >= 50).length} / {videos.length} videos above 50%
          </div>
        </div>

        {/* Platform */}
        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="text-xs font-semibold text-zinc-400 mb-3">Platform split</div>
          <div className="space-y-2">
            {platforms.length === 0 ? (
              <div className="text-xs text-zinc-700">No data</div>
            ) : platforms.map(([platform, count]) => (
              <div key={platform} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 capitalize w-20 truncate">{platform}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${(count / videos.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-zinc-600 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Goals summary */}
        <div className="bg-[#15151a] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-400">Goals & ideas</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-sm font-bold text-amber-400">
                {activeGoals}
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-300">Active goals</div>
                <div className="text-[10px] text-zinc-600">{achievedGoals} achieved</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-sm font-bold text-violet-400">
                {ideas.filter(i => i.status === 'ready').length}
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-300">Ready to film</div>
                <div className="text-[10px] text-zinc-600">{ideas.filter(i => i.scheduledDate).length} scheduled</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400">
                {insights.length}
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-300">Insights</div>
                <div className="text-[10px] text-zinc-600">from AI analysis</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
