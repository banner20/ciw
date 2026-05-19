'use client';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

/**
 * Global keyboard shortcuts — mounted once at the app root.
 *
 * Shortcuts (when not focused on an input/textarea):
 *   1           → Intelligence workspace
 *   2           → Ideas workspace
 *   3           → Review workspace
 *   G then L    → Library (chord)
 *   G then I    → Ideas board (chord)
 *   G then S    → Script
 *   G then W    → Swipe file
 *   G then G    → Goals
 *   G then B    → Briefs
 *   G then C    → Calendar
 *   G then D    → Dashboard
 *   ?           → (future: help overlay)
 */
export function useKeyboardShortcuts() {
  const { setActiveWorkspace, setActiveView } = useStore();

  useEffect(() => {
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function isInput(e: KeyboardEvent): boolean {
      const t = e.target as HTMLElement;
      return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
    }

    function handle(e: KeyboardEvent) {
      if (isInput(e) || e.metaKey || e.ctrlKey || e.altKey) return;

      // ── Chord: G + key ─────────────────────────────────────────────────────
      if (pendingG) {
        pendingG = false;
        if (gTimer) { clearTimeout(gTimer); gTimer = null; }

        const chords: Record<string, [string, string]> = {
          l: ['intelligence', 'library'],
          i: ['ideas',        'ideas'],
          s: ['ideas',        'script'],
          w: ['ideas',        'swipe'],
          b: ['ideas',        'briefs'],
          c: ['ideas',        'calendar'],
          d: ['review',       'dashboard'],
          g: ['review',       'goals'],
          r: ['review',       'reports'],
        };
        const target = chords[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          const [workspace, view] = target;
          setActiveWorkspace(workspace as Parameters<typeof setActiveWorkspace>[0]);
          setActiveView(view as Parameters<typeof setActiveView>[0]);
        }
        return;
      }

      // ── Single key ──────────────────────────────────────────────────────────
      switch (e.key) {
        case '1':
          e.preventDefault();
          setActiveWorkspace('intelligence');
          break;
        case '2':
          e.preventDefault();
          setActiveWorkspace('ideas');
          break;
        case '3':
          e.preventDefault();
          setActiveWorkspace('review');
          break;
        case 'g':
        case 'G':
          // Start G chord — wait 800ms for second key
          e.preventDefault();
          pendingG = true;
          gTimer = setTimeout(() => { pendingG = false; }, 800);
          break;
      }
    }

    window.addEventListener('keydown', handle);
    return () => {
      window.removeEventListener('keydown', handle);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [setActiveWorkspace, setActiveView]);
}
