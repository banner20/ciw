'use client';
import { Search, Database, CheckCircle2, Clock, ChevronDown, ChevronRight, Loader2, Brain, Lightbulb, BarChart3, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types';
import ShortcutsHelp from '@/components/ShortcutsHelp';

const VIEW_LABELS: Record<string, string> = {
  // intelligence
  library: 'Library', timeline: 'Timeline', table: 'Table',
  flow: 'Flow', insights: 'Insights', tags: 'Tags', settings: 'Settings',
  // ideas
  ideas: 'Ideas', script: 'Script', calendar: 'Calendar', briefs: 'Briefs', swipe: 'Swipe File',
  // review
  dashboard: 'Dashboard', goals: 'Goals', reports: 'Reports',
};

const WORKSPACES: { id: Workspace; label: string; icon: React.ElementType }[] = [
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
  { id: 'ideas',        label: 'Ideas',        icon: Lightbulb },
  { id: 'review',       label: 'Review',       icon: BarChart3 },
];

function formatTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TopBar() {
  const {
    searchQuery, setSearchQuery, isSaved, lastSaved,
    projects, activeProjectId, activeView, setActiveProject,
    markSaved, resetToSeed, videos, activeVideoId,
    uploadProgress, activeWorkspace, setActiveWorkspace, signOut,
  } = useStore();

  const activeVideo = videos.find(v => v.id === activeVideoId);
  const activeProject = projects.find(p => p.id === activeProjectId);
  const isUploading = uploadProgress !== null;

  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-[#111114]">
      {/* ── Row 1: project / search / status ── */}
      <header className="h-12 flex items-center gap-3 px-4">
        {/* Project selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors outline-none">
            {activeProject?.name || 'Select project'}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 bg-[#1a1a1f] border-white/10">
            {projects.map(p => (
              <DropdownMenuItem key={p.id} onClick={() => setActiveProject(p.id)} className={cn('text-sm', p.id === activeProjectId && 'text-violet-400')}>
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-white/10" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-300 font-medium">{VIEW_LABELS[activeView] ?? activeView}</span>
          {activeVideo && (activeView === 'timeline' || activeView === 'table' || activeView === 'flow') && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-zinc-500 truncate max-w-[160px]">{activeVideo.title}</span>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search videos, tags, segments…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-7 pl-8 bg-white/[0.04] border-white/10 text-sm placeholder:text-zinc-600 focus-visible:ring-violet-500/40"
          />
        </div>

        <div className="flex-1" />

        {/* Upload progress bar */}
        {isUploading && (
          <div className="flex items-center gap-2 text-xs text-violet-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span>{uploadProgress}%</span>
          </div>
        )}

        {/* Save status */}
        {!isUploading && (
          <div className="flex items-center gap-1.5 text-xs">
            {isSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-zinc-500" suppressHydrationWarning>Saved {formatTime(lastSaved)}</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="text-zinc-500">Saving…</span>
              </>
            )}
          </div>
        )}

        {/* Sample data */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-zinc-400 hover:text-white gap-1.5"
          onClick={() => { resetToSeed(); markSaved(); }}
        >
          <Database className="w-3.5 h-3.5" />
          Sample data
        </Button>

        {/* Keyboard shortcuts */}
        <ShortcutsHelp />

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-zinc-600 hover:text-red-400 gap-1.5"
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </header>

      {/* ── Row 2: workspace switcher ── */}
      <div className="flex items-center gap-1 px-4 pb-0 border-t border-white/[0.04]">
        {WORKSPACES.map(({ id, label, icon: Icon }) => {
          const active = activeWorkspace === id;
          return (
            <button
              key={id}
              onClick={() => setActiveWorkspace(id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors',
                active
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-violet-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
