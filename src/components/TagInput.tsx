import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTags, useCreateTag, Tag } from '@/hooks/useTags';
import { X } from 'lucide-react';

interface TagInputProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

const TAG_COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#3b82f6'];

export function TagInput({ selectedTagIds, onChange }: TagInputProps) {
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = (tags || []).filter(t => selectedTagIds.includes(t.id));
  const suggestions = (tags || []).filter(
    t => !selectedTagIds.includes(t.id) && t.name.toLowerCase().includes(input.toLowerCase())
  );

  const addTag = (tag: Tag) => {
    onChange([...selectedTagIds, tag.id]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!input.trim()) return;
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    try {
      const newTag = await createTag.mutateAsync({ name: input.trim(), color });
      addTag(newTag);
    } catch {
      // Tag might already exist
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (input.trim()) {
        handleCreateTag();
      }
    }
    if (e.key === 'Backspace' && !input && selectedTagIds.length > 0) {
      removeTag(selectedTagIds[selectedTagIds.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background min-h-[38px]">
        {selectedTags.map(tag => (
          <Badge
            key={tag.id}
            variant="outline"
            className="gap-1 text-xs cursor-default"
            style={{ borderColor: tag.color, color: tag.color }}
          >
            {tag.name}
            <button type="button" onClick={() => removeTag(tag.id)} className="hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTagIds.length === 0 ? 'Adicionar tags...' : ''}
          className="border-0 shadow-none focus-visible:ring-0 h-6 min-w-[100px] flex-1 p-0 text-sm"
        />
      </div>

      {showSuggestions && input && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
          {suggestions.map(tag => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); addTag(tag); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            >
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
          {suggestions.length === 0 && input.trim() && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); handleCreateTag(); }}
              className="w-full px-3 py-2 text-sm text-left text-primary hover:bg-accent transition-colors"
            >
              Criar tag "{input.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
