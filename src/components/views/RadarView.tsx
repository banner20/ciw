'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Radar, Plus, RefreshCw, Trash2, Upload, Search, Hash, X, ExternalLink,
  Sparkles, Mic, Bookmark, Flame, Loader2, FileText, Users, Wand2, Laptop, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import * as rdb from '@/lib/radar/db';
import { mergePost, normalizeHandle, parseImport } from '@/lib/radar/normalize';
import { formatCount, MIN_BASELINE, scorePosts } from '@/lib/radar/score';
import type { RadarCreator, RadarPost, RadarSource, ScoredPost } from '@/lib/radar/types';

type SortKey = 'outlier' | 'views' | 'newest' | 'engagement';
type SourceFilter = 'all' | RadarSource;

const WINDOWS = [
  { id: 7, label: '7d' }, { id: 30, label: '30d' }, { id: 90, label: '90d' }, { id: 0, label: 'All' },
] as const;

const NICHE_KEY = 'radar:niche';
const ONLINE_MS = 5 * 60_000; // helper polls every ~2 min; offline after 5

function isOnline(a: rdb.RadarAgentStatus | null) {
  return !!a?.last_seen_at && Date.now() - new Date(a.last_seen_at).getTime() < ONLINE_MS;
}
function agentBusy(a: rdb.RadarAgentStatus | null) {
  return !!a && (!!a.pull_requested_at || !!a.last_status?.startsWith('running'));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function OutlierBadge({ value }: { value?: number }) {
  if (value == null) return <span className="text-[10px] text-zinc-700" title={`Needs ${MIN_BASELINE}+ posts from this creator`}>—</span>;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border tabular-nums',
      value >= 3 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        : value >= 1.5 ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
        : 'bg-white/[0.03] border-white/[0.07] text-zinc-500',
    )}>
      {value >= 3 && <Flame className="w-2.5 h-2.5" />}
      {value.toFixed(1)}×
    </span>
  );
}

function ago(days?: number) {
  if (days == null) return '';
  if (days < 1) return 'today';
  if (days < 30) return `${Math.floor(days)}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Main view ────────────────────────────────────────────────────────────────

export default function RadarView() {
  const addSwipeItem = useStore(s => s.addSwipeItem);

  const [creators, setCreators] = useState<RadarCreator[]>([]);
  const [posts, setPosts] = useState<RadarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [busy, setBusy] = useState<string | null>(null); // label of the running job

  const [handleInput, setHandleInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [niche, setNiche] = useState(() => {
    try { return localStorage.getItem(NICHE_KEY) ?? ''; } catch { return ''; }
  });

  const [source, setSource] = useState<SourceFilter>('all');
  const [windowDays, setWindowDays] = useState<number>(30);
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('outlier');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [agent, setAgent] = useState<rdb.RadarAgentStatus | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    rdb.fetchAgent().then(setAgent);
    rdb.fetchRadar().then(({ creators, posts, error }) => {
      setCreators(creators); postsRef.current = posts; setPosts(posts); setLoadError(error); setLoading(false);
    });
  }, []);

  // While the computer helper is working, refresh status + results every 15s.
  const busyAgent = agentBusy(agent);
  useEffect(() => {
    if (!busyAgent) return;
    const t = setInterval(async () => {
      const a = await rdb.fetchAgent();
      setAgent(a);
      const { creators, posts } = await rdb.fetchRadar();
      postsRef.current = posts; setPosts(posts); setCreators(creators);
      if (!agentBusy(a)) toast.success(a?.last_status ? `Pull finished: ${a.last_status}` : 'Pull finished');
    }, 15_000);
    return () => clearInterval(t);
  }, [busyAgent]);

  const saveNiche = (v: string) => {
    setNiche(v);
    try { localStorage.setItem(NICHE_KEY, v); } catch { /* ignore */ }
  };

  // Latest posts, readable synchronously inside async handlers.
  const postsRef = useRef<RadarPost[]>([]);
  const commitPosts = useCallback((next: RadarPost[]) => {
    const ref = postsRef;
    ref.current = next;
    setPosts(next);
  }, []);

  /** Merge incoming posts into state + DB without losing transcripts/analysis. */
  const ingest = useCallback(async (incoming: RadarPost[]) => {
    const map = new Map(postsRef.current.map(p => [p.id, p]));
    const merged = incoming.map(p => mergePost(map.get(p.id), p));
    for (const m of merged) map.set(m.id, m);
    commitPosts(Array.from(map.values()));
    const err = await rdb.upsertPosts(merged);
    if (err) toast.error(`Couldn't save to database: ${err}`);
    return merged;
  }, [commitPosts]);

  const updatePost = useCallback(async (id: string, updates: Partial<RadarPost>) => {
    const current = postsRef.current.find(p => p.id === id);
    if (!current) return;
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    commitPosts(postsRef.current.map(p => (p.id === id ? next : p)));
    const err = await rdb.upsertPosts([next]);
    if (err) toast.error(`Couldn't save: ${err}`);
  }, [commitPosts]);

  // ── creators ──────────────────────────────────────────────────────────────

  async function addCreators() {
    const handles = handleInput.split(/[\s,]+/).map(normalizeHandle).filter(Boolean);
    const fresh = handles.filter(h => !creators.some(c => c.handle === h))
      .map<RadarCreator>(h => ({ id: `ig:${h}`, handle: h, addedAt: new Date().toISOString() }));
    if (!fresh.length) { setHandleInput(''); return; }
    setCreators(prev => [...prev, ...fresh]);
    setHandleInput('');
    const err = await rdb.upsertCreators(fresh);
    if (err) toast.error(err); else toast.success(`Tracking ${fresh.map(c => '@' + c.handle).join(', ')}`);
  }

  async function removeCreator(c: RadarCreator) {
    setCreators(prev => prev.filter(x => x.id !== c.id));
    if (creatorFilter === c.handle) setCreatorFilter(null);
    await rdb.deleteCreator(c.id);
  }

  async function refreshCreators(list: RadarCreator[]) {
    if (!list.length) return;
    // Preferred: the helper on your computer (logged-in scraping account, sees age-restricted profiles)
    if (isOnline(agent)) {
      const handles = list.length === creators.length ? null : list.map(c => c.handle);
      const err = await rdb.requestAgentPull(handles);
      if (err) { toast.error(err); return; }
      setAgent(a => a && { ...a, pull_requested_at: new Date().toISOString(), pull_handles: handles, last_status: 'requested' });
      toast.success('Sent to your computer. It starts within ~2 minutes; results appear here as each creator finishes.');
      return;
    }
    if (agent) toast('Your computer helper is offline, so trying Apify instead (public profiles only).');
    setBusy(`Pulling ${list.length === 1 ? '@' + list[0].handle : list.length + ' creators'}…`);
    try {
      // small batches keep each Apify run under the function time limit
      let total = 0;
      for (let i = 0; i < list.length; i += 5) {
        const batch = list.slice(i, i + 5);
        const { posts: got } = await postJson<{ posts: RadarPost[] }>('/api/radar/fetch', {
          mode: 'profiles', targets: batch.map(c => c.handle), limit: 30,
        });
        await ingest(got);
        total += got.length;
        const now = new Date().toISOString();
        const updated = batch.map(c => ({ ...c, lastFetchedAt: now }));
        setCreators(prev => prev.map(c => updated.find(u => u.id === c.id) ?? c));
        await rdb.upsertCreators(updated);
      }
      toast.success(`Pulled ${total} posts`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function discover() {
    const tags = tagInput.split(/[\s,]+/).map(t => t.replace(/^#/, '')).filter(Boolean);
    if (!tags.length) return;
    setBusy(`Searching ${tags.map(t => '#' + t).join(' ')}…`);
    try {
      const { posts: got } = await postJson<{ posts: RadarPost[] }>('/api/radar/fetch', { mode: 'hashtags', targets: tags, limit: 40 });
      await ingest(got);
      setSource('discovery'); setSort('views'); setCreatorFilter(null);
      toast.success(`Found ${got.length} posts`);
      setTagInput('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    let added = 0, skipped = 0;
    for (const f of Array.from(files)) {
      const { posts: got, skipped: s } = parseImport(await f.text(), f.name);
      skipped += s;
      if (got.length) { await ingest(got); added += got.length; }
    }
    if (fileRef.current) fileRef.current.value = '';
    if (added) toast.success(`Imported ${added} posts${skipped ? ` (${skipped} skipped)` : ''}`);
    else toast.error('No Instagram posts found in that file. Expected yt-dlp JSON or an Apify export.');
  }

  // ── transcription + analysis ──────────────────────────────────────────────

  const transcribe = useCallback(async (p: RadarPost, file?: File) => {
    let transcript: string;
    if (file) {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/radar/transcribe', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? (res.status === 413 ? 'File too large' : `Failed (${res.status})`));
      transcript = data.transcript;
    } else {
      if (!p.mediaUrl) throw new Error('No video link for this post. Upload the audio or paste the transcript.');
      transcript = (await postJson<{ transcript: string }>('/api/radar/transcribe', { mediaUrl: p.mediaUrl })).transcript;
    }
    await updatePost(p.id, { transcript });
    return transcript;
  }, [updatePost]);

  const analyze = useCallback(async (p: ScoredPost, transcriptOverride?: string) => {
    const { analysis } = await postJson<{ analysis: RadarPost['analysis'] }>('/api/radar/analyze', {
      niche: niche || undefined,
      post: {
        caption: p.caption, transcript: transcriptOverride ?? p.transcript, handle: p.handle,
        views: p.views, likes: p.likes, comments: p.comments, outlier: p.outlier, durationSec: p.durationSec,
      },
    });
    await updatePost(p.id, { analysis });
  }, [niche, updatePost]);

  // ── derived ───────────────────────────────────────────────────────────────

  const scored = useMemo(() => scorePosts(posts), [posts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scored.filter(p =>
      (source === 'all' || p.source === source) &&
      (!creatorFilter || p.handle === creatorFilter) &&
      (!windowDays || (p.ageDays != null && p.ageDays <= windowDays)) &&
      (!q || p.caption.toLowerCase().includes(q) || p.handle.includes(q) || p.transcript?.toLowerCase().includes(q) || p.analysis?.topic.toLowerCase().includes(q)),
    );
    const key: Record<SortKey, (p: ScoredPost) => number> = {
      outlier: p => p.outlier ?? -1,
      views: p => p.views ?? p.likes ?? -1,
      newest: p => (p.postedAt ? new Date(p.postedAt).getTime() : 0),
      engagement: p => p.engagementRate ?? -1,
    };
    return list.sort((a, b) => key[sort](b) - key[sort](a));
  }, [scored, source, creatorFilter, windowDays, query, sort]);

  const creatorStats = useMemo(() => {
    const m = new Map<string, { count: number; baseline?: number; metric: string; hot: number }>();
    for (const p of scored) {
      const s = m.get(p.handle) ?? { count: 0, baseline: p.baseline, metric: p.metric, hot: 0 };
      s.count++; if ((p.outlier ?? 0) >= 3) s.hot++;
      m.set(p.handle, s);
    }
    return m;
  }, [scored]);

  const hotCount = visible.filter(p => (p.outlier ?? 0) >= 3).length;
  const selected = scored.find(p => p.id === selectedId) ?? null;

  async function processTop(n: number) {
    const targets = visible.filter(p => p.isVideo && !p.analysis).slice(0, n);
    if (!targets.length) { toast('Everything visible is already analyzed'); return; }
    let done = 0, failed = 0;
    for (const p of targets) {
      setBusy(`Breaking down ${done + failed + 1}/${targets.length} (@${p.handle})…`);
      try {
        let t = p.transcript;
        if (!t && p.mediaUrl) { try { t = await transcribe(p); } catch { /* fall back to caption-only */ } }
        await analyze(p, t);
        done++;
      } catch { failed++; }
    }
    setBusy(null);
    toast.success(`Analyzed ${done}${failed ? `, ${failed} failed` : ''}`);
  }

  async function saveToSwipe(p: ScoredPost) {
    const a = p.analysis;
    addSwipeItem({
      id: `swipe-${Date.now()}`,
      title: a?.hook || p.caption.split('\n')[0].slice(0, 120) || p.url,
      url: p.url,
      creator: p.handle,
      notes: [
        p.outlier && `${p.outlier.toFixed(1)}× @${p.handle}'s usual ${p.metric}`,
        a?.whyItWorked && `Why it worked: ${a.whyItWorked}`,
        a?.template && `Template: ${a.template}`,
        a?.adaptation && `Our version: ${a.adaptation}`,
        p.transcript && `Transcript: ${p.transcript}`,
      ].filter(Boolean).join('\n\n'),
      tags: p.hashtags.slice(0, 6),
      platform: 'instagram',
      savedAt: new Date().toISOString(),
      viewCount: p.views,
      hookType: a?.hookType,
      contentPillar: a?.pillar,
    });
    await updatePost(p.id, { savedToSwipe: true });
    toast.success('Saved to Swipe File');
  }

  async function removePost(p: ScoredPost) {
    commitPosts(postsRef.current.filter(x => x.id !== p.id));
    setSelectedId(null);
    await rdb.deletePosts([p.id]);
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left rail: creators + discovery */}
      <aside className="w-64 shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Users className="w-3.5 h-3.5 text-violet-400" /> Tracked creators
            <span className="text-zinc-600 font-normal">{creators.length}</span>
          </div>
          <div className="flex gap-1.5">
            <input value={handleInput} onChange={e => setHandleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCreators()}
              placeholder="@handle, @another"
              className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40" />
            <button onClick={addCreators} className="px-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button disabled={!!busy || !creators.length} onClick={() => refreshCreators(creators)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border border-white/[0.08] text-zinc-300 hover:bg-white/[0.04] disabled:opacity-40">
            <RefreshCw className="w-3 h-3" /> Pull latest for all
          </button>
          <button onClick={() => setConnectOpen(true)}
            className="w-full flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300">
            <Laptop className="w-3 h-3" />
            <span className={cn('w-1.5 h-1.5 rounded-full', isOnline(agent) ? 'bg-emerald-400' : 'bg-zinc-600')} />
            {!agent ? 'Connect your computer (scraping account)'
              : isOnline(agent) ? (busyAgent ? `Computer: ${agent.last_status ?? 'working'}…` : 'Computer online')
              : 'Computer offline. Start the helper'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {creators.length === 0 && !loading && (
            <p className="px-4 py-3 text-[11px] text-zinc-600 leading-relaxed">
              Add competitor handles above. Each pull grabs their last 30 posts, so you can see which ones beat their usual numbers.
            </p>
          )}
          <button onClick={() => setCreatorFilter(null)}
            className={cn('w-full text-left px-4 py-1.5 text-xs', !creatorFilter ? 'text-white bg-white/[0.04]' : 'text-zinc-500 hover:text-zinc-300')}>
            All creators
          </button>
          {creators.map(c => {
            const s = creatorStats.get(c.handle);
            return (
              <div key={c.id} className={cn('group flex items-center gap-2 px-4 py-1.5 cursor-pointer', creatorFilter === c.handle ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]')}
                onClick={() => setCreatorFilter(creatorFilter === c.handle ? null : c.handle)}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-200 truncate">@{c.handle}</div>
                  <div className="text-[10px] text-zinc-600">
                    {s ? `${s.count} posts · median ${formatCount(s.baseline)} ${s.metric}` : 'not pulled yet'}
                    {s?.hot ? <span className="text-emerald-400"> · {s.hot} 🔥</span> : null}
                  </div>
                </div>
                <button title="Pull latest" disabled={!!busy} onClick={e => { e.stopPropagation(); refreshCreators([c]); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white disabled:opacity-20"><RefreshCw className="w-3 h-3" /></button>
                <button title="Stop tracking" onClick={e => { e.stopPropagation(); removeCreator(c); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Hash className="w-3.5 h-3.5 text-pink-400" /> Discover by hashtag
          </div>
          <div className="flex gap-1.5">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && discover()}
              placeholder="#fitness, #mindset"
              className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-pink-500/40" />
            <button disabled={!!busy} onClick={discover} className="px-2 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 hover:bg-pink-500/25 disabled:opacity-40">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border border-dashed border-white/[0.12] text-zinc-400 hover:bg-white/[0.03]">
            <Upload className="w-3 h-3" /> Import yt-dlp / Apify JSON
          </button>
          <input ref={fileRef} type="file" accept=".json,.jsonl,.txt,application/json" multiple hidden onChange={e => importFiles(e.target.files)} />
          <input value={niche} onChange={e => saveNiche(e.target.value)} placeholder="Our niche (helps the AI breakdown)"
            className="w-full bg-transparent border-b border-white/[0.06] py-1 text-[11px] text-zinc-400 placeholder:text-zinc-700 outline-none" />
        </div>
      </aside>

      {/* Main feed */}
      <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="px-5 py-3 border-b border-white/[0.06] flex flex-wrap items-center gap-2">
          <Radar className="w-4 h-4 text-violet-400" />
          <h1 className="text-sm font-semibold text-white mr-2">Radar</h1>
          <span className="text-[11px] text-zinc-500 mr-auto">
            {visible.length} posts{hotCount ? <> · <span className="text-emerald-400">{hotCount} at 3×+ their usual</span></> : null}
          </span>

          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
            {(['all', 'tracked', 'discovery', 'import'] as SourceFilter[]).map(s => (
              <button key={s} onClick={() => setSource(s)}
                className={cn('px-2 py-0.5 rounded-md text-[11px] capitalize', source === s ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                {s === 'import' ? 'Imported' : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
            {WINDOWS.map(w => (
              <button key={w.id} onClick={() => setWindowDays(w.id)}
                className={cn('px-2 py-0.5 rounded-md text-[11px]', windowDays === w.id ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                {w.label}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1 text-[11px] text-zinc-300 outline-none">
            <option value="outlier">Sort: Outlier score</option>
            <option value="views">Sort: Views</option>
            <option value="engagement">Sort: Engagement rate</option>
            <option value="newest">Sort: Newest</option>
          </select>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search captions, transcripts"
              className="w-44 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-6 pr-2 py-1 text-[11px] text-white placeholder:text-zinc-600 outline-none" />
          </div>
          <button disabled={!!busy || !visible.length} onClick={() => processTop(10)}
            title="Transcribe and break down the top 10 un-analyzed videos in this list"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-violet-500/20 border border-violet-500/30 text-violet-200 hover:bg-violet-500/30 disabled:opacity-40">
            <Wand2 className="w-3 h-3" /> Break down top 10
          </button>
        </header>

        {busy && (
          <div className="px-5 py-1.5 text-[11px] text-violet-300 bg-violet-500/[0.06] border-b border-violet-500/10 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> {busy}
          </div>
        )}
        {loadError && (
          <div className="px-5 py-2 text-[11px] text-amber-300 bg-amber-500/[0.06] border-b border-amber-500/10">
            Couldn&apos;t load Radar tables ({loadError}). Run the Radar section of <code>supabase/schema.sql</code> in the Supabase SQL editor.
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-xs text-zinc-600">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-sm text-center space-y-2">
                <Radar className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-300">Nothing here yet</p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Add competitors on the left and hit <b>Pull latest</b>, search a hashtag, or import the JSON that
                  <code className="mx-1 text-zinc-400">yt-dlp --dump-json</code>prints. Try widening the date window too.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d0d0f] z-10">
                <tr className="text-[10px] uppercase tracking-wide text-zinc-600 text-left">
                  <th className="pl-5 py-2 font-medium">Post</th>
                  <th className="px-2 font-medium text-right">vs usual</th>
                  <th className="px-2 font-medium text-right">Views</th>
                  <th className="px-2 font-medium text-right">Likes</th>
                  <th className="px-2 font-medium text-right">Comments</th>
                  <th className="px-2 font-medium text-right">Eng.</th>
                  <th className="pr-5 px-2 font-medium text-right">Posted</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)}
                    className={cn('border-t border-white/[0.04] cursor-pointer', selectedId === p.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]')}>
                    <td className="pl-5 py-2 max-w-0 w-full">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-12 rounded-md bg-white/[0.04] overflow-hidden shrink-0">
                          {p.thumbnailUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-zinc-300 font-medium">@{p.handle}</span>
                            {p.discoveredVia && p.source === 'discovery' && <span className="text-pink-400/70">{p.discoveredVia}</span>}
                            {p.transcript && <span title="Transcribed"><FileText className="w-3 h-3 text-zinc-500" /></span>}
                            {p.analysis && <span title="Analyzed"><Sparkles className="w-3 h-3 text-violet-400" /></span>}
                            {p.savedToSwipe && <span title="In swipe file"><Bookmark className="w-3 h-3 text-amber-400" /></span>}
                          </div>
                          <p className="text-zinc-500 truncate">{p.analysis?.hook || p.caption.split('\n')[0] || '(no caption)'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 text-right"><OutlierBadge value={p.outlier} /></td>
                    <td className="px-2 text-right tabular-nums text-zinc-300">{formatCount(p.views)}</td>
                    <td className="px-2 text-right tabular-nums text-zinc-400">{formatCount(p.likes)}</td>
                    <td className="px-2 text-right tabular-nums text-zinc-500">{formatCount(p.comments)}</td>
                    <td className="px-2 text-right tabular-nums text-zinc-500">{p.engagementRate != null ? `${(p.engagementRate * 100).toFixed(1)}%` : '—'}</td>
                    <td className="pr-5 px-2 text-right text-zinc-600 whitespace-nowrap">{ago(p.ageDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {connectOpen && (
        <ConnectDialog agent={agent} onClose={() => setConnectOpen(false)} onCreated={() => rdb.fetchAgent().then(setAgent)} />
      )}

      {selected && (
        <PostPanel
          key={selected.id}
          post={selected}
          onClose={() => setSelectedId(null)}
          onTranscribe={transcribe}
          onAnalyze={analyze}
          onSaveTranscript={t => updatePost(selected.id, { transcript: t })}
          onSwipe={() => saveToSwipe(selected)}
          onDelete={() => removePost(selected)}
        />
      )}
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function PostPanel({ post, onClose, onTranscribe, onAnalyze, onSaveTranscript, onSwipe, onDelete }: {
  post: ScoredPost;
  onClose: () => void;
  onTranscribe: (p: RadarPost, file?: File) => Promise<string>;
  onAnalyze: (p: ScoredPost, transcript?: string) => Promise<void>;
  onSaveTranscript: (t: string) => Promise<void>;
  onSwipe: () => void;
  onDelete: () => void;
}) {
  const [working, setWorking] = useState<'transcribe' | 'analyze' | null>(null);
  const [draft, setDraft] = useState(post.transcript ?? '');
  const audioRef = useRef<HTMLInputElement>(null);
  const a = post.analysis;

  async function run(kind: 'transcribe' | 'analyze', fn: () => Promise<unknown>) {
    setWorking(kind);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setWorking(null); }
  }

  return (
    <aside className="w-[380px] shrink-0 border-l border-white/[0.06] bg-[#111114] flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="text-sm font-semibold text-white flex-1 truncate">@{post.handle}</span>
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white" title="Open on Instagram">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        <div className="grid grid-cols-4 gap-2">
          {[
            ['vs usual', post.outlier != null ? `${post.outlier.toFixed(1)}×` : '—'],
            ['views', formatCount(post.views)],
            ['likes', formatCount(post.likes)],
            ['comments', formatCount(post.comments)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
              <div className="text-[10px] text-zinc-600">{k}</div>
              <div className="text-sm text-white font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600">
          {post.baseline ? `@${post.handle}'s median is ${formatCount(post.baseline)} ${post.metric}.` : `Need ${MIN_BASELINE}+ posts from @${post.handle} to compare against their usual.`}
          {post.durationSec ? ` · ${Math.round(post.durationSec)}s` : ''}
          {post.history.length > 1 ? ` · ${post.history.length} snapshots` : ''}
        </p>

        <section>
          <h3 className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">Caption</h3>
          <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{post.caption || '(none)'}</p>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] uppercase tracking-wide text-zinc-600 flex-1">Transcript</h3>
            {post.mediaUrl && (
              <button disabled={!!working} onClick={() => run('transcribe', async () => setDraft(await onTranscribe(post)))}
                className="flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200 disabled:opacity-40">
                {working === 'transcribe' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />} Transcribe
              </button>
            )}
            <button disabled={!!working} onClick={() => audioRef.current?.click()} title="Upload audio/video (e.g. from yt-dlp -x). Keep it under ~4 MB."
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white disabled:opacity-40">
              <Upload className="w-3 h-3" /> Upload audio
            </button>
            <input ref={audioRef} type="file" accept="audio/*,video/*" hidden onChange={e => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (f) run('transcribe', async () => setDraft(await onTranscribe(post, f)));
            }} />
          </div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5}
            placeholder="Transcribe, upload audio, or paste the transcript here"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-violet-500/30 resize-y" />
          {draft !== (post.transcript ?? '') && (
            <button onClick={() => onSaveTranscript(draft)} className="text-[11px] text-violet-300 hover:text-violet-200">Save transcript</button>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center">
            <h3 className="text-[10px] uppercase tracking-wide text-zinc-600 flex-1">Breakdown</h3>
            <button disabled={!!working} onClick={() => run('analyze', () => onAnalyze(post, draft || undefined))}
              className="flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200 disabled:opacity-40">
              {working === 'analyze' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {a ? 'Re-analyze' : 'Analyze'}
            </button>
          </div>
          {a ? (
            <div className="space-y-2.5">
              <p className="text-white font-medium leading-snug">&ldquo;{a.hook}&rdquo;</p>
              <div className="flex flex-wrap gap-1">
                {[a.hookType, a.format, a.pillar, a.topic].filter(Boolean).map(t => (
                  <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.07] text-zinc-400">{t}</span>
                ))}
              </div>
              {[['Why it worked', a.whyItWorked], ['Template', a.template], ['Our version', a.adaptation]].map(([k, v]) => v && (
                <div key={k}>
                  <div className="text-[10px] text-zinc-600 mb-0.5">{k}</div>
                  <p className="text-zinc-300 leading-relaxed">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600">Transcribe first for a much better breakdown. Caption-only works too.</p>
          )}
        </section>
      </div>

      <div className="p-3 border-t border-white/[0.06] flex gap-2">
        <button onClick={onSwipe} disabled={post.savedToSwipe}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 disabled:opacity-40">
          <Bookmark className="w-3.5 h-3.5" /> {post.savedToSwipe ? 'In Swipe File' : 'Save to Swipe File'}
        </button>
        <button onClick={onDelete} className="px-3 rounded-lg text-xs border border-white/[0.08] text-zinc-500 hover:text-red-400" title="Remove post">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}

// ── Connect-your-computer dialog ─────────────────────────────────────────────

function ConnectDialog({ agent, onClose, onCreated }: {
  agent: rdb.RadarAgentStatus | null; onClose: () => void; onCreated: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function generate() {
    if (agent && !confirm('This replaces the old token. The helper using it will stop working until you update it. Continue?')) return;
    setWorking(true);
    const { token, error } = await rdb.createAgentToken();
    setWorking(false);
    if (error) { toast.error(error); return; }
    setToken(token!); onCreated();
  }

  const cmd = `python agent.py --app ${appUrl} --token ${token ?? '<token>'} --user YOUR_SCRAPING_ACCOUNT`;
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success('Copied'); };
  const step = 'text-[11px] text-zinc-400 leading-relaxed';
  const code = 'block bg-black/40 border border-white/[0.06] rounded-lg px-2.5 py-2 text-[11px] text-zinc-200 font-mono break-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#18181c] border border-white/10 rounded-2xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Laptop className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white flex-1">Connect your computer</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <p className={step}>
          Scraping runs on your computer, logged into your <b>separate scraping account</b>, so it can see age-restricted
          profiles and Instagram doesn&apos;t flag a cloud login. The app tells it what to pull and the results land here.
        </p>

        <ol className="space-y-3 list-decimal pl-4">
          <li className={step}>
            Install once (needs Python), from the repo&apos;s <code>scripts/ig_radar</code> folder:
            <code className={code}>pip install instaloader==4.14.1</code>
          </li>
          <li className={step}>
            Log the scraping account in once. The password stays on your computer:
            <code className={code}>instaloader --login YOUR_SCRAPING_ACCOUNT</code>
          </li>
          <li className={step}>
            Generate a token for this app:{' '}
            <button disabled={working} onClick={generate}
              className="ml-1 px-2 py-0.5 rounded-md bg-violet-500/20 border border-violet-500/30 text-violet-200 hover:bg-violet-500/30 disabled:opacity-40">
              {agent ? 'Generate new token' : 'Generate token'}
            </button>
            {token && <span className="block mt-1 text-amber-300/80">Shown once. Copy the command below now.</span>}
          </li>
          <li className={step}>
            Start the helper and leave it running. It checks for &ldquo;Pull latest&rdquo; every ~2 minutes and auto-pulls weekly:
            <span className="flex items-start gap-1.5">
              <code className={code}>{cmd}</code>
              {token && <button onClick={() => copy(cmd)} className="mt-1 text-zinc-500 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>}
            </span>
          </li>
        </ol>

        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Status: {!agent ? 'not connected' : isOnline(agent) ? 'online' : 'offline'}
          {agent?.last_run_at ? ` · last pull ${new Date(agent.last_run_at).toLocaleString()}` : ''}
          {agent?.last_status ? ` · ${agent.last_status}` : ''}
        </p>
      </div>
    </div>
  );
}
