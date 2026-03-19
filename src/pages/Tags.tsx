import { useState } from 'react';
import { useTagsWithStats, useDeleteTag, useUpdateTag } from '@/hooks/useTags';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
import { formatBRL } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ArrowLeft, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/hooks/useExpenses';

export default function Tags() {
  const { user } = useAuth();
  const { data: tags, isLoading } = useTagsWithStats();
  const deleteTag = useDeleteTag();
  const updateTag = useUpdateTag();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<Record<string, string>>({});

  // Fetch expenses for selected tag
  const { data: tagExpenses } = useQuery({
    queryKey: ['tag_expenses', selectedTagId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_tags')
        .select('expense_id')
        .eq('tag_id', selectedTagId!);
      if (error) throw error;
      const ids = data.map(d => d.expense_id);
      if (ids.length === 0) return [];
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*, expense_groups(id, name, color, icon)')
        .in('id', ids)
        .order('date', { ascending: false });
      if (expError) throw expError;
      return expenses as Expense[];
    },
    enabled: !!selectedTagId,
  });

  const selectedTag = tags?.find(t => t.id === selectedTagId);

  if (selectedTagId && selectedTag) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTagId(null)} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Badge variant="outline" className="text-sm" style={{ borderColor: selectedTag.color, color: selectedTag.color }}>
            {selectedTag.name}
          </Badge>
          <span className="text-sm text-muted-foreground">{tagExpenses?.length || 0} despesas</span>
        </div>

        <div className="card-surface">
          {tagExpenses && tagExpenses.length > 0 ? (
            <div className="divide-y divide-border/50">
              {tagExpenses.map(e => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-8 text-center">Nenhuma despesa com esta tag.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tags</h1>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tags && tags.length > 0 ? (
        <div className="card-surface divide-y divide-border/50">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors">
              <input
                type="color"
                value={editingColor[tag.id] || tag.color}
                onChange={e => {
                  setEditingColor(prev => ({ ...prev, [tag.id]: e.target.value }));
                  updateTag.mutate({ id: tag.id, color: e.target.value });
                }}
                className="h-6 w-6 rounded cursor-pointer border-0 p-0"
              />
              <button
                onClick={() => setSelectedTagId(tag.id)}
                className="flex-1 text-left"
              >
                <span className="text-sm font-medium text-foreground">{tag.name}</span>
              </button>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{tag.count} despesas</span>
                <span className="font-medium text-foreground">{formatBRL(tag.total)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => deleteTag.mutate(tag.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-surface p-8 text-center">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma tag criada. Adicione tags nas suas despesas para organizar melhor.
          </p>
        </div>
      )}
    </div>
  );
}
