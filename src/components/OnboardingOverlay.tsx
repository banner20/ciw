'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Lightbulb, BarChart3, Bookmark, Database, ArrowRight, X } from 'lucide-react';
import { useStore } from '@/store/useStore';

const STEPS = [
  {
    icon: Zap,
    color: 'from-violet-500 to-blue-500',
    glow: 'shadow-violet-500/20',
    title: 'Welcome to your Creative Intelligence Workspace',
    body: "This is where you turn scattered content ideas into a repeatable creative system. Let's take a quick look around.",
    cta: 'Show me around',
  },
  {
    icon: Brain,
    color: 'from-violet-500 to-indigo-500',
    glow: 'shadow-violet-500/20',
    title: 'Intelligence Workspace',
    body: 'Upload your videos, tag segments with what works (hooks, transitions, frameworks), and discover patterns across your entire library.',
    cta: 'Got it',
  },
  {
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
    title: 'Ideas Workspace',
    body: 'Capture ideas, write briefs, build scripts, and schedule your content calendar — all in one place, connected to your video intelligence.',
    cta: 'Got it',
  },
  {
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/20',
    title: 'Review Workspace',
    body: 'Track goals, review your content performance over time, and generate reports that show you what formats, hooks, and topics actually work.',
    cta: 'Got it',
  },
  {
    icon: Bookmark,
    color: 'from-pink-500 to-rose-500',
    glow: 'shadow-pink-500/20',
    title: 'One last thing — the Swipe File',
    body: 'Press C anywhere to capture content that inspires you. Save hooks, formats, transitions — anything you want to steal and adapt. Your swipe file feeds directly into your briefs and scripts.',
    cta: "Let's go →",
  },
];

interface Props {
  /** Optional: called when dismissed. Default uses resetToSeed from store. */
  onDone?: () => void;
}

export default function OnboardingOverlay({ onDone }: Props) {
  const { resetToSeed, markSaved } = useStore();
  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(true);

  const current = STEPS[step];
  const Icon    = current.icon;
  const isLast  = step === STEPS.length - 1;

  function advance() {
    if (isLast) {
      setVisible(false);
      if (onDone) onDone();
    } else {
      setStep(s => s + 1);
    }
  }

  function loadSampleData() {
    resetToSeed();
    markSaved();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0d0d0f]/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="w-[440px] bg-[#141418] border border-white/[0.09] rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Dismiss */}
          <div className="flex justify-end px-5 pt-4">
            <button onClick={() => setVisible(false)} className="text-zinc-700 hover:text-zinc-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center pb-2 px-8">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-xl ${current.glow}`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Text */}
          <div className="px-8 pt-4 pb-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-white leading-snug">{current.title}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{current.body}</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-4 h-1.5 bg-violet-500' : 'w-1.5 h-1.5 bg-white/[0.12]'
              }`} />
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-2.5">
            {step === 0 ? (
              <>
                <button onClick={loadSampleData}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/[0.10] text-zinc-400 hover:text-white hover:border-white/[0.20] text-sm font-medium transition-all">
                  <Database className="w-3.5 h-3.5" />
                  Load sample data
                </button>
                <button onClick={advance}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                  {current.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button onClick={advance}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                {current.cta}
                {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
