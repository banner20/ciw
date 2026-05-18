import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Video, Segment, Tag, Insight, Idea, IdeaColumn, Script, Goal, SwipeItem, Workspace, ActiveView } from '@/types';
import { SEED_PROJECTS, SEED_VIDEOS, SEED_SEGMENTS, SEED_TAGS, SEED_INSIGHTS } from '@/lib/seed';
import * as db from '@/lib/db';
import { createClient } from '@/lib/supabase/client';

// ─── helpers ──────────────────────────────────────────────────────────────────

// fire-and-forget — never blocks the optimistic update
function sync(fn: () => Promise<void>) { fn().catch(e => console.warn('[sync]', e)); }

// ─── types ────────────────────────────────────────────────────────────────────

interface Store {
  // data
  projects:   Project[];
  videos:     Video[];
  segments:   Segment[];
  tags:       Tag[];
  insights:   Insight[];
  ideas:      Idea[];
  scripts:    Script[];
  goals:      Goal[];
  swipeItems: SwipeItem[];

  // ui state
  activeProjectId:  string | null;
  activeVideoId:    string | null;
  activeView:       ActiveView;
  activeWorkspace:  Workspace;
  workspaceViews:   Record<Workspace, ActiveView>;
  searchQuery:      string;
  isSaved:          boolean;
  lastSaved:        string | null;
  selectedSegmentId: string | null;
  isLoading:        boolean;
  backendActive:    boolean;
  uploadProgress:   number | null;
  activeScriptId:   string | null;

  // auth
  signOut: () => Promise<void>;

  // init
  initFromApi: () => Promise<void>;

  // workspace navigation
  setActiveWorkspace: (w: Workspace) => void;

  // ui actions
  setActiveView: (view: ActiveView) => void;
  setActiveVideo: (id: string | null) => void;
  setActiveProject: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSelectedSegment: (id: string | null) => void;
  setUploadProgress: (p: number | null) => void;
  setActiveScriptId: (id: string | null) => void;

  // video
  addVideo: (video: Video) => void;
  updateVideo: (id: string, updates: Partial<Video>) => void;
  deleteVideo: (id: string) => void;

  // segment
  addSegment: (segment: Segment) => void;
  updateSegment: (id: string, updates: Partial<Segment>) => void;
  deleteSegment: (id: string) => void;

  // tag
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  incrementTagUsage: (name: string) => void;

  // project
  addProject: (project: Project) => void;

  // insights
  addInsight: (insight: Insight) => void;
  setInsights: (insights: Insight[]) => void;

  // misc
  markSaved: () => void;
  resetToSeed: () => void;

  // csv import — merges by id (upsert)
  importVideos:   (items: Video[])   => { added: number; updated: number };
  importSegments: (items: Segment[]) => { added: number; updated: number };
  importTags:     (items: Tag[])     => { added: number; updated: number };

  // idea columns
  ideaColumns:    IdeaColumn[];
  setIdeaColumns: (cols: IdeaColumn[]) => void;

  // ideas
  addIdea:    (idea: Idea)                         => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  deleteIdea: (id: string)                         => void;

  // scripts
  addScript:    (script: Script)                         => void;
  updateScript: (id: string, updates: Partial<Script>)   => void;
  deleteScript: (id: string)                             => void;

  // goals
  addGoal:    (goal: Goal)                         => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string)                         => void;

  // swipe items
  addSwipeItem:    (item: SwipeItem)                         => void;
  updateSwipeItem: (id: string, updates: Partial<SwipeItem>) => void;
  deleteSwipeItem: (id: string)                              => void;
}

// ─── store ────────────────────────────────────────────────────────────────────

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── initial state ──────────────────────────────────────────────────────
      projects:        SEED_PROJECTS,
      videos:          SEED_VIDEOS,
      segments:        SEED_SEGMENTS,
      tags:            SEED_TAGS,
      insights:        SEED_INSIGHTS,
      ideaColumns: [
        { id: 'draft',     label: 'Draft',     color: '#71717a' },
        { id: 'scripting', label: 'Scripting', color: '#3b82f6' },
        { id: 'ready',     label: 'Ready',     color: '#8b5cf6' },
        { id: 'filmed',    label: 'Filmed',    color: '#f59e0b' },
        { id: 'published', label: 'Published', color: '#10b981' },
      ],
      ideas:           [],
      scripts:         [],
      goals:           [],
      swipeItems:      [],
      activeProjectId:  'proj-1',
      activeVideoId:    'vid-1',
      activeView:       'library' as ActiveView,
      activeWorkspace:  'intelligence' as Workspace,
      workspaceViews:   { intelligence: 'library', ideas: 'ideas', review: 'dashboard' } as Record<Workspace, ActiveView>,
      searchQuery:      '',
      isSaved:          true,
      lastSaved:        new Date().toISOString(),
      selectedSegmentId: null,
      isLoading:        false,
      backendActive:    false,
      uploadProgress:   null,
      activeScriptId:   null,

      // ── auth ──────────────────────────────────────────────────────────────
      signOut: async () => {
        await createClient().auth.signOut();
        // Clear all data from store on logout
        set({
          projects: [], videos: [], segments: [], tags: [], insights: [],
          ideas: [], scripts: [], goals: [], swipeItems: [],
          activeProjectId: null, activeVideoId: null, backendActive: false,
        });
        window.location.href = '/auth/login';
      },

      // ── init ──────────────────────────────────────────────────────────────
      initFromApi: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await createClient().auth.getSession();
          if (!session) { set({ isLoading: false }); return; }

          const data = await db.fetchAllUserData();
          const hasData = data.projects.length > 0 || data.videos.length > 0 || data.ideas.length > 0;

          if (hasData) {
            set({
              ...data,
              // Use fetched ideaColumns only if non-empty, else keep defaults
              ideaColumns: data.ideaColumns.length > 0 ? data.ideaColumns : get().ideaColumns,
              activeProjectId: data.projects[0]?.id ?? get().activeProjectId,
              backendActive: true,
            });
          } else {
            // Fresh account — seed the DB with the current local data
            const s = get();
            await Promise.all([
              ...s.projects.map(db.upsertProject),
              ...s.videos.map(db.upsertVideo),
              ...s.segments.map(db.upsertSegment),
              ...s.tags.map(db.upsertTag),
              ...s.ideas.map(db.upsertIdea),
              ...s.scripts.map(db.upsertScript),
              ...s.goals.map(db.upsertGoal),
              ...s.swipeItems.map(db.upsertSwipeItem),
              db.saveIdeaColumns(s.ideaColumns),
            ]);
            set({ backendActive: true });
          }
        } catch (e) {
          console.warn('[store] initFromApi failed, staying on local cache:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      // ── workspace navigation ──────────────────────────────────────────────
      setActiveWorkspace: (w) => set(s => {
        const view = s.workspaceViews[w];
        return { activeWorkspace: w, activeView: view };
      }),

      // ── ui ────────────────────────────────────────────────────────────────
      setActiveView: (view) => set(s => ({
        activeView: view,
        workspaceViews: { ...s.workspaceViews, [s.activeWorkspace]: view },
      })),
      setActiveVideo:     (id)   => set({ activeVideoId: id, activeView: 'timeline', activeWorkspace: 'intelligence' }),
      setActiveProject:   (id)   => set({ activeProjectId: id }),
      setSearchQuery:     (q)    => set({ searchQuery: q }),
      setSelectedSegment: (id)   => set({ selectedSegmentId: id }),
      setUploadProgress:  (p)    => set({ uploadProgress: p }),
      setActiveScriptId:  (id)   => set({ activeScriptId: id }),

      // ── video ─────────────────────────────────────────────────────────────
      addVideo: (video) => {
        set(s => ({ videos: [...s.videos, video], isSaved: false }));
        sync(async () => { await db.upsertVideo(video); set({ isSaved: true }); });
      },
      updateVideo: (id, updates) => {
        set(s => ({ videos: s.videos.map(v => v.id === id ? { ...v, ...updates } : v), isSaved: false }));
        sync(async () => {
          const video = get().videos.find(v => v.id === id);
          if (video) { await db.upsertVideo(video); set({ isSaved: true }); }
        });
      },
      deleteVideo: (id) => {
        set(s => ({ videos: s.videos.filter(v => v.id !== id), isSaved: false }));
        sync(async () => { await db.deleteVideo(id); set({ isSaved: true }); });
      },

      // ── segment ───────────────────────────────────────────────────────────
      addSegment: (segment) => {
        set(s => ({ segments: [...s.segments, segment], isSaved: false }));
        sync(async () => { await db.upsertSegment(segment); set({ isSaved: true }); });
      },
      updateSegment: (id, updates) => {
        set(s => ({ segments: s.segments.map(sg => sg.id === id ? { ...sg, ...updates } : sg), isSaved: false }));
        sync(async () => {
          const seg = get().segments.find(sg => sg.id === id);
          if (seg) { await db.upsertSegment(seg); set({ isSaved: true }); }
        });
      },
      deleteSegment: (id) => {
        set(s => ({ segments: s.segments.filter(sg => sg.id !== id), isSaved: false }));
        sync(async () => { await db.deleteSegment(id); set({ isSaved: true }); });
      },

      // ── tag ───────────────────────────────────────────────────────────────
      addTag: (tag) => {
        set(s => ({ tags: [...s.tags, tag], isSaved: false }));
        sync(async () => { await db.upsertTag(tag); set({ isSaved: true }); });
      },
      updateTag: (id, updates) => {
        set(s => ({ tags: s.tags.map(t => t.id === id ? { ...t, ...updates } : t), isSaved: false }));
        sync(async () => {
          const tag = get().tags.find(t => t.id === id);
          if (tag) { await db.upsertTag(tag); set({ isSaved: true }); }
        });
      },
      deleteTag: (id) => {
        set(s => ({ tags: s.tags.filter(t => t.id !== id), isSaved: false }));
        sync(async () => { await db.deleteTag(id); set({ isSaved: true }); });
      },
      incrementTagUsage: (name) => {
        set(s => {
          const tag = s.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
          if (!tag) return {};
          const updated = { ...tag, usageCount: tag.usageCount + 1 };
          sync(async () => { await db.upsertTag(updated); });
          return { tags: s.tags.map(t => t.id === tag.id ? updated : t) };
        });
      },

      // ── project ───────────────────────────────────────────────────────────
      addProject: (project) => {
        set(s => ({ projects: [...s.projects, project], isSaved: false }));
        sync(async () => { await db.upsertProject(project); set({ isSaved: true }); });
      },

      // ── insights ──────────────────────────────────────────────────────────
      addInsight: (insight) => set(s => ({ insights: [...s.insights, insight], isSaved: false })),
      setInsights: (insights) => {
        set({ insights });
        sync(async () => { await db.upsertInsights(insights); });
      },

      // ── misc ──────────────────────────────────────────────────────────────
      markSaved: () => set({ isSaved: true, lastSaved: new Date().toISOString() }),

      resetToSeed: () => {
        set({
          projects:        SEED_PROJECTS,
          videos:          SEED_VIDEOS,
          segments:        SEED_SEGMENTS,
          tags:            SEED_TAGS,
          insights:        SEED_INSIGHTS,
          activeProjectId: 'proj-1',
          activeVideoId:   'vid-1',
        });
      },

      // ── csv import (upsert by id) ──────────────────────────────────────
      importVideos: (items) => {
        let added = 0, updated = 0;
        set(s => {
          const map = Object.fromEntries(s.videos.map(v => [v.id, v]));
          for (const item of items) {
            if (map[item.id]) { map[item.id] = { ...map[item.id], ...item }; updated++; }
            else              { map[item.id] = item; added++; }
          }
          return { videos: Object.values(map), isSaved: false };
        });
        return { added, updated };
      },

      importSegments: (items) => {
        let added = 0, updated = 0;
        set(s => {
          const map = Object.fromEntries(s.segments.map(sg => [sg.id, sg]));
          for (const item of items) {
            if (map[item.id]) { map[item.id] = { ...map[item.id], ...item }; updated++; }
            else              { map[item.id] = item; added++; }
          }
          return { segments: Object.values(map), isSaved: false };
        });
        return { added, updated };
      },

      importTags: (items) => {
        let added = 0, updated = 0;
        set(s => {
          const map = Object.fromEntries(s.tags.map(t => [t.id, t]));
          for (const item of items) {
            if (map[item.id]) { map[item.id] = { ...map[item.id], ...item }; updated++; }
            else              { map[item.id] = item; added++; }
          }
          return { tags: Object.values(map), isSaved: false };
        });
        return { added, updated };
      },

      // ── idea columns ──────────────────────────────────────────────────────
      setIdeaColumns: (cols) => {
        set({ ideaColumns: cols });
        sync(async () => { await db.saveIdeaColumns(cols); });
      },

      // ── ideas ─────────────────────────────────────────────────────────────
      addIdea: (idea) => {
        set(s => ({ ideas: [...s.ideas, idea], isSaved: false }));
        sync(async () => { await db.upsertIdea(idea); set({ isSaved: true }); });
      },
      updateIdea: (id, updates) => {
        set(s => ({ ideas: s.ideas.map(i => i.id === id ? { ...i, ...updates } : i), isSaved: false }));
        sync(async () => {
          const idea = get().ideas.find(i => i.id === id);
          if (idea) { await db.upsertIdea(idea); set({ isSaved: true }); }
        });
      },
      deleteIdea: (id) => {
        set(s => ({ ideas: s.ideas.filter(i => i.id !== id), isSaved: false }));
        sync(async () => { await db.deleteIdea(id); set({ isSaved: true }); });
      },

      // ── scripts ───────────────────────────────────────────────────────────
      addScript: (script) => {
        set(s => ({ scripts: [...s.scripts, script], isSaved: false }));
        sync(async () => { await db.upsertScript(script); set({ isSaved: true }); });
      },
      updateScript: (id, updates) => {
        set(s => ({ scripts: s.scripts.map(sc => sc.id === id ? { ...sc, ...updates } : sc), isSaved: false }));
        sync(async () => {
          const script = get().scripts.find(sc => sc.id === id);
          if (script) { await db.upsertScript(script); set({ isSaved: true }); }
        });
      },
      deleteScript: (id) => {
        set(s => ({ scripts: s.scripts.filter(sc => sc.id !== id), isSaved: false }));
        sync(async () => { await db.deleteScript(id); set({ isSaved: true }); });
      },

      // ── goals ─────────────────────────────────────────────────────────────
      addGoal: (goal) => {
        set(s => ({ goals: [...s.goals, goal], isSaved: false }));
        sync(async () => { await db.upsertGoal(goal); set({ isSaved: true }); });
      },
      updateGoal: (id, updates) => {
        set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, ...updates } : g), isSaved: false }));
        sync(async () => {
          const goal = get().goals.find(g => g.id === id);
          if (goal) { await db.upsertGoal(goal); set({ isSaved: true }); }
        });
      },
      deleteGoal: (id) => {
        set(s => ({ goals: s.goals.filter(g => g.id !== id), isSaved: false }));
        sync(async () => { await db.deleteGoal(id); set({ isSaved: true }); });
      },

      // ── swipe items ───────────────────────────────────────────────────────
      addSwipeItem: (item) => {
        set(s => ({ swipeItems: [...s.swipeItems, item], isSaved: false }));
        sync(async () => { await db.upsertSwipeItem(item); set({ isSaved: true }); });
      },
      updateSwipeItem: (id, upd) => {
        set(s => ({ swipeItems: s.swipeItems.map(it => it.id === id ? { ...it, ...upd } : it), isSaved: false }));
        sync(async () => {
          const item = get().swipeItems.find(it => it.id === id);
          if (item) { await db.upsertSwipeItem(item); set({ isSaved: true }); }
        });
      },
      deleteSwipeItem: (id) => {
        set(s => ({ swipeItems: s.swipeItems.filter(it => it.id !== id), isSaved: false }));
        sync(async () => { await db.deleteSwipeItem(id); set({ isSaved: true }); });
      },
    }),
    {
      name: 'ciw-ui-state',
      // Only persist UI state — data always comes from API (or seed fallback)
      partialize: (state) => ({
        activeView:       state.activeView,
        activeWorkspace:  state.activeWorkspace,
        workspaceViews:   state.workspaceViews,
        activeVideoId:    state.activeVideoId,
        activeProjectId:  state.activeProjectId,
        // Keep a local copy of data for offline/no-supabase mode
        projects:   state.projects,
        videos:     state.videos,
        segments:   state.segments,
        tags:       state.tags,
        insights:   state.insights,
        ideaColumns: state.ideaColumns,
        ideas:      state.ideas,
        scripts:    state.scripts,
        goals:      state.goals,
        swipeItems: state.swipeItems,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isSaved = true;
      },
    }
  )
);
