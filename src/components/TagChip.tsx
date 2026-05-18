'use client';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface TagChipProps {
  name: string;
  size?: 'xs' | 'sm';
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  descriptive: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  framework: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  structural: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  audio: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  visual: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  custom: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20',
};

export default function TagChip({ name, size = 'sm', className }: TagChipProps) {
  const { tags } = useStore();
  const tag = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
  const colorClass = tag ? CATEGORY_COLORS[tag.category] : CATEGORY_COLORS.custom;

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
      colorClass,
      className
    )}>
      {name}
    </span>
  );
}
