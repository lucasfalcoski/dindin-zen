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
import { formatBRL } from '@/lib/format';
import { Search, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { data: groups } = useGroups();
  const { data: tags } = useTags();

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');

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

  const { data: tagExpenseIds } = useQuery({
    queryKey: ['tag_filter_expenses', tagFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_tags')
        .select('expense_id')
        .eq('tag_id', tagFilter);
      if (error) throw error;
      return new Set(data.map(d => d.expense_id));
    },
    enabled: !!tagFilter,
  });

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    let filtered = allExpenses;
    switch (viewMode) {
      case 'personal':
        filtered = filtered.filter(e => e.user_id === user?.id);
        break;
      case 'family':
        filtered = filtered.filter((e: any) => e.visibility === 'family');
        break;
      case 'member':
        filtered = filtered.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
        break;
    }
    if (tagFilter && tagExpenseIds) {
      filtered = filtered.filter(e => tagExpenseIds.has(e.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [allExpenses, viewMode, user?.id, selectedMemberId, tagFilter, tagExpenseIds, searchQuery]);

  const handleEdit = (expense: Expense) => {
    if (expense.user_id !== user?.id) return;
    setEditingExpense(expense);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5 w-full min-w-0">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-5 border-b border-border gap-3">
        <div>
          <p className="label-caps mb-1.5 text-muted-foreground">saídas</p>
          <h1 className="page-title">Despesas</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mês' },
            { key: 'custom', label: 'Período' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as Period)}
              className={`pill-tab ${period === p.key ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground bg-transparent cursor-pointer transition-colors hover:bg-muted"
          >
            <Upload size={14} />
            Importar
          </button>
          <button
            onClick={() => { setEditingExpense(null); setFormOpen(true); }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-background border border-foreground cursor-pointer transition-colors hover:bg-foreground/90"
          >
            + Nova despesa
          </button>
        </div>
      </div>

      {/* Período custom */}
      {period === 'custom' && (
        <div className="flex gap-2">
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
        </div>
      )}

      {/* ── STATS 4 cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-destructive flex-shrink-0" />
            <span className="label-caps">Total {period === 'today' ? 'hoje' : period === 'week' ? 'semana' : 'mês'}</span>
          </div>
          <p className="value-display text-destructive">
            {formatBRL(expenses.reduce((s, e) => s + Number(e.amount), 0))}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border font-medium">
            <span className="text-destructive">↑ 12%</span> vs mês anterior
          </p>
        </div>
        {/* Esta semana */}
        <div className="card-surface p-5">
          <div className="label-caps mb-2">Esta semana</div>
          <p className="value-display" style={{ color: '#92580a' }}>
            {formatBRL(expenses.filter(e => e.date >= weekStart && e.date <= weekEnd).reduce((s, e) => s + Number(e.amount), 0))}
          </p>
        </div>
        {/* Hoje */}
        <div className="card-surface p-5">
          <div className="label-caps mb-2">Hoje</div>
          <p className="value-display text-foreground">
            {formatBRL(expenses.filter(e => e.date === todayStr).reduce((s, e) => s + Number(e.amount), 0))}
          </p>
        </div>
        {/* Maior grupo */}
        <div className="card-surface p-5">
          <div className="label-caps mb-2">Maior grupo</div>
          <p className="value-display text-[24px]" style={{ color: '#1d4ed8' }}>
            {groups && expenses.length > 0 ? (() => {
              const byGroup: Record<string, number> = {};
              expenses.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
              const topId = Object.entries(byGroup).sort((a, b) => b[1] - a[1])[0]?.[0];
              const g = groups.find(g => g.id === topId);
              return g ? `${g.icon} ${g.name}` : '—';
            })() : '—'}
          </p>
        </div>
      </div>

      {/* ── BODY: 2 colunas ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-3.5">

        {/* Lista de despesas */}
        <div className="card-surface overflow-hidden">
          {/* Filtros de grupo */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border overflow-x-auto">
            <span className="sec-title mr-1">Todas as despesas</span>
            <button
              onClick={() => setGroupFilter('')}
              className={`pill-tab text-[11px] px-3 py-1 ${!groupFilter ? 'active' : ''}`}
            >
              Todos
            </button>
            {groups?.slice(0, 5).map(g => (
              <button
                key={g.id}
                onClick={() => setGroupFilter(groupFilter === g.id ? '' : g.id)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors"
                style={{
                  borderColor: groupFilter === g.id ? g.color : 'hsl(var(--border))',
                  background: groupFilter === g.id ? g.color + '15' : 'none',
                  color: groupFilter === g.id ? g.color : 'hsl(var(--muted-foreground))',
                  opacity: groupFilter === g.id ? 1 : 0.75,
                }}
              >
                {g.icon}
              </button>
            ))}
          </div>

          {/* Campo de busca */}
          <div className="px-5 py-2.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm border-0 bg-transparent focus-visible:ring-0 shadow-none"
              />
            </div>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-muted" />
                    <div className="h-2 w-20 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : expenses.length > 0 ? (
            <div>
              {expenses.map(e => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  onEdit={e.user_id === user?.id ? handleEdit : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium p-8 text-center text-muted-foreground">
              Nenhuma despesa encontrada.
            </p>
          )}
        </div>

        {/* Por categoria */}
        <div className="card-surface overflow-hidden">
          <div className="sec-head">
            <span className="sec-title">Por categoria</span>
          </div>
          <div className="px-5 py-1">
            {groups && expenses.length > 0 ? (() => {
              const byGroup: Record<string, number> = {};
              expenses.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
              const total = Object.values(byGroup).reduce((a, b) => a + b, 0);
              return groups
                .filter(g => byGroup[g.id])
                .sort((a, b) => (byGroup[b.id] || 0) - (byGroup[a.id] || 0))
                .map(g => (
                  <div key={g.id} className="py-2.5 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {g.icon} {g.name}
                      </span>
                      <span
                        className="currency text-sm"
                        style={{
                          color: total > 0 && (byGroup[g.id] / total) > 0.5
                            ? 'hsl(var(--destructive))'
                            : 'hsl(var(--foreground))',
                        }}
                      >
                        {formatBRL(byGroup[g.id])}
                      </span>
                    </div>
                    <div className="budget-bar-track">
                      <div
                        className="budget-bar-fill"
                        style={{
                          width: total > 0 ? `${(byGroup[g.id] / total) * 100}%` : '0%',
                          background: g.color,
                        }}
                      />
                    </div>
                  </div>
                ));
            })() : (
              <p className="text-sm py-8 text-center text-muted-foreground">
                Nenhuma despesa.
              </p>
            )}
          </div>
        </div>
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
