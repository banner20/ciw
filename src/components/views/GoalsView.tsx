'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Target, Trophy, X, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal, GoalMetric } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────────

const METRIC_OPTIONS: { id: GoalMetric; label: string; unit: string; hint: string }[] = [
  { id: 'avg_retention',  label: 'Avg Retention',    unit: '%',    hint: 'Average retention across all videos' },
  { id: 'total_views',    label: 'Total Views',       unit: 'views',hint: 'Sum of views across all videos' },
  { id: 'total_saves',    label: 'Total Saves',       unit: 'saves',hint: 'Sum of saves across all videos' },
  { id: 'videos_tagged',  label: 'Videos Tagged',     unit: 'vids', hint: 'Number of videos with ≥1 segment tag' },
  { id: 'ideas_created',  label: 'Ideas Created',     unit: 'ideas',hint: 'Total ideas in your board' },
  { id: 'custom',         label: 'Custom metric',     unit: '',     hint: 'Set your own unit and value' },
];

function metricLabel(m: GoalMetric) {
  return METRIC_OPTIONS.find(o => o.id === m)?.label ?? m;
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 60)  return 'bg-violet-500';
  if (pct >= 30)  return 'bg-amber-500';
  return 'bg-blue-500';
}

// ── Auto-calculate current value ──────────────────────────────────────────────

function useGoalCurrent(goal: Goal) {
  const { videos, segments, ideas } = useStore();

  if (goal.metric === 'custom') return goal.current;

  if (goal.metric === 'avg_retention') {
    if (!videos.length) return 0;
    return Math.round(videos.reduce((s, v) => s + v.metrics.retention, 0) / videos.length);
  }
  if (goal.metric === 'total_views')
    return videos.reduce((s, v) => s + v.metrics.views, 0);
  if (goal.metric === 'total_saves')
    return videos.reduce((s, v) => s + v.metrics.saves, 0);
  if (goal.metric === 'videos_tagged')
    return videos.filter(v => segments.some(s => s.videoId === v.id && s.tags.length > 0)).length;
  if (goal.metric === 'ideas_created')
    return ideas.length;

  return goal.current;
}

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
  const { updateGoal, deleteGoal } = useStore();
  const current = useGoalCurrent(goal);
  const pct     = Math.min(Math.round((current / Math.max(goal.target, 1)) * 100), 100);
  const achieved = pct >= 100;

  const isCustom = goal.metric === 'custom';

  return (
    <div className={cn(
      'bg-[#15151a] border rounded-2xl p-4 space-y-3',
      achieved ? 'border-emerald-500/30' : 'border-white/[0.07]'
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          achieved ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-violet-500/10 border border-violet-500/15'
        )}>
          {achieved ? <Trophy className="w-4 h-4 text-emerald-400" /> : <Target className="w-4 h-4 text-violet-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">{goal.title}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{metricLabel(goal.metric)}</div>
        </div>
        <button onClick={() => deleteGoal(goal.id)} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-end gap-2 mb-1.5">
          <span className="text-xl font-bold text-white">
            {current.toLocaleString()}{goal.unit ? ` ${goal.unit}` : ''}
          </span>
          <span className="text-xs text-zinc-600 mb-0.5">/ {goal.target.toLocaleString()}{goal.unit ? ` ${goal.unit}` : ''}</span>
          <span className={cn('ml-auto text-xs font-semibold', achieved ? 'text-emerald-400' : 'text-zinc-400')}>
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2">
        {goal.deadline && (
          <span className="text-[10px] text-zinc-600">Due {goal.deadline}</span>
        )}
        <div className="flex-1" />
        {/* Custom goal: allow editing current */}
        {isCustom && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600">Current:</span>
            <input
              type="number"
              value={goal.current}
              onChange={e => updateGoal(goal.id, { current: Number(e.target.value) })}
              className="w-16 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-xs text-zinc-300 outline-none"
            />
          </div>
        )}
        {/* Status toggle */}
        <button
          onClick={() => updateGoal(goal.id, { status: goal.status === 'active' ? 'achieved' : 'active' })}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
            goal.status === 'achieved'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:opacity-70'
              : 'border-white/[0.07] text-zinc-600 hover:text-zinc-300'
          )}
        >
          {goal.status === 'achieved' ? <><Check className="w-2.5 h-2.5" />Achieved</> : 'Mark achieved'}
        </button>
      </div>
    </div>
  );
}

// ── Add goal modal ────────────────────────────────────────────────────────────

function AddGoalModal({ onClose }: { onClose: () => void }) {
  const { addGoal } = useStore();
  const [title, setTitle]     = useState('');
  const [metric, setMetric]   = useState<GoalMetric>('avg_retention');
  const [target, setTarget]   = useState('');
  const [unit, setUnit]       = useState('');
  const [deadline, setDeadline] = useState('');

  const selectedMetric = METRIC_OPTIONS.find(o => o.id === metric)!;

  function submit() {
    if (!title.trim() || !target) return;
    addGoal({
      id:        `goal-${Date.now()}`,
      title:     title.trim(),
      metric,
      target:    Number(target),
      current:   0,
      unit:      unit || selectedMetric.unit,
      deadline:  deadline || undefined,
      status:    'active',
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#18181c] border border-white/10 rounded-2xl p-5 w-[420px] space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-white">New goal</div>

        <input autoFocus placeholder="Goal title…" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />

        {/* Metric */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-zinc-500 font-medium">Metric</label>
          <div className="grid grid-cols-2 gap-1.5">
            {METRIC_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => { setMetric(opt.id); if (opt.id !== 'custom') setUnit(opt.unit); }}
                className={cn('text-left px-2.5 py-2 rounded-lg border text-xs transition-colors',
                  metric === opt.id ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'border-white/[0.07] text-zinc-500 hover:text-zinc-300')}>
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] opacity-60">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-zinc-500 font-medium">Target</label>
            <input type="number" placeholder="100" value={target} onChange={e => setTarget(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
          </div>
          {metric === 'custom' && (
            <div className="w-24 space-y-1">
              <label className="text-[11px] text-zinc-500 font-medium">Unit</label>
              <input placeholder="views" value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-zinc-500 font-medium">Deadline (opt.)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={submit} disabled={!title.trim() || !target}
            className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
            Add goal
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GoalsView() {
  const { goals } = useStore();
  const [showAdd, setShowAdd] = useState(false);

  const active   = goals.filter(g => g.status === 'active');
  const achieved = goals.filter(g => g.status === 'achieved');
  const missed   = goals.filter(g => g.status === 'missed');

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Goals</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{active.length} active · {achieved.length} achieved</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" />
          New goal
        </button>
      </div>

      {/* Active goals */}
      {active.length > 0 && (
        <section className="space-y-3">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Active</div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {active.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {/* Achieved */}
      {achieved.length > 0 && (
        <section className="space-y-3">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-emerald-400" />
            Achieved
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {achieved.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Target className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-400">No goals yet</div>
            <div className="text-xs text-zinc-600 mt-1">Set a goal to track your progress</div>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
            Set first goal
          </button>
        </div>
      )}

      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
