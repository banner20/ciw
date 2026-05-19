'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Workspaces',
    shortcuts: [
      { keys: ['1'], label: 'Intelligence workspace' },
      { keys: ['2'], label: 'Ideas workspace' },
      { keys: ['3'], label: 'Review workspace' },
    ],
  },
  {
    title: 'Go to view  (press G then…)',
    shortcuts: [
      { keys: ['G', 'L'], label: 'Library' },
      { keys: ['G', 'I'], label: 'Ideas board' },
      { keys: ['G', 'S'], label: 'Script editor' },
      { keys: ['G', 'B'], label: 'Briefs' },
      { keys: ['G', 'C'], label: 'Calendar' },
      { keys: ['G', 'W'], label: 'Swipe file' },
      { keys: ['G', 'D'], label: 'Dashboard' },
      { keys: ['G', 'G'], label: 'Goals' },
      { keys: ['G', 'R'], label: 'Reports' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['C'], label: 'Quick capture to swipe file' },
      { keys: ['/'], label: 'Focus search (in Swipe File)' },
      { keys: ['Esc'], label: 'Close modal / panel' },
      { keys: ['?'], label: 'Show this help' },
    ],
  },
];

function Kbd({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-white/[0.06] border border-white/[0.12] text-[11px] font-mono text-zinc-300 shadow-sm">
      {k}
    </kbd>
  );
}

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const isInput = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (!isInput && e.key === '?') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Keyboard shortcuts (?)"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
      >
        <Keyboard className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="sc-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="sc-panel"
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed top-16 right-4 z-50 w-[360px] bg-[#141418] border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm font-semibold text-white">Keyboard shortcuts</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
                {SECTIONS.map(section => (
                  <div key={section.title}>
                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">{section.title}</div>
                    <div className="space-y-1.5">
                      {section.shortcuts.map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">{s.label}</span>
                          <div className="flex items-center gap-1">
                            {s.keys.map((k, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <Kbd k={k} />
                                {i < s.keys.length - 1 && <span className="text-[10px] text-zinc-700">then</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-white/[0.06] text-[10px] text-zinc-700 text-center">
                Press <Kbd k="?" /> to toggle this panel
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
