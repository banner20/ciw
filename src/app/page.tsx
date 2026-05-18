'use client';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import QuickCapture from '@/components/QuickCapture';

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
      <div className="text-zinc-600 text-sm">View "{view}" not found</div>
    </div>
  );
}

export default function Home() {
  const activeView  = useStore(s => s.activeView);
  const markSaved   = useStore(s => s.markSaved);
  const isSaved     = useStore(s => s.isSaved);
  const initFromApi = useStore(s => s.initFromApi);

  // On first mount, try to load from Supabase — falls back to localStorage silently
  useEffect(() => { initFromApi(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSaved) {
      const timeout = setTimeout(() => markSaved(), 30000);
      return () => clearTimeout(timeout);
    }
  }, [isSaved, markSaved]);

  const ActiveView = VIEW_COMPONENTS[activeView];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0f]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
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
          </AnimatePresence>
        </main>
      </div>
      {/* Global quick-capture — press 'C' from anywhere */}
      <QuickCapture />
    </div>
  );
}
