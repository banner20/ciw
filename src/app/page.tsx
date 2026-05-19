'use client';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import QuickCapture from '@/components/QuickCapture';
import OnboardingOverlay from '@/components/OnboardingOverlay';

// Intelligence
import LibraryView    from '@/components/views/LibraryView';
import TimelineView   from '@/components/views/TimelineView';
import TableView      from '@/components/views/TableView';
import FlowView       from '@/components/views/FlowView';
import InsightsView   from '@/components/views/InsightsView';
import TagsView       from '@/components/views/TagsView';
import SettingsView   from '@/components/views/SettingsView';

// Ideas
import IdeasBoardView from '@/components/views/IdeasBoardView';
import ScriptView     from '@/components/views/ScriptView';
import CalendarView   from '@/components/views/CalendarView';
import BriefsView     from '@/components/views/BriefsView';

// Review
import ReviewDashboardView from '@/components/views/ReviewDashboardView';
import GoalsView           from '@/components/views/GoalsView';
import SwipeView           from '@/components/views/SwipeView';
import ReportsView         from '@/components/views/ReportsView';

const VIEW_COMPONENTS: Record<string, React.ComponentType> = {
  // intelligence
  library:   LibraryView,
  timeline:  TimelineView,
  table:     TableView,
  flow:      FlowView,
  insights:  InsightsView,
  tags:      TagsView,
  settings:  SettingsView,
  // ideas
  ideas:     IdeasBoardView,
  script:    ScriptView,
  calendar:  CalendarView,
  briefs:    BriefsView,
  // review
  dashboard: ReviewDashboardView,
  goals:     GoalsView,
  swipe:     SwipeView,
  reports:   ReportsView,
};

function Fallback({ view }: { view: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-zinc-600 text-sm">View &quot;{view}&quot; not found</div>
    </div>
  );
}

// Skeleton shown while Supabase data loads
function LoadingSkeleton() {
  return (
    <div className="h-full p-6 space-y-4 animate-pulse">
      <div className="flex gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-24 flex-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
    </div>
  );
}

export default function Home() {
  const activeView  = useStore(s => s.activeView);
  const markSaved   = useStore(s => s.markSaved);
  const isSaved     = useStore(s => s.isSaved);
  const isLoading   = useStore(s => s.isLoading);
  const initFromApi = useStore(s => s.initFromApi);
  const videos      = useStore(s => s.videos);
  const ideas       = useStore(s => s.ideas);

  // On first mount, try to load from Supabase — falls back to localStorage silently
  useEffect(() => { initFromApi(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSaved) {
      const timeout = setTimeout(() => markSaved(), 30000);
      return () => clearTimeout(timeout);
    }
  }, [isSaved, markSaved]);

  const ActiveView = VIEW_COMPONENTS[activeView];
  const isNewUser  = !isLoading && videos.length === 0 && ideas.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0f]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LoadingSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="h-full"
              >
                {ActiveView ? <ActiveView /> : <Fallback view={activeView} />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Onboarding overlay for brand-new users */}
          {isNewUser && <OnboardingOverlay />}
        </main>
      </div>
      {/* Global quick-capture — press 'C' from anywhere */}
      <QuickCapture />
    </div>
  );
}
