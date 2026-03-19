import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useTags } from '@/hooks/useTags';
import { formatBRL } from '@/lib/format';
import { Search, Receipt, DollarSign, FolderOpen, Tag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  const { data: expenses } = useExpenses();
  const { data: incomes } = useIncomes();
  const { data: groups } = useGroups();
  const { data: tags } = useTags();

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return { expenses: [], incomes: [], groups: [], tags: [] };

    const numericQ = parseFloat(q.replace(',', '.'));
    const isNumeric = !isNaN(numericQ);

    const matchedExpenses = (expenses || []).filter(e =>
      e.description.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q)) ||
      (isNumeric && Math.abs(e.amount - numericQ) < 0.01) ||
      e.expense_groups?.name.toLowerCase().includes(q)
    ).slice(0, 10);

    const matchedIncomes = (incomes || []).filter(i =>
      i.description.toLowerCase().includes(q) ||
      (i.notes && i.notes.toLowerCase().includes(q)) ||
      (isNumeric && Math.abs(i.amount - numericQ) < 0.01)
    ).slice(0, 10);

    const matchedGroups = (groups || []).filter(g =>
      g.name.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedTags = (tags || []).filter(t =>
      t.name.toLowerCase().includes(q)
    ).slice(0, 5);

    return { expenses: matchedExpenses, incomes: matchedIncomes, groups: matchedGroups, tags: matchedTags };
  }, [debouncedQuery, expenses, incomes, groups, tags]);

  const hasResults = results.expenses.length + results.incomes.length + results.groups.length + results.tags.length > 0;

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar despesas, receitas, grupos, tags..."
            className="border-0 shadow-none focus-visible:ring-0 h-12 px-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {debouncedQuery && !hasResults && (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhum resultado encontrado</p>
          )}

          {results.expenses.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Despesas</p>
              {results.expenses.map(e => (
                <button
                  key={e.id}
                  onClick={() => goTo('/expenses')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
                >
                  <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{e.description}</p>
                    <p className="text-[11px] text-muted-foreground">{e.date} · {e.expense_groups?.name}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatBRL(e.amount)}</span>
                </button>
              ))}
            </div>
          )}

          {results.incomes.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Receitas</p>
              {results.incomes.map(i => (
                <button
                  key={i.id}
                  onClick={() => goTo('/income')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
                >
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{i.description}</p>
                    <p className="text-[11px] text-muted-foreground">{i.date}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatBRL(i.amount)}</span>
                </button>
              ))}
            </div>
          )}

          {results.groups.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Grupos</p>
              {results.groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => goTo('/groups')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">{g.icon} {g.name}</span>
                </button>
              ))}
            </div>
          )}

          {results.tags.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
              {results.tags.map(t => (
                <button
                  key={t.id}
                  onClick={() => goTo(`/tags`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors"
                >
                  <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Badge variant="outline" style={{ borderColor: t.color, color: t.color }}>{t.name}</Badge>
                </button>
              ))}
            </div>
          )}

          {!debouncedQuery && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <p>Digite para buscar em despesas, receitas, grupos e tags</p>
              <p className="text-xs mt-1">Use <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Cmd+K</kbd> para abrir rapidamente</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
