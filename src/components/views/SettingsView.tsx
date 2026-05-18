'use client';
import { useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Trash2, RefreshCw, Download, Upload, Info, FileText, CheckCircle, AlertTriangle, Film, Tag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  exportAllCSV, exportVideosCSV, exportSegmentsCSV, exportTagsCSV, downloadCSV,
  parseCSV, detectCSVType,
  importVideosFromCSV, importSegmentsFromCSV, importTagsFromCSV,
} from '@/lib/csv';

/* ── import result banner ────────────────────────────────────────────── */
interface ImportResult {
  type: string;
  added: number;
  updated: number;
}

function ResultBanner({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-xs">
      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
      <span className="text-green-300 flex-1">
        <strong>{result.type}</strong>: {result.added} added, {result.updated} updated
      </span>
      <button onClick={onDismiss} className="text-green-600 hover:text-green-300 transition-colors text-[10px]">dismiss</button>
    </div>
  );
}

/* ── csv import dropzone ─────────────────────────────────────────────── */
function CSVImportZone({
  onImport,
}: {
  onImport: (type: string, added: number, updated: number) => void;
}) {
  const { importVideos, importSegments, importTags } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    file: File;
    type: string;
    rows: number;
    error?: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setPreview({ file, type: 'unknown', rows: 0, error: 'File must be a .csv' });
      return;
    }
    const text = await file.text();
    const rows = parseCSV(text);
    const type = detectCSVType(rows);
    if (type === 'unknown') {
      setPreview({ file, type: 'unknown', rows: rows.length, error: "Couldn't detect type. Make sure headers match the exported format." });
    } else {
      setPreview({ file, type, rows: rows.length });
    }
  }

  async function applyImport() {
    if (!preview || preview.error || preview.type === 'unknown') return;
    setImporting(true);
    const text = await preview.file.text();
    const rows = parseCSV(text);
    let result = { added: 0, updated: 0 };
    if (preview.type === 'videos')   result = importVideos(importVideosFromCSV(rows));
    if (preview.type === 'segments') result = importSegments(importSegmentsFromCSV(rows));
    if (preview.type === 'tags')     result = importTags(importTagsFromCSV(rows));
    setImporting(false);
    setPreview(null);
    onImport(preview.type, result.added, result.updated);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  const typeIcon = preview?.type === 'videos' ? Film : preview?.type === 'segments' ? Layers : Tag;
  const TypeIcon = typeIcon;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!preview && (
        <div
          className="border-2 border-dashed border-white/10 hover:border-violet-500/30 rounded-xl p-6 text-center cursor-pointer transition-colors"
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">Drop a CSV file here or click to browse</p>
          <p className="text-[10px] text-zinc-700 mt-1">Videos, Segments, or Tags CSV — auto-detected</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      {/* Preview */}
      {preview && (
        <div className={cn(
          'rounded-xl border p-3 space-y-2',
          preview.error ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/[0.02]'
        )}>
          <div className="flex items-center gap-2">
            {preview.error
              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              : <TypeIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            }
            <span className="text-xs font-medium text-white truncate">{preview.file.name}</span>
            <button onClick={() => setPreview(null)} className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">remove</button>
          </div>
          {preview.error
            ? <p className="text-[11px] text-red-400">{preview.error}</p>
            : (
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span className={cn('px-1.5 py-0.5 rounded font-medium text-[10px]',
                  preview.type === 'videos'   ? 'bg-blue-500/20 text-blue-400'   :
                  preview.type === 'segments' ? 'bg-violet-500/20 text-violet-400' :
                  'bg-amber-500/20 text-amber-400'
                )}>
                  {preview.type}
                </span>
                <span>{preview.rows} rows</span>
                <span className="text-zinc-600">· will merge by ID</span>
              </div>
            )
          }
          {!preview.error && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={applyImport}
                disabled={importing}
                className="flex-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${preview.rows} rows`}
              </button>
              <button onClick={() => setPreview(null)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-xs transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */
export default function SettingsView() {
  const { projects, videos, segments, tags, insights, resetToSeed, markSaved } = useStore();
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  const date = new Date().toISOString().slice(0, 10);

  function exportJSON() {
    const data = { projects, videos, segments, tags, insights };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ciw-export-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    if (window.confirm('Clear all local data? This cannot be undone.')) {
      localStorage.removeItem('ciw-ui-state');
      window.location.reload();
    }
  }

  function addResult(type: string, added: number, updated: number) {
    setImportResults(r => [{ type, added, updated }, ...r].slice(0, 3));
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl space-y-4">
      <h2 className="text-base font-semibold text-white">Settings</h2>

      {/* Data overview */}
      <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4">
        <div className="text-xs font-semibold text-zinc-400 mb-3">Local data</div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Projects',  value: projects.length },
            { label: 'Videos',    value: videos.length },
            { label: 'Segments',  value: segments.length },
            { label: 'Tags',      value: tags.length },
            { label: 'Insights',  value: insights.length },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-white/[0.03]">
              <div className="text-lg font-bold text-white">{value}</div>
              <div className="text-[10px] text-zinc-600">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CSV Export ── */}
      <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-400">CSV Export</div>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Export your data as CSV files — open in Excel, Sheets, or any spreadsheet tool.
          Tags inside segment rows are pipe-separated (e.g. <code className="text-zinc-500">Hook|B-Roll</code>).
        </p>

        {/* Export all */}
        <button
          onClick={() => exportAllCSV(videos, segments, tags)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export all (3 CSV files)
        </button>

        {/* Per-type */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: 'Videos',
              icon: Film,
              count: videos.length,
              color: 'text-blue-400',
              onClick: () => downloadCSV(`ciw-videos-${date}.csv`, exportVideosCSV(videos)),
            },
            {
              label: 'Segments',
              icon: Layers,
              count: segments.length,
              color: 'text-violet-400',
              onClick: () => downloadCSV(`ciw-segments-${date}.csv`, exportSegmentsCSV(segments, videos)),
            },
            {
              label: 'Tags',
              icon: Tag,
              count: tags.length,
              color: 'text-amber-400',
              onClick: () => downloadCSV(`ciw-tags-${date}.csv`, exportTagsCSV(tags)),
            },
          ].map(({ label, icon: Icon, count, color, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/10 transition-all group"
            >
              <Icon className={cn('w-4 h-4 transition-colors', color)} />
              <span className="text-[11px] font-medium text-zinc-300">{label}</span>
              <span className="text-[10px] text-zinc-600">{count} rows</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CSV Import ── */}
      <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-400">CSV Import</div>
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-300/80 leading-relaxed">
            Merges by <strong>ID</strong> — existing rows with the same ID are updated, new IDs are added.
            File type is auto-detected from headers.
          </p>
        </div>

        {/* Import results */}
        {importResults.map((r, i) => (
          <ResultBanner key={i} result={r} onDismiss={() => setImportResults(rs => rs.filter((_, j) => j !== i))} />
        ))}

        <CSVImportZone onImport={addResult} />

        {/* Column reference */}
        <details className="group">
          <summary className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors select-none">
            <FileText className="w-3 h-3" />
            Column reference
          </summary>
          <div className="mt-2 space-y-2">
            {[
              {
                name: 'videos.csv',
                cols: 'id · title · platform · language · formatType · duration · createdAt · views · avgWatchTime · retention · saves · shares · comments · follows · script',
              },
              {
                name: 'segments.csv',
                cols: 'id · videoId · videoTitle · start · end · label · notes · layerType · tags (pipe-sep) · color',
              },
              {
                name: 'tags.csv',
                cols: 'id · name · category · group · color · usageCount · definition',
              },
            ].map(({ name, cols }) => (
              <div key={name} className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                <div className="text-[10px] font-mono text-violet-400 mb-1">{name}</div>
                <div className="text-[10px] text-zinc-600 leading-relaxed">{cols}</div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* ── Persistence / JSON ── */}
      <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-400">Full backup</div>
        <div className="flex items-start gap-2 text-[11px] text-zinc-500">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
          All data lives in your browser's localStorage. JSON export is a complete snapshot including metrics history and retention curves.
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-white/10 text-zinc-300" onClick={exportJSON}>
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-white/10 text-zinc-300"
            onClick={() => { resetToSeed(); markSaved(); }}>
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to sample data
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={clearAll}>
            <Trash2 className="w-3.5 h-3.5" />
            Clear all data
          </Button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl border border-white/[0.07] bg-[#15151a] p-4">
        <div className="text-xs font-semibold text-zinc-400 mb-2">About</div>
        <div className="text-xs text-zinc-500 leading-relaxed">
          <strong className="text-zinc-300">Creative Intelligence Workspace</strong> — local-first tool for analyzing short-form video content through structured tagging and pattern recognition.
          <br /><br />
          Built with Next.js · TypeScript · Tailwind CSS · Framer Motion · Zustand
        </div>
      </div>
    </div>
  );
}
