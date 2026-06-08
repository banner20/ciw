'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';

const NOTION_COLUMNS = [
  { id: 'no-status',     label: 'No Status',     color: '#71717a' },
  { id: 'idea',          label: 'Idea',          color: '#eab308' },
  { id: 'to-work-on',    label: 'To Work On',    color: '#f97316' },
  { id: 'scripting',     label: 'Scripting',     color: '#3b82f6' },
  { id: 'filming-ready', label: 'Filming Ready', color: '#8b5cf6' },
  { id: 'editing',       label: 'Editing',       color: '#ec4899' },
  { id: 'ready',         label: 'Ready',         color: '#06b6d4' },
  { id: 'posted',        label: 'Posted',        color: '#10b981' },
];
import {
  RefreshCw, CloudDownload, CheckCircle2,
  AlertCircle, X, ExternalLink, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Idea } from '@/types';

// ── Notion logo SVG ───────────────────────────────────────────────────────────

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.194 12.817 2.913l17.663 12.443c2.913 2.14 3.883 2.72 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.113 79.157C.973 76.25 0 73.923 0 71.013V10.oprch c0-4.667 1.747-6.99 6.017-6.7z" style={{fill: 'transparent'}}/>
      <path d="M61.35.227L6.017 4.313C1.747 4.623 0 6.947 0 11.613v60c0 2.91.973 5.237 3.113 8.143l13.193 17.697c2.137 2.723 4.08 3.307 8.16 3.113l68.26-4.013c5.437-.387 6.99-2.917 6.99-7.193V9.583c0-2.14-.777-2.917-3.3-4.67L74.167 3.14C69.893.033 68.147-.357 61.35.227zM25.293 19.497c-5.247.35-6.437.427-9.417-1.99L8.927 11.4c-.777-.78-.39-1.75 1.557-1.944l52.680-3.887c4.467-.39 6.797 1.167 8.543 2.527l9.123 6.61c.39.195 1.363 1.363.194 1.363l-54.433 3.303-.3.125zM19.710 88.873V31.870c0-2.527.777-3.693 3.107-3.887l59.710-3.5c2.137-.193 3.107.97 3.107 3.497v56.613c0 2.527-.973 4.277-3.883 4.47L23.4 92.567c-2.913.19-3.69-1.167-3.69-3.694zm56.807-54.820c.39 1.75 0 3.5-1.75 3.693l-2.917.583v42.773c-2.527 1.363-4.857 2.14-6.8 2.14-3.107 0-3.883-.973-6.21-3.887l-19.020-29.913v28.94l6.02 1.363s0 3.5-4.857 3.5l-13.387.777c-.39-.777 0-2.723 1.357-3.113l3.497-.973V38.240L28.870 37.850c-.39-1.75.583-4.277 3.303-4.47l14.367-.973 19.793 30.3V34.543l-5.050-.583c-.39-2.143 1.163-3.7 3.107-3.887l13.127-.777z"/>
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SyncState = 'idle' | 'connecting' | 'pulling' | 'done' | 'error';

interface SyncResult {
  created: number;
  updated: number;
  pulled: number;
  errors: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotionSync() {
  const { ideas, updateIdea, addIdea, setIdeaColumns, deleteIdea } = useStore();
  const [open,       setOpen]       = useState(false);
  const [syncState,  setSyncState]  = useState<SyncState>('idle');
  const [result,     setResult]     = useState<SyncResult | null>(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [connected,  setConnected]  = useState<boolean | null>(null);

  // ── Setup / verify connection ────────────────────────────────────────────────

  const checkConnection = useCallback(async () => {
    setSyncState('connecting');
    setErrorMsg('');
    try {
      const res  = await fetch('/api/notion/setup');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setConnected(true);
      setSyncState('idle');
      toast.success('Notion connected', { description: data.message });
    } catch (e) {
      setConnected(false);
      setSyncState('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ── Pull from Notion → SM Tool ───────────────────────────────────────────────

  const pullFromNotion = useCallback(async () => {
    setSyncState('pulling');
    setErrorMsg('');
    setResult(null);
    try {
      const res  = await fetch('/api/notion/pull');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      let updated = 0;
      let created = 0;

      // Update matched existing ideas
      for (const { smToolId, updates } of data.matched ?? []) {
        const existing = ideas.find(i => i.id === smToolId);
        if (!existing) continue;
        updateIdea(smToolId, {
          title:          updates.title          ?? existing.title,
          body:           updates.body           ?? existing.body,
          hook:           updates.hook           ?? existing.hook,
          brand:          updates.brand          ?? existing.brand,
          status:         updates.status         ?? existing.status,
          scheduledDate:  updates.scheduledDate  ?? existing.scheduledDate,
          formatType:     updates.formatType     ?? existing.formatType,
          platform:       updates.platform       ?? existing.platform,
          notionPageId:   updates.notionPageId,
          notionSyncedAt: new Date().toISOString(),
        });
        updated++;
      }

      // Create new ideas from Notion items with no SM Tool ID
      // — but first check if we already imported this Notion page (match by notionPageId)
      for (const partial of data.newFromNotion ?? []) {
        const existingByNotionId = ideas.find(i => i.notionPageId === partial.notionPageId);
        if (existingByNotionId) {
          // Already imported — just update fields
          updateIdea(existingByNotionId.id, {
            title:         partial.title         ?? existingByNotionId.title,
            body:          partial.body          ?? existingByNotionId.body,
            hook:          partial.hook          ?? existingByNotionId.hook,
            brand:         partial.brand         ?? existingByNotionId.brand,
            status:        partial.status        ?? existingByNotionId.status,
            scheduledDate: partial.scheduledDate ?? existingByNotionId.scheduledDate,
            formatType:    partial.formatType    ?? existingByNotionId.formatType,
            platform:      partial.platform      ?? existingByNotionId.platform,
            notionSyncedAt: new Date().toISOString(),
          });
          updated++;
        } else {
          const newIdea: Idea = {
            id:            `idea-notion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            projectId:     ideas[0]?.projectId ?? 'default',
            title:         partial.title        ?? 'Untitled',
            hook:          partial.hook         ?? '',
            body:          partial.body         ?? '',
            brand:         partial.brand,
            status:        partial.status       ?? 'idea',
            platform:      partial.platform,
            formatType:    partial.formatType,
            tags:          [],
            createdAt:     new Date().toISOString(),
            notionPageId:  partial.notionPageId,
            notionSyncedAt: new Date().toISOString(),
            scheduledDate: partial.scheduledDate,
          };
          addIdea(newIdea);
          created++;
        }
      }

      setResult({ created, updated, pulled: created + updated, errors: 0 });
      setSyncState('done');
      toast.success('Pulled from Notion', {
        description: `${updated} updated · ${created} new from Notion`,
      });
    } catch (e) {
      setSyncState('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [ideas, updateIdea, addIdea]);

  // ── Deduplicate ideas ────────────────────────────────────────────────────────

  const deduplicateIdeas = useCallback(() => {
    const toDelete: string[] = [];

    // 1. Dedupe by notionPageId — keep the one with a script or most recent createdAt
    const byNotionId = new Map<string, typeof ideas[number]>();
    for (const idea of ideas) {
      if (!idea.notionPageId) continue;
      const existing = byNotionId.get(idea.notionPageId);
      if (!existing) { byNotionId.set(idea.notionPageId, idea); continue; }
      // Keep whichever was created earlier (the original import)
      const keepExisting = existing.createdAt <= idea.createdAt;
      toDelete.push(keepExisting ? idea.id : existing.id);
      byNotionId.set(idea.notionPageId, keepExisting ? existing : idea);
    }

    // 2. Dedupe by title (case-insensitive) among remaining — keep earliest
    const seen = new Map<string, string>(); // normalised title → id to keep
    for (const idea of ideas) {
      if (toDelete.includes(idea.id)) continue;
      const key = idea.title.trim().toLowerCase();
      if (!key) continue;
      const keepId = seen.get(key);
      if (!keepId) { seen.set(key, idea.id); continue; }
      // Keep the one already in the map (earliest seen), delete this one
      toDelete.push(idea.id);
    }

    toDelete.forEach(id => deleteIdea(id));
    toast.success(`Removed ${toDelete.length} duplicate${toDelete.length !== 1 ? 's' : ''}`, {
      description: `${ideas.length - toDelete.length} ideas remaining`,
    });
  }, [ideas, deleteIdea]);

  // ── Unsynced count ───────────────────────────────────────────────────────────

  const unsyncedCount = ideas.filter(i => !i.notionPageId).length;
  const isWorking = syncState === 'connecting' || syncState === 'pulling';

  return (
    <>
      {/* Trigger button in TopBar */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Notion sync"
        className={cn(
          'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
          connected === true
            ? 'bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-white'
            : connected === false
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-zinc-800 border border-white/[0.08] text-zinc-500 hover:text-zinc-300'
        )}
      >
        <NotionIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Notion</span>
        {unsyncedCount > 0 && connected !== false && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
            {unsyncedCount > 9 ? '9+' : unsyncedCount}
          </span>
        )}
        {isWorking && (
          <RefreshCw className="w-3 h-3 animate-spin ml-0.5" />
        )}
      </button>

      {/* Sync panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="notion-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="notion-panel"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed top-12 right-4 z-50 w-[340px] bg-[#18181c] border border-white/[0.09]
                         rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
                <NotionIcon className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white flex-1">Notion Sync</span>
                {connected === true && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                )}
                {connected === false && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Error
                  </span>
                )}
                <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total ideas', value: ideas.length },
                    { label: 'Synced',      value: ideas.filter(i => i.notionPageId).length },
                    { label: 'Not synced',  value: unsyncedCount },
                  ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-white">{s.value}</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Connection check */}
                {connected === null && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-amber-300/80">
                      First time? Verify your Notion connection. This also adds the required properties to your Content Pipeline database.
                    </p>
                    <button
                      onClick={checkConnection}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {syncState === 'connecting' ? 'Connecting…' : 'Verify connection'}
                    </button>
                  </div>
                )}

                {/* Error */}
                {syncState === 'error' && errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-xs text-red-400 leading-relaxed">{errorMsg}</p>
                    {errorMsg.includes('NOTION_TOKEN') || errorMsg.includes('configured') ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-red-400/70">Add these to your .env.local and Vercel env vars:</p>
                        <code className="block text-[10px] text-zinc-400 bg-black/30 rounded px-2 py-1.5 font-mono">
                          NOTION_TOKEN=secret_…<br />
                          NOTION_CONTENT_DB_ID=…
                        </code>
                        <a
                          href="https://www.notion.so/my-integrations"
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 mt-1"
                        >
                          Get your token <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Success result */}
                {syncState === 'done' && result && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-xs text-emerald-300">
                      {result.created > 0 && <span>{result.created} created · </span>}
                      {result.updated > 0 && <span>{result.updated} updated</span>}
                      {result.pulled > 0  && <span>{result.pulled} pulled from Notion</span>}
                      {result.errors > 0  && <span className="text-red-400"> · {result.errors} errors</span>}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-1">
                  <button
                    onClick={pullFromNotion}
                    disabled={isWorking}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                      'bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    {syncState === 'pulling' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudDownload className="w-3.5 h-3.5" />
                    )}
                    {syncState === 'pulling' ? 'Pulling…' : 'Pull from Notion'}
                  </button>
                </div>

                {/* Utility buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setIdeaColumns(NOTION_COLUMNS); toast.success('Columns reset to Notion structure'); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.07]"
                  >
                    Reset columns
                  </button>
                  <button
                    onClick={deduplicateIdeas}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/15"
                  >
                    Remove duplicates
                  </button>
                </div>

                {/* How it works */}
                <div className="pt-1 border-t border-white/[0.05] space-y-1.5">
                  <p className="text-[10px] text-zinc-700 font-medium uppercase tracking-wider">How pull works</p>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Reads your Notion Content Pipeline. Pages with an existing <span className="text-zinc-500">SM Tool ID</span> are matched and updated. Pages without one are imported as new ideas. No data is written to Notion.
                  </p>
                  <p className="text-[10px] text-zinc-700 italic">Push (SM Tool → Notion) coming soon.</p>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
