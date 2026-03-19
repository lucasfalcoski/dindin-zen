import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIncomes, Income, INCOME_CATEGORIES, IncomeCategory } from '@/hooks/useIncomes';
import { IncomeRow } from '@/components/IncomeRow';
import { IncomeForm } from '@/components/IncomeForm';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function IncomePage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IncomeCategory | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

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
    return { startDate, endDate, category: categoryFilter || undefined };
  }, [period, customStart, customEnd, categoryFilter]);

  const { data: incomes, isLoading } = useIncomes(filters);

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Receitas</h1>
        <button
          onClick={() => { setEditingIncome(null); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova
        </button>
      </div>

      {/* Period filters */}
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

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !categoryFilter ? 'bg-foreground/10 text-foreground font-medium' : 'bg-accent text-muted-foreground'
          }`}
        >
          Todos
        </button>
        {INCOME_CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              categoryFilter === c.value ? 'ring-2 ring-primary bg-primary/5 font-medium' : 'bg-accent text-muted-foreground'
            }`}
          >
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* List */}
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
        ) : incomes && incomes.length > 0 ? (
          <div className="divide-y divide-border/50">
            {incomes.map(i => (
              <IncomeRow key={i.id} income={i} onEdit={handleEdit} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-8 text-center">Nenhuma receita encontrada.</p>
        )}
      </div>

      <IncomeForm
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditingIncome(null); }}
        editingIncome={editingIncome}
      />
    </div>
  );
}
