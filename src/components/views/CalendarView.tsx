'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import {
  ChevronLeft, ChevronRight, Plus, X, Film, FileText,
  Clock, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Idea, Platform } from '@/types';

// ── date helpers ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES_LONG  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_NAMES_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function getTodayYMD() {
  const d = new Date();
  return toYMD(d.getFullYear(), d.getMonth(), d.getDate());
}

// Returns Monday-indexed grid for the month (42 cells, null = padding)
function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first (Mon=0 … Sun=6)
  const offset = (firstDow + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  // Pad to a full 6-week grid
  while (cells.length < 42) cells.push(null);
  return cells;
}

// Returns the Monday of the week containing the given date
function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateToYMD(date: Date): string {
  return toYMD(date.getFullYear(), date.getMonth(), date.getDate());
}

const PLATFORM_DOTS: Record<Platform, string> = {
  instagram: 'bg-pink-500',
  tiktok:    'bg-cyan-500',
  youtube:   'bg-red-500',
  twitter:   'bg-sky-500',
  linkedin:  'bg-blue-500',
  other:     'bg-zinc-500',
};

// ── Add / schedule modal ───────────────────────────────────────────────────────

function ScheduleModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { addIdea, updateIdea, ideas, activeProjectId } = useStore();
  const [mode,  setMode]  = useState<'new' | 'existing'>('new');
  const [title, setTitle] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const { ideaColumns } = useStore();

  const unscheduled = ideas.filter(i => !i.scheduledDate);

  function submit() {
    if (mode === 'new' && title.trim()) {
      addIdea({
        id:        `idea-${Date.now()}`,
        projectId: activeProjectId ?? 'proj-1',
        title:     title.trim(),
        hook: '', body: '',
        status:        ideaColumns[0]?.id ?? 'draft',
        tags:          [],
        scheduledDate: date,
        createdAt:     new Date().toISOString(),
      });
    } else if (mode === 'existing' && selId) {
      updateIdea(selId, { scheduledDate: date });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{   scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-[#18181c] border border-white/10 rounded-2xl p-5 w-[360px] space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Schedule for {date}</span>
        </div>

        <div className="flex gap-2">
          {(['new','existing'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                mode === m
                  ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                  : 'border-white/10 text-zinc-500 hover:text-zinc-300')}>
              {m === 'new' ? 'New idea' : 'Existing idea'}
            </button>
          ))}
        </div>

        {mode === 'new' ? (
          <input
            autoFocus
            placeholder="Idea title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm
                       text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40"
          />
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {unscheduled.length === 0 ? (
              <div className="text-xs text-zinc-600 py-4 text-center">All ideas are scheduled</div>
            ) : unscheduled.map(i => (
              <button key={i.id} onClick={() => setSelId(i.id)}
                className={cn('w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border',
                  selId === i.id
                    ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04]')}>
                {i.title}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={submit}
            disabled={mode === 'new' ? !title.trim() : !selId}
            className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm
                       font-medium transition-colors disabled:opacity-40">
            Schedule
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Day detail sidebar ─────────────────────────────────────────────────────────

function DaySidebar({
  date, ideas, onClose, onAddToDate, onUnschedule,
}: {
  date: string | null;
  ideas: Idea[];
  onClose: () => void;
  onAddToDate: (d: string) => void;
  onUnschedule: (id: string) => void;
}) {
  const { ideaColumns, setActiveView, setActiveWorkspace } = useStore();

  if (!date) {
    // Unscheduled ideas panel
    const unscheduled = ideas.filter(i => !i.scheduledDate && i.status !== 'published');
    return (
      <div className="w-[240px] shrink-0 border-l border-white/[0.06] flex flex-col bg-[#111114]">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="text-xs font-semibold text-zinc-400">Unscheduled</div>
          <div className="text-[10px] text-zinc-600 mt-0.5">
            {unscheduled.length} idea{unscheduled.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
          {unscheduled.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-700">
              All ideas are scheduled!
            </div>
          ) : unscheduled.map(idea => {
            const col = ideaColumns.find(c => c.id === idea.status);
            return (
              <div key={idea.id}
                   className="px-2.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-1">
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: col?.color ?? '#71717a' }} />
                  <span className="text-xs font-medium text-zinc-300 leading-snug line-clamp-2 flex-1">
                    {idea.title}
                  </span>
                </div>
                {idea.platform && (
                  <div className="text-[10px] text-zinc-700 capitalize pl-3">{idea.platform}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Day detail view
  const dayIdeas = ideas.filter(i => i.scheduledDate === date);
  const [, m, d] = date.split('-').map(Number);
  const label = `${MONTH_NAMES[m - 1]} ${d}`;

  return (
    <div className="w-[240px] shrink-0 border-l border-white/[0.06] flex flex-col bg-[#111114]">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xs font-semibold text-white">{label}</div>
          <div className="text-[10px] text-zinc-600 mt-0.5">
            {dayIdeas.length} piece{dayIdeas.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-zinc-600
                     hover:text-white hover:bg-white/[0.06] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
        {dayIdeas.length === 0 && (
          <div className="text-center py-6 text-xs text-zinc-700">
            Nothing scheduled for this day
          </div>
        )}
        {dayIdeas.map(idea => {
          const col = ideaColumns.find(c => c.id === idea.status);
          const hasScript = !!idea.scriptId;
          const hasVideo  = !!idea.linkedVideoId;

          return (
            <div key={idea.id}
                 className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              {/* Status strip */}
              <div className="h-0.5" style={{ backgroundColor: col?.color ?? '#71717a' }} />
              <div className="p-2.5 space-y-2">
                <div className="text-xs font-semibold text-zinc-200 leading-snug">{idea.title}</div>
                {idea.hook && (
                  <p className="text-[10px] text-zinc-600 italic line-clamp-2">&quot;{idea.hook}&quot;</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {idea.platform && (
                    <div className="flex items-center gap-1">
                      <div className={cn('w-1.5 h-1.5 rounded-full', PLATFORM_DOTS[idea.platform as Platform] ?? 'bg-zinc-500')} />
                      <span className="text-[10px] text-zinc-600 capitalize">{idea.platform}</span>
                    </div>
                  )}
                  <span className="text-[10px] font-medium" style={{ color: col?.color ?? '#71717a' }}>
                    {col?.label ?? idea.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasScript && (
                    <div className="flex items-center gap-1 text-[9px] text-violet-400">
                      <FileText className="w-2.5 h-2.5" /> Script
                    </div>
                  )}
                  {hasVideo && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-400">
                      <Film className="w-2.5 h-2.5" /> Video
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => { setActiveWorkspace('ideas'); setActiveView('briefs'); }}
                    className="flex-1 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08]
                               text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Open brief
                  </button>
                  <button
                    onClick={() => onUnschedule(idea.id)}
                    className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-red-500/10
                               text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                    title="Unschedule"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-2 py-2 border-t border-white/[0.06]">
        <button
          onClick={() => onAddToDate(date)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
                     bg-violet-600/10 border border-violet-500/20 text-violet-400
                     text-xs font-medium hover:bg-violet-600/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule for {label}
        </button>
      </div>
    </div>
  );
}

// ── Month view ─────────────────────────────────────────────────────────────────

function MonthView({
  year, month, ideas, today, selectedDate, onSelectDate, onAddToDate, onUnschedule,
}: {
  year: number; month: number; ideas: Idea[]; today: string;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  onAddToDate: (d: string) => void;
  onUnschedule: (id: string) => void;
}) {
  const { ideaColumns } = useStore();
  const cells = buildMonthGrid(year, month);

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5 shrink-0 px-4 pt-2">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="text-[10px] text-zinc-600 font-medium text-center py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5 px-4 pb-4">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="min-h-[90px]" />;

          const dateStr  = toYMD(year, month, day);
          const isToday  = dateStr === today;
          const isSel    = dateStr === selectedDate;
          const dayIdeas = ideas.filter(x => x.scheduledDate === dateStr);

          return (
            <div
              key={day}
              onClick={() => onSelectDate(isSel ? '' : dateStr)}
              className={cn(
                'min-h-[90px] rounded-xl border p-1.5 transition-all cursor-pointer group',
                isToday  ? 'border-violet-500/40 bg-violet-500/5' : '',
                isSel    ? 'border-violet-400/50 bg-violet-500/10 ring-1 ring-violet-500/20' : '',
                !isToday && !isSel ? 'border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.02]' : '',
              )}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors',
                  isToday ? 'bg-violet-500 text-white' : 'text-zinc-500'
                )}>
                  {day}
                </span>
                {/* Platform dots */}
                {dayIdeas.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-end">
                    {dayIdeas.slice(0, 4).map((idea, idx) => (
                      <div key={idx}
                           className={cn('w-1.5 h-1.5 rounded-full',
                             PLATFORM_DOTS[idea.platform as Platform] ?? 'bg-zinc-500')} />
                    ))}
                  </div>
                )}
              </div>

              {/* Idea pills */}
              <div className="space-y-0.5">
                {dayIdeas.slice(0, 2).map(idea => {
                  const col = ideaColumns.find(c => c.id === idea.status);
                  return (
                    <div
                      key={idea.id}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium
                                 truncate border bg-white/[0.03]"
                      style={{
                        borderColor: `${col?.color ?? '#71717a'}40`,
                        color: col?.color ?? '#71717a',
                      }}
                    >
                      {idea.title}
                    </div>
                  );
                })}
                {dayIdeas.length > 2 && (
                  <div className="text-[9px] text-zinc-600 px-1.5">+{dayIdeas.length - 2} more</div>
                )}
              </div>

              {/* Add button on hover */}
              {dayIdeas.length === 0 && (
                <button
                  onClick={e => { e.stopPropagation(); onAddToDate(dateStr); }}
                  className="w-full mt-1 opacity-0 group-hover:opacity-100 flex items-center justify-center
                             gap-1 py-1 rounded text-[10px] text-zinc-700 hover:text-zinc-400
                             hover:bg-white/[0.04] transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view ──────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, ideas, today, selectedDate, onSelectDate, onAddToDate, onUnschedule,
}: {
  weekStart: Date; ideas: Idea[]; today: string;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  onAddToDate: (d: string) => void;
  onUnschedule: (id: string) => void;
}) {
  const { ideaColumns } = useStore();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: dateToYMD(d), dow: DAY_NAMES_LONG[i], dowShort: DAY_NAMES_SHORT[i], day: d.getDate() };
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {/* Column headers */}
      <div className="grid grid-cols-7 gap-2 px-4 pt-3 pb-2 shrink-0">
        {days.map(({ date, dow, day }) => {
          const isToday = date === today;
          const isSel   = date === selectedDate;
          return (
            <div key={date}
                 onClick={() => onSelectDate(isSel ? '' : date)}
                 className={cn(
                   'text-center py-2 rounded-xl cursor-pointer transition-colors',
                   isToday ? 'bg-violet-500/10' : '',
                   isSel   ? 'bg-violet-500/15 ring-1 ring-violet-500/25' : 'hover:bg-white/[0.03]',
                 )}>
              <div className="text-[10px] text-zinc-600">{dow.slice(0, 3)}</div>
              <div className={cn(
                'text-sm font-semibold mt-0.5',
                isToday ? 'text-violet-400' : 'text-zinc-300'
              )}>
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content rows */}
      <div className="grid grid-cols-7 gap-2 px-4 pb-4 flex-1 overflow-y-auto min-h-0">
        {days.map(({ date }) => {
          const dayIdeas = ideas.filter(i => i.scheduledDate === date);
          return (
            <div key={date}
                 className="space-y-1.5 min-h-[120px] border-t border-white/[0.04] pt-2">
              {dayIdeas.map(idea => {
                const col = ideaColumns.find(c => c.id === idea.status);
                return (
                  <div key={idea.id}
                       className="rounded-lg border bg-white/[0.02] p-2 space-y-1"
                       style={{ borderColor: `${col?.color ?? '#71717a'}30` }}>
                    <div className="text-[11px] font-semibold text-zinc-200 leading-snug line-clamp-2">
                      {idea.title}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-medium" style={{ color: col?.color ?? '#71717a' }}>
                        {col?.label ?? idea.status}
                      </span>
                      {idea.platform && (
                        <div className={cn('w-1.5 h-1.5 rounded-full',
                          PLATFORM_DOTS[idea.platform as Platform] ?? 'bg-zinc-500')} />
                      )}
                    </div>
                    {idea.hook && (
                      <p className="text-[10px] text-zinc-700 italic line-clamp-1">&quot;{idea.hook}&quot;</p>
                    )}
                    <button
                      onClick={() => onUnschedule(idea.id)}
                      className="text-[9px] text-zinc-700 hover:text-red-400 transition-colors"
                    >
                      Unschedule
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => onAddToDate(date)}
                className="w-full py-1.5 rounded-lg border border-dashed border-white/[0.06]
                           text-[10px] text-zinc-700 hover:text-zinc-500 hover:border-white/[0.12]
                           transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-2.5 h-2.5" /> Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CalendarView() {
  const { ideas, updateIdea } = useStore();
  const now   = new Date();
  const today = getTodayYMD();

  const [viewMode,      setViewMode]      = useState<'month' | 'week'>('month');
  const [year,          setYear]          = useState(now.getFullYear());
  const [month,         setMonth]         = useState(now.getMonth());
  const [weekStart,     setWeekStart]     = useState<Date>(() => getWeekStart(today));
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);
  const [schedulingFor, setSchedulingFor] = useState<string | null>(null);

  // Month nav
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Week nav
  function prevWeek() { setWeekStart(d => addDays(d, -7)); }
  function nextWeek() { setWeekStart(d => addDays(d,  7)); }

  // Jump to today
  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setWeekStart(getWeekStart(today));
    setSelectedDate(null);
  }

  // Heading label
  const headingLabel = viewMode === 'month'
    ? `${MONTH_NAMES[month]} ${year}`
    : (() => {
        const end = addDays(weekStart, 6);
        const s = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}`;
        const e = `${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
        return `${s} – ${e}`;
      })();

  const monthPrefix  = `${year}-${String(month + 1).padStart(2,'0')}`;
  const scheduledThisMonth = ideas.filter(i => i.scheduledDate?.startsWith(monthPrefix));

  function handleSelectDate(d: string) {
    setSelectedDate(d || null);
  }

  function handleUnschedule(id: string) {
    updateIdea(id, { scheduledDate: undefined });
  }

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          {/* Prev */}
          <button
            onClick={viewMode === 'month' ? prevMonth : prevWeek}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500
                       hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Title */}
          <h2 className="text-sm font-semibold text-white min-w-[220px] text-center">
            {headingLabel}
          </h2>

          {/* Next */}
          <button
            onClick={viewMode === 'month' ? nextMonth : nextWeek}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500
                       hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Today */}
          <button
            onClick={goToday}
            className="px-3 py-1 rounded-lg border border-white/[0.08] text-xs text-zinc-400
                       hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Today
          </button>

          <div className="flex-1" />

          {/* Scheduled count */}
          {viewMode === 'month' && (
            <span className="text-xs text-zinc-600">
              {scheduledThisMonth.length} scheduled
            </span>
          )}

          {/* View toggle */}
          <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            {(['month','week'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                  viewMode === v ? 'bg-white/[0.10] text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        {viewMode === 'month' ? (
          <MonthView
            year={year} month={month} ideas={ideas} today={today}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onAddToDate={setSchedulingFor}
            onUnschedule={handleUnschedule}
          />
        ) : (
          <WeekView
            weekStart={weekStart} ideas={ideas} today={today}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onAddToDate={setSchedulingFor}
            onUnschedule={handleUnschedule}
          />
        )}
      </div>

      {/* ── Right sidebar ── */}
      <DaySidebar
        date={selectedDate}
        ideas={ideas}
        onClose={() => setSelectedDate(null)}
        onAddToDate={setSchedulingFor}
        onUnschedule={handleUnschedule}
      />

      {/* ── Schedule modal ── */}
      <AnimatePresence>
        {schedulingFor && (
          <ScheduleModal
            date={schedulingFor}
            onClose={() => setSchedulingFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
