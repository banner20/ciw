'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Pencil, Trash2, Check, X, Tag as TagIcon, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Tag, TagCategory } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORY_STYLES: Record<TagCategory, { bg: string; text: string; border: string; label: string }> = {
  descriptive: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20', label: 'Descriptive' },
  framework: { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20', label: 'Framework' },
  structural: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20', label: 'Structural' },
  audio: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20', label: 'Audio' },
  visual: { bg: 'bg-pink-500/10', text: 'text-pink-300', border: 'border-pink-500/20', label: 'Visual' },
  custom: { bg: 'bg-zinc-500/10', text: 'text-zinc-300', border: 'border-zinc-500/20', label: 'Custom' },
};

const DEFINITIONS: Record<string, string> = {
  'Curiosity Loop': 'Opens a question the viewer must resolve by watching to the end',
  'Binary Choice': 'Forces the viewer to pick a side, increasing engagement',
  'Pattern Interrupt': 'Breaks the expected flow to re-capture attention',
  'Big Promise': 'Leads with a bold outcome or transformation',
  'Identity Loop': 'Calls out a specific identity the target audience holds',
  'Emotion Spike': 'Creates a sharp emotional peak',
  'Deliberate Delay': 'Intentionally slows reveal to build tension',
  'Mid Video Superhook': 'Second attention grab placed at 40-60% through the video',
  'Specificity Anchor': 'Precise numbers/details that make claims more believable',
  'Contrarian Opinion': 'Challenges the common belief held by the audience',
  'Visual Hook': 'Stops scroll purely through visual stimulus',
  'Realistic Timeline': 'Sets achievable expectations to build trust',
  'Hook': 'The opening moment designed to stop the scroll',
  'Talking Head': 'Direct-to-camera speaking segment',
  'B-Roll': 'Supplementary footage over voiceover',
  'CTA': 'Call to action — follow, save, share',
};

function TagCard({ tag, onEdit, onDelete }: { tag: Tag; onEdit: (t: Tag) => void; onDelete: (id: string) => void }) {
  const styles = CATEGORY_STYLES[tag.category] || CATEGORY_STYLES.custom;
  const def = DEFINITIONS[tag.name] || tag.definition;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('group rounded-xl border p-3 flex flex-col gap-2 transition-colors hover:border-white/[0.14]', styles.bg, styles.border)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={cn('text-sm font-semibold', styles.text)}>{tag.name}</span>
          <div className={cn('text-[10px] px-1.5 py-0.5 rounded-full w-fit mt-1', styles.bg, styles.text)}>
            {tag.group}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(tag)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(tag.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {def && <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">{def}</p>}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
          <TrendingUp className="w-3 h-3" />
          <span>{tag.usageCount}× used</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function TagsView() {
  const { tags, addTag, updateTag, deleteTag } = useStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<TagCategory | 'all'>('all');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<TagCategory>('custom');
  const [newGroup, setNewGroup] = useState('');

  const filtered = useMemo(() => {
    return tags.filter(t => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.group.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === 'all' || t.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [tags, search, activeCategory]);

  const grouped = useMemo(() => {
    const g: Record<string, Tag[]> = {};
    for (const tag of filtered) {
      if (!g[tag.category]) g[tag.category] = [];
      g[tag.category].push(tag);
    }
    return g;
  }, [filtered]);

  const topByUsage = [...tags].sort((a, b) => b.usageCount - a.usageCount).slice(0, 8);

  function handleEdit(tag: Tag) {
    setEditingTag(tag);
    setEditName(tag.name);
  }

  function saveEdit() {
    if (!editingTag || !editName.trim()) return;
    updateTag(editingTag.id, { name: editName.trim() });
    setEditingTag(null);
  }

  function createTag() {
    if (!newName.trim()) return;
    addTag({
      id: `t-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      group: newGroup || newCategory,
      color: '#6b7280',
      usageCount: 0,
      createdAt: new Date().toISOString(),
    });
    setNewName('');
    setNewGroup('');
    setShowCreate(false);
  }

  const categories: (TagCategory | 'all')[] = ['all', 'descriptive', 'framework', 'structural', 'audio', 'visual', 'custom'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#111114] shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tags…"
            className="w-full h-7 pl-8 pr-3 rounded bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
          />
        </div>

        <div className="flex gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize',
                activeCategory === cat
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <span className="text-xs text-zinc-600">{filtered.length} tags</span>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New tag
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Most used */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Most used
          </div>
          <div className="flex flex-wrap gap-2">
            {topByUsage.map(tag => {
              const styles = CATEGORY_STYLES[tag.category] || CATEGORY_STYLES.custom;
              return (
                <div key={tag.id} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium', styles.bg, styles.border, styles.text)}>
                  {tag.name}
                  <span className="text-[10px] opacity-60">{tag.usageCount}×</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4"
          >
            <div className="text-xs font-semibold text-zinc-300 mb-3">Create new tag</div>
            <div className="flex flex-wrap gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Tag name"
                className="flex-1 min-w-[150px] px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
                onKeyDown={e => e.key === 'Enter' && createTag()}
                autoFocus
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as TagCategory)}
                className="px-2 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs text-zinc-300"
              >
                {(['descriptive', 'framework', 'structural', 'audio', 'visual', 'custom'] as TagCategory[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
                placeholder="Group (optional)"
                className="px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
              <button onClick={createTag} className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-colors flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="text-zinc-600 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Edit modal */}
        {editingTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingTag(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-white/10 bg-[#1c1c22] p-5 w-72 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-sm font-semibold text-white mb-3">Rename tag</div>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-2.5 py-2 rounded bg-white/[0.04] border border-white/10 text-sm text-zinc-200 outline-none focus:border-violet-500/50 mb-3"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium">Save</button>
                <button onClick={() => setEditingTag(null)} className="flex-1 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-400">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Grouped tags */}
        {Object.entries(grouped).map(([category, catTags]) => {
          const styles = CATEGORY_STYLES[category as TagCategory] || CATEGORY_STYLES.custom;
          return (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', styles.text)}>{styles.label}</span>
                <div className={cn('h-px flex-1', styles.bg)} />
                <span className="text-[10px] text-zinc-600">{catTags.length} tags</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {catTags
                  .sort((a, b) => b.usageCount - a.usageCount)
                  .map(tag => (
                    <TagCard
                      key={tag.id}
                      tag={tag}
                      onEdit={handleEdit}
                      onDelete={(id) => {
                        if (window.confirm(`Delete tag "${tag.name}"?`)) {
                          deleteTag(id);
                        }
                      }}
                    />
                  ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <TagIcon className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No tags found</p>
          </div>
        )}
      </div>
    </div>
  );
}
