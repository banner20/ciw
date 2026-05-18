'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film, X, ArrowRight, Loader2, CheckCircle2, Pencil } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { Video, Platform, Language, FormatType } from '@/types';
import { hasSupabase, getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── option lists ─────────────────────────────────────────────────────────────

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram',  color: 'from-purple-600 to-pink-500' },
  { value: 'tiktok',    label: 'TikTok',     color: 'from-zinc-800 to-zinc-900' },
  { value: 'youtube',   label: 'YouTube',    color: 'from-red-600 to-red-700' },
  { value: 'twitter',   label: 'Twitter / X',color: 'from-sky-500 to-sky-600' },
  { value: 'linkedin',  label: 'LinkedIn',   color: 'from-blue-700 to-blue-800' },
  { value: 'other',     label: 'Other',      color: 'from-zinc-600 to-zinc-700' },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en',    label: 'English' },
  { value: 'hi',    label: 'Hindi' },
  { value: 'es',    label: 'Spanish' },
  { value: 'fr',    label: 'French' },
  { value: 'other', label: 'Other' },
];

const FORMATS: { value: FormatType; label: string }[] = [
  { value: 'reel',  label: 'Reel' },
  { value: 'short', label: 'Short' },
  { value: 'story', label: 'Story' },
  { value: 'long',  label: 'Long-form' },
  { value: 'live',  label: 'Live' },
  { value: 'other', label: 'Other' },
];

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

// ─── types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  editVideo?: Video; // pass this to open in edit mode
}

// ─── component ────────────────────────────────────────────────────────────────

export default function AddVideoModal({ open, onClose, editVideo }: Props) {
  const { addVideo, updateVideo, setActiveVideo, activeProjectId, setUploadProgress } = useStore();
  const isEditing = !!editVideo;

  // step
  const [step, setStep] = useState<'file' | 'details'>(isEditing ? 'details' : 'file');

  // file step
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // details step
  const [title, setTitle] = useState(editVideo?.title ?? '');
  const [platform, setPlatform] = useState<Platform>(editVideo?.platform ?? 'instagram');
  const [language, setLanguage] = useState<Language>(editVideo?.language ?? 'en');
  const [formatType, setFormatType] = useState<FormatType>(editVideo?.formatType ?? 'reel');

  // submit
  const [isUploading, setIsUploading] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(isEditing ? 'details' : 'file');
      setFile(null);
      setDuration(0);
      setTitle(editVideo?.title ?? '');
      setPlatform(editVideo?.platform ?? 'instagram');
      setLanguage(editVideo?.language ?? 'en');
      setFormatType(editVideo?.formatType ?? 'reel');
      setIsUploading(false);
    }
  }, [open, isEditing, editVideo]);

  // ── file handling ────────────────────────────────────────────────────────────

  const pickFile = useCallback((picked: File) => {
    setFile(picked);
    // auto-fill title from filename
    if (!isEditing) setTitle(picked.name.replace(/\.[^.]+$/, ''));
    // read duration
    const url = URL.createObjectURL(picked);
    const el = document.createElement('video');
    el.src = url;
    el.onloadedmetadata = () => {
      setDuration(Math.floor(el.duration));
      URL.revokeObjectURL(url);
    };
  }, [isEditing]);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) pickFile(f);
  }

  // ── save logic ───────────────────────────────────────────────────────────────

  async function save(andAnnotate: boolean) {
    if (isEditing) {
      updateVideo(editVideo!.id, { title, platform, language, formatType });
      onClose();
      return;
    }

    setIsUploading(true);
    const videoId = `vid-${Date.now()}`;
    let fileUrl: string | undefined;
    let objectUrl: string | undefined;

    if (file) {
      if (hasSupabase()) {
        setUploadProgress(0);
        const sb = getSupabase();
        const { data, error } = await sb.storage
          .from('videos')
          .upload(`${videoId}/${file.name}`, file, { cacheControl: '3600', upsert: false });
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 600);
        if (!error && data) {
          fileUrl = sb.storage.from('videos').getPublicUrl(data.path).data.publicUrl;
        }
      } else {
        // No Supabase — local blob URL (works until page refresh)
        objectUrl = URL.createObjectURL(file);
      }
    }

    const newVideo: Video = {
      id: videoId,
      projectId: activeProjectId ?? 'proj-1',
      title: title.trim() || 'Untitled video',
      fileName: file?.name ?? '',
      fileUrl,
      objectUrl,
      duration: duration || 0,
      platform,
      language,
      formatType,
      createdAt: new Date().toISOString(),
      metrics: {
        views: 0, avgWatchTime: 0, retention: 0,
        saves: 0, shares: 0, comments: 0, follows: 0,
      },
    };

    addVideo(newVideo);
    setIsUploading(false);
    onClose();

    if (andAnnotate) {
      setActiveVideo(newVideo.id); // auto-navigates to Timeline
    }
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white p-0 gap-0 max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {isEditing ? 'Edit video details' : 'Add video'}
            </h2>
            {!isEditing && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Upload a file then annotate in the timeline
              </p>
            )}
          </div>

          {/* Step indicator (only for new video) */}
          {!isEditing && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium">
              <span className={cn(step === 'file' ? 'text-violet-400' : 'text-zinc-600')}>
                1 Upload
              </span>
              <span className="text-zinc-700">›</span>
              <span className={cn(step === 'details' ? 'text-violet-400' : 'text-zinc-600')}>
                2 Details
              </span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: file ──────────────────────────────────────────────── */}
          {step === 'file' && (
            <motion.div
              key="file"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="px-6 py-5 flex flex-col gap-4"
            >
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all h-44 select-none',
                  isDragging
                    ? 'border-violet-500 bg-violet-500/[0.06]'
                    : file
                    ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                )}
              >
                {file ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-sm font-medium text-zinc-200 text-center px-4 truncate max-w-full">
                      {file.name}
                    </p>
                    {duration > 0 && (
                      <p className="text-xs text-zinc-500 mt-1">{formatDur(duration)}</p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); setDuration(0); }}
                      className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-zinc-500" />
                    </div>
                    <p className="text-sm text-zinc-300 font-medium">
                      {isDragging ? 'Drop it here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">MP4, MOV, WebM — any video format</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileInput} />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('details')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline-offset-2 hover:underline"
                >
                  Skip — I don&apos;t have the file yet
                </button>
                <Button
                  onClick={() => setStep('details')}
                  disabled={!file && !title}
                  size="sm"
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5 disabled:opacity-40"
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: details ───────────────────────────────────────────── */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="px-6 py-5 flex flex-col gap-4"
            >
              {/* File summary (if file was picked) */}
              {(file || isEditing) && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <Film className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-400 truncate flex-1">
                    {isEditing ? editVideo!.fileName || editVideo!.title : file?.name}
                  </span>
                  {duration > 0 && (
                    <span className="text-[10px] text-zinc-600 shrink-0">{formatDur(duration)}</span>
                  )}
                  {!isEditing && (
                    <button
                      onClick={() => setStep('file')}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-zinc-400">Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. The Secret to a Perfect Old Fashioned"
                  className="h-9 bg-white/[0.04] border-white/10 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-violet-500/40"
                  autoFocus
                />
              </div>

              {/* Platform */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-zinc-400">Platform</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                        platform === p.value
                          ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language + Format side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-zinc-400">Language</Label>
                  <Select value={language} onValueChange={v => setLanguage(v as Language)}>
                    <SelectTrigger className="h-9 bg-white/[0.04] border-white/10 text-sm text-zinc-200 focus:ring-violet-500/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c1c22] border-white/10">
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.value} value={l.value} className="text-zinc-300 focus:bg-white/10 focus:text-white">
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-zinc-400">Format</Label>
                  <Select value={formatType} onValueChange={v => setFormatType(v as FormatType)}>
                    <SelectTrigger className="h-9 bg-white/[0.04] border-white/10 text-sm text-zinc-200 focus:ring-violet-500/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c1c22] border-white/10">
                      {FORMATS.map(f => (
                        <SelectItem key={f.value} value={f.value} className="text-zinc-300 focus:bg-white/10 focus:text-white">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Metrics note */}
              {!isEditing && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                  <span className="text-base leading-none mt-0.5">📊</span>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Metrics (views, retention, saves…) will be fetched automatically from the platform API once connected.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {!isEditing && !file && (
                  <Button
                    onClick={() => save(false)}
                    disabled={!title.trim() || isUploading}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                  >
                    Save to library
                  </Button>
                )}

                <Button
                  onClick={() => save(true)}
                  disabled={!title.trim() || isUploading}
                  size="sm"
                  className="h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5 flex-1 disabled:opacity-40"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading…
                    </>
                  ) : isEditing ? (
                    'Save changes'
                  ) : (
                    <>
                      {file ? 'Upload & Annotate in Timeline' : 'Save & Annotate in Timeline'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
