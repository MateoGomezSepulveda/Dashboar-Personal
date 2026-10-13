import React, { useState } from 'react';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { Tag } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  availableTags: Tag[];
  onAddTag?: (tag: Tag) => void;
  readOnly?: boolean;
  className?: string;
}

const PRESET_COLORS = [
  '#2563EB', // Royal Blue
  '#7C3AED', // Vivid Purple
  '#059669', // Emerald
  '#D97706', // Solar Amber
  '#E11D48', // Rose
  '#0284C7', // Sky Blue
  '#4F46E5', // Indigo
  '#64748B', // Slate
];

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTagIds,
  onChange,
  availableTags,
  onAddTag,
  readOnly = false,
  className,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleToggleTag = (tagId: string) => {
    if (readOnly) return;
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    const newTagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTag: Tag = {
      id: newTagId,
      name: trimmed,
      color: selectedColor,
    };

    if (onAddTag) {
      onAddTag(newTag);
    }
    onChange([...selectedTagIds, newTagId]);
    setNewTagName('');
    setIsCreating(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5" />
          <span>Etiquetas</span>
        </span>
        {!readOnly && onAddTag && !isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Nueva etiqueta</span>
          </button>
        )}
      </div>

      {/* Tag chips list */}
      <div className="flex flex-wrap gap-1.5">
        {availableTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleTag(tag.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                isSelected
                  ? 'border-transparent text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              )}
              style={isSelected ? { backgroundColor: tag.color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isSelected ? '#FFFFFF' : tag.color }}
              />
              <span>{tag.name}</span>
              {isSelected && !readOnly && <Check className="w-3 h-3 stroke-[2.5]" />}
            </button>
          );
        })}

        {availableTags.length === 0 && !isCreating && (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
            Sin etiquetas disponibles
          </span>
        )}
      </div>

      {/* Inline Create Form */}
      {isCreating && !readOnly && (
        <form
          onSubmit={handleCreateTag}
          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 mt-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Crear nueva etiqueta
            </span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nombre de la etiqueta..."
            autoFocus
            maxLength={30}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'w-5 h-5 rounded-full border transition-transform flex items-center justify-center',
                    selectedColor === color
                      ? 'scale-110 ring-2 ring-blue-500/50 border-white dark:border-slate-900'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm"
              >
                Crear
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default TagSelector;
