'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Sparkles, ImageIcon, Check, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractRetentionCurve, extractRetentionCurveFromRegion } from '@/lib/extractRetentionCurve';

interface Props {
  duration: number;
  videoId: string;
  existingCurve?: number[];
  onApply: (curve: number[], method: 'ai' | 'canvas') => void;
  onClose: () => void;
}

type Stage = 'upload' | 'analysing' | 'result' | 'overlay';

const CANVAS_W = 400;
const CANVAS_H = 140;

/* ── mini curve preview SVG ────────────────────────────────────────── */
function CurvePreview({ curve, color = '#8b5cf6', h = 80 }: { curve: number[]; color?: string; h?: number }) {
  if (!curve.length) return null;
  const W = CANVAS_W;
  const pts = curve.map((v, i) => {
    const x = (i / (curve.length - 1)) * W;
    const y = h - (v / 100) * h;
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(' L')}`;
  const areaD = `M0,${h} L${pts.join(' L')} L${W},${h} Z`;

  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} className="w-full">
      <defs>
        <linearGradient id="rcg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#rcg)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* 50% line */}
      <line x1="0" y1={h / 2} x2={W} y2={h / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}

/* ── overlay adjust canvas (fallback mode) ─────────────────────────── */
function OverlayAdjust({
  file,
  onExtract,
}: {
  file: File;
  onExtract: (curve: number[]) => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);

  // Graph region handles (as % of image dimensions)
  const [region, setRegion] = useState({ x0: 0.1, y0: 0.25, x1: 0.9, y1: 0.8 });
  const [dragging, setDragging] = useState<'tl' | 'br' | 'box' | null>(null);
  const dragStart  = useRef({ mx: 0, my: 0, rx0: 0, ry0: 0, rx1: 0, ry1: 0 });
  const [extracting, setExtracting] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw image scaled to canvas
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (CANVAS_W - dw) / 2;
    const dy = (CANVAS_H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    // Draw selection overlay
    const x0 = dx + region.x0 * dw;
    const y0 = dy + region.y0 * dh;
    const x1 = dx + region.x1 * dw;
    const y1 = dy + region.y1 * dh;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, y0);
    ctx.fillRect(0, y1, CANVAS_W, CANVAS_H - y1);
    ctx.fillRect(0, y0, x0, y1 - y0);
    ctx.fillRect(x1, y0, CANVAS_W - x1, y1 - y0);

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

    // Corner handles
    const H = 6;
    ctx.fillStyle = '#8b5cf6';
    [[x0, y0], [x1, y1]].forEach(([hx, hy]) => ctx.fillRect(hx - H, hy - H, H * 2, H * 2));
  }, [region]);

  useEffect(() => { draw(); }, [draw, region]);

  function canvasPos(e: React.MouseEvent): { rx: number; ry: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const img = imgRef.current!;
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (CANVAS_W - dw) / 2;
    const dy = (CANVAS_H - dh) / 2;
    const cx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const cy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    return { rx: (cx - dx) / dw, ry: (cy - dy) / dh };
  }

  function onMouseDown(e: React.MouseEvent) {
    const { rx, ry } = canvasPos(e);
    const THRESH = 0.04;
    dragStart.current = { mx: e.clientX, my: e.clientY, rx0: region.x0, ry0: region.y0, rx1: region.x1, ry1: region.y1 };
    if (Math.abs(rx - region.x0) < THRESH && Math.abs(ry - region.y0) < THRESH) setDragging('tl');
    else if (Math.abs(rx - region.x1) < THRESH && Math.abs(ry - region.y1) < THRESH) setDragging('br');
    else if (rx > region.x0 && rx < region.x1 && ry > region.y0 && ry < region.y1) setDragging('box');
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !imgRef.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const img = imgRef.current;
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const ddx = (e.clientX - dragStart.current.mx) / (rect.width * dw / CANVAS_W);
    const ddy = (e.clientY - dragStart.current.my) / (rect.height * dh / CANVAS_H);
    const { rx0, ry0, rx1, ry1 } = dragStart.current;

    if (dragging === 'tl') {
      setRegion(r => ({ ...r, x0: Math.max(0, Math.min(rx0 + ddx, r.x1 - 0.1)), y0: Math.max(0, Math.min(ry0 + ddy, r.y1 - 0.1)) }));
    } else if (dragging === 'br') {
      setRegion(r => ({ ...r, x1: Math.min(1, Math.max(rx1 + ddx, r.x0 + 0.1)), y1: Math.min(1, Math.max(ry1 + ddy, r.y0 + 0.1)) }));
    } else if (dragging === 'box') {
      const w = rx1 - rx0, h = ry1 - ry0;
      const nx0 = Math.max(0, Math.min(1 - w, rx0 + ddx));
      const ny0 = Math.max(0, Math.min(1 - h, ry0 + ddy));
      setRegion({ x0: nx0, y0: ny0, x1: nx0 + w, y1: ny0 + h });
    }
  }

  async function doExtract() {
    if (!imgRef.current) return;
    setExtracting(true);
    const img = imgRef.current;
    const pixelRegion = {
      x0: Math.round(region.x0 * img.width),
      y0: Math.round(region.y0 * img.height),
      x1: Math.round(region.x1 * img.width),
      y1: Math.round(region.y1 * img.height),
    };
    const curve = await extractRetentionCurveFromRegion(file, pixelRegion);
    setExtracting(false);
    onExtract(curve);
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Drag the <span className="text-violet-400">purple box</span> to frame just the graph area (exclude labels and title). Then click Extract.
      </p>
      <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full cursor-crosshair select-none"
          style={{ height: CANVAS_H }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        />
      </div>
      <button
        onClick={doExtract}
        disabled={extracting}
        className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {extracting ? <><RefreshCw className="w-3 h-3 animate-spin" /> Extracting…</> : <><ImageIcon className="w-3 h-3" /> Extract from selected region</>}
      </button>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────── */
export default function RetentionImporter({ duration, onApply, onClose, existingCurve }: Props) {
  const [stage, setStage]           = useState<Stage>('upload');
  const [file, setFile]             = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [curve, setCurve]           = useState<number[] | null>(existingCurve ?? null);
  const [method, setMethod]         = useState<'ai' | 'canvas'>('ai');
  const [error, setError]           = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function pickFile(f: File) {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
    setStage('upload'); // reset to show preview + analyse button
  }

  async function analyse() {
    if (!file) return;
    setStage('analysing');
    setError(null);

    // ── Primary: AI via API ───────────────────────────────────────────
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/analyze-retention', { method: 'POST', body: fd });

      if (res.ok) {
        const json = await res.json();
        if (json.curve?.length > 0) {
          setCurve(json.curve);
          setMethod('ai');
          setConfidence(json.confidence ?? null);
          setStage('result');
          return;
        }
      }
      // If API returns 503 (no key) fall through to canvas
    } catch {
      // network error → fall through
    }

    // ── Fallback: canvas pixel extraction ────────────────────────────
    try {
      const result = await extractRetentionCurve(file);
      setCurve(result.curve);
      setMethod('canvas');
      setConfidence(null);
      setStage('result');
    } catch (e) {
      setError(`Extraction failed: ${String(e)}`);
      setStage('overlay'); // last resort: manual overlay mode
    }
  }

  function applyAndClose() {
    if (!curve) return;
    onApply(curve, method);
    onClose();
  }

  /* drag-and-drop */
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) pickFile(f);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[480px] rounded-2xl border border-white/10 bg-[#18181c] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Import Retention Curve</span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="flex items-start gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-violet-300/80 leading-relaxed">
              Screenshot the <strong>Audience Retention</strong> graph from Instagram's Reel insights (creator.instagram.com or the app). Upload it here — we'll extract the curve automatically.
            </p>
          </div>

          {/* Upload zone */}
          <div
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-colors cursor-pointer',
              previewUrl ? 'border-white/10' : 'border-white/10 hover:border-violet-500/40',
            )}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="screenshot" className="w-full max-h-48 object-contain rounded-xl bg-black" />
                <button
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-zinc-400 hover:text-white"
                  onClick={e => { e.stopPropagation(); setFile(null); setPreviewUrl(null); setCurve(null); setStage('upload'); }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
                <Upload className="w-8 h-8" />
                <span className="text-xs text-zinc-500">Drop screenshot here or click to browse</span>
                <span className="text-[10px] text-zinc-700">PNG, JPG accepted</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-amber-400 text-[11px] bg-amber-400/10 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Stage: analysing */}
          <AnimatePresence mode="wait">
            {stage === 'analysing' && (
              <motion.div key="analysing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3">
                <RefreshCw className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white">Analysing screenshot…</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Trying AI first, then pixel extraction</div>
                </div>
              </motion.div>
            )}

            {/* Stage: result */}
            {stage === 'result' && curve && (
              <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-white">Curve extracted</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', method === 'ai' ? 'bg-violet-500/20 text-violet-400' : 'bg-blue-500/20 text-blue-400')}>
                      {method === 'ai' ? '✦ AI' : 'pixel'}
                    </span>
                    {confidence !== null && (
                      <span className="text-[10px] text-zinc-500">{Math.round(confidence * 100)}% confidence</span>
                    )}
                  </div>
                  <button onClick={() => setStage('overlay')} className="text-[10px] text-zinc-500 hover:text-zinc-300 underline transition-colors">
                    adjust manually
                  </button>
                </div>

                {/* Curve preview */}
                <div className="rounded-xl bg-black/30 border border-white/[0.06] overflow-hidden p-3">
                  <CurvePreview curve={curve} />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-zinc-700">0s</span>
                    <span className="text-[9px] text-zinc-700">100%</span>
                    <span className="text-[9px] text-zinc-700">{duration}s</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Start', val: `${Math.round(curve[0])}%` },
                    { label: 'Mid', val: `${Math.round(curve[Math.floor(curve.length / 2)])}%` },
                    { label: 'End', val: `${Math.round(curve[curve.length - 1])}%` },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-white/[0.03] rounded-lg p-2 text-center">
                      <div className="text-xs font-semibold text-white">{val}</div>
                      <div className="text-[10px] text-zinc-600">{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Stage: manual overlay */}
            {stage === 'overlay' && file && (
              <motion.div key="overlay" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Manual region select</div>
                <OverlayAdjust
                  file={file}
                  onExtract={c => { setCurve(c); setMethod('canvas'); setStage('result'); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {file && stage === 'upload' && (
              <button
                onClick={analyse}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Analyse Screenshot
              </button>
            )}
            {stage === 'result' && curve && (
              <button
                onClick={applyAndClose}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply to Timeline
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
