'use client';
import { motion } from 'framer-motion';
import {
  Film, Clock, Table2, GitFork, Lightbulb, Tag, Settings, Zap,
  KanbanSquare, FileText, CalendarDays, BookOpen,
  LayoutDashboard, Target, Bookmark, TrendingUp,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import type { ActiveView } from '@/types';

const INTELLIGENCE_NAV = [
  { id: 'library',   label: 'Library',   icon: Film },
  { id: 'timeline',  label: 'Timeline',  icon: Clock },
  { id: 'table',     label: 'Table',     icon: Table2 },
  { id: 'flow',      label: 'Flow',      icon: GitFork },
  { id: 'insights',  label: 'Insights',  icon: Lightbulb },
  { id: 'tags',      label: 'Tags',      icon: Tag },
] as const;

const IDEAS_NAV = [
  { id: 'ideas',    label: 'Ideas Board', icon: KanbanSquare },
  { id: 'script',   label: 'Script',      icon: FileText },
  { id: 'calendar', label: 'Calendar',    icon: CalendarDays },
  { id: 'briefs',   label: 'Briefs',      icon: BookOpen },
  { id: 'swipe',    label: 'Swipe File',  icon: Bookmark },
] as const;

const REVIEW_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'goals',     label: 'Goals',     icon: Target },
  { id: 'reports',   label: 'Reports',   icon: TrendingUp },
] as const;

export default function Sidebar() {
  const { activeView, setActiveView, activeVideoId, videos, activeWorkspace, ideas, goals } = useStore();
  const activeVideo = videos.find(v => v.id === activeVideoId);

  const navItems =
    activeWorkspace === 'intelligence' ? INTELLIGENCE_NAV :
    activeWorkspace === 'ideas'        ? IDEAS_NAV :
    REVIEW_NAV;

  // intelligence-specific: disable video-dependent views when no video selected
  function isDisabled(id: string) {
    if (activeWorkspace !== 'intelligence') return false;
    return (id === 'timeline' || id === 'table' || id === 'flow') && !activeVideoId;
  }

  // small badge counts
  const badgeCounts: Record<string, number | undefined> = {
    ideas:     ideas.filter(i => i.status === 'draft').length || undefined,
    goals:     goals.filter(g => g.status === 'active').length || undefined,
  };

  return (
    <aside className="w-[200px] shrink-0 border-r border-white/[0.06] bg-[#111114] flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-white leading-none">CIW</div>
          <div className="text-[10px] text-zinc-500 leading-none mt-0.5 capitalize">{activeWorkspace}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive  = activeView === id;
          const disabled  = isDisabled(id);
          const badge     = badgeCounts[id];
          return (
            <button
              key={id}
              onClick={() => !disabled && setActiveView(id as ActiveView)}
              disabled={disabled}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative group',
                isActive
                  ? 'text-white bg-white/[0.06]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]',
                disabled && 'opacity-30 cursor-not-allowed'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-y-0 left-0 w-0.5 bg-violet-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-medium flex-1 text-left">{label}</span>
              {badge !== undefined && (
                <span className="text-[10px] bg-violet-500/20 text-violet-400 rounded-full px-1.5 py-0.5 leading-none font-medium">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active video chip (intelligence only) */}
      {activeWorkspace === 'intelligence' && activeVideo && (
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-1.5">Active Video</div>
          <div className="text-xs text-zinc-300 font-medium leading-tight line-clamp-2">{activeVideo.title}</div>
          <div className="text-[10px] text-zinc-600 mt-1">{activeVideo.duration}s · {activeVideo.platform}</div>
        </div>
      )}

      {/* Settings (always at bottom) */}
      <button
        onClick={() => setActiveView('settings')}
        className={cn(
          'flex items-center gap-3 px-4 py-3 text-sm border-t border-white/[0.06] transition-colors',
          activeView === 'settings' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'
        )}
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
    </aside>
  );
}
