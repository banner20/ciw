'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tag } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  descriptive: 'text-blue-300',
  framework: 'text-violet-300',
  custom: 'text-zinc-300',
};

interface Props {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  autoFocus?: boolean;
}

export default function TagAutocomplete({ selectedTags, onChange, suggestions = [], autoFocus }: Props) {
  const { tags, addTag } = useStore();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tags.filter(t =>
    t.name.toLowerCase().includes(input.toLowerCase()) &&
    !selectedTags.includes(t.name)
  ).slice(0, 8);

  const aiSuggestions = suggestions.filter(s => !selectedTags.includes(s));

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function addTagToList(name: string) {
    if (!name.trim() || selectedTags.includes(name)) return;
    onChange([...selectedTags, name]);
    const exists = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      addTag({
        id: `t-${Date.now()}`,
        name,
        category: 'custom',
        group: 'Custom',
        color: '#6b7280',
        usageCount: 1,
        createdAt: new Date().toISOString(),
      });
    }
    setInput('');
    setOpen(false);
  }

  function removeTag(name: string) {
    onChange(selectedTags.filter(t => t !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const exact = tags.find(t => t.name.toLowerCase() === input.toLowerCase());
      addTagToList(exact?.name || input.trim());
    } else if (e.key === 'Backspace' && !input && selectedTags.length) {
      onChange(selectedTags.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] p-1.5 rounded-lg border border-white/10 bg-white/[0.03] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selectedTags.length ? '' : 'Add tags…'}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
        />
      </div>

      {open && (filtered.length > 0 || (input.trim() && !tags.find(t => t.name.toLowerCase() === input.toLowerCase())) || aiSuggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-white/10 bg-[#1a1a1f] shadow-xl overflow-hidden">
          {aiSuggestions.length > 0 && !input && (
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                AI Suggestions
              </div>
              {aiSuggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={() => addTagToList(s)}
                  className="w-full text-left px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
                >
                  {s}
                </button>
              ))}
              <div className="border-t border-white/[0.06] my-1" />
            </div>
          )}
          {filtered.map((tag: Tag) => (
            <button
              key={tag.id}
              onMouseDown={() => addTagToList(tag.name)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-white/[0.04] transition-colors"
            >
              <span className={CATEGORY_COLORS[tag.category] || 'text-zinc-300'}>{tag.name}</span>
              <span className="text-[10px] text-zinc-600">{tag.category} · {tag.usageCount}×</span>
            </button>
          ))}
          {input.trim() && !tags.find(t => t.name.toLowerCase() === input.toLowerCase()) && (
            <button
              onMouseDown={() => addTagToList(input.trim())}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/[0.04] border-t border-white/[0.06]"
            >
              <span className="text-zinc-600">Create</span>
              <span className="text-white font-medium">&quot;{input.trim()}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
