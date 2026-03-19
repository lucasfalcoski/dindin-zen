import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { useGroups } from '@/hooks/useGroups';
import { useTags } from '@/hooks/useTags';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ImportExpensesModal } from '@/components/ImportExpensesModal';
import { Plus, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function Expenses() {
  const { user } = useAuth();
  const { viewMode, selectedMemberId } = useView();
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { data: groups } = useGroups();
  const { data: tags } = useTags();

  const now = new Date();
  const filters = useMemo(() => {
    let startDate = '', endDate = '';
    switch (period) {
      case 'today':
        startDate = endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'custom':
        startDate = customStart;
        endDate = customEnd;
        break;
    }
    return { startDate, endDate, groupId: groupFilter || undefined };
  }, [period, customStart, customEnd, groupFilter]);

  const { data: allExpenses, isLoading } = useExpenses(filters);

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    switch (viewMode) {
      case 'personal':
        return allExpenses.filter(e => e.user_id === user?.id);
      case 'family':
        return allExpenses.filter((e: any) => e.visibility === 'family');
      case 'member':
        return allExpenses.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
      default:
        return allExpenses;
    }
  }, [allExpenses, viewMode, user?.id, selectedMemberId]);

  const handleEdit = (expense: Expense) => {
    if (expense.user_id !== user?.id) return; // Can only edit own
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const periods: { value: Period; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: 'custom', label: 'Período' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Despesas</h1>
        {viewMode === 'personal' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <button
              onClick={() => { setEditingExpense(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
              period === p.value ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex gap-2">
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setGroupFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !groupFilter ? 'bg-foreground/10 text-foreground font-medium' : 'bg-accent text-muted-foreground'
          }`}
        >
          Todos
        </button>
        {groups?.map(g => (
          <button
            key={g.id}
            onClick={() => setGroupFilter(g.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              groupFilter === g.id ? 'ring-2 ring-primary bg-primary/5 font-medium' : 'bg-accent text-muted-foreground'
            }`}
          >
            <span>{g.icon}</span> {g.name}
          </button>
        ))}
      </div>

      <div className="card-surface">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2 w-20 bg-muted rounded" />
                </div>
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : expenses.length > 0 ? (
          <div className="divide-y divide-border/50">
            {expenses.map(e => (
              <ExpenseRow key={e.id} expense={e} onEdit={e.user_id === user?.id ? handleEdit : undefined} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-8 text-center">Nenhuma despesa encontrada.</p>
        )}
      </div>

      <ExpenseForm
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditingExpense(null); }}
        editingExpense={editingExpense}
      />

      <ImportExpensesModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
