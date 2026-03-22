import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIncomes } from '@/hooks/useIncomes';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { IncomeRow } from '@/components/IncomeRow';
import { IncomeForm } from '@/components/IncomeForm';
import { formatBRL } from '@/lib/format';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

const C = {
  ink: '#16150f', ink2: '#6b6a63', ink3: '#b0aea6',
  rule: '#e4e1da', bg: '#f2f0eb',
  green: '#1a7a45', green_s: '#d4eddd',
  blue: '#1d4ed8', blue_s: '#dce8ff',
  amber: '#92580a', amber_s: '#fdefd4',
};

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'custom', label: 'Período' },
] as const;

const CATEGORIES = ['salario', 'freelance', 'investimento', 'presente', 'outro'];
const CATEGORY_LABELS: Record<string, string> = {
  salario: '💼 Salário', freelance: '💻 Freelance', investimento: '📈 Investimento',
  presente: '🎁 Presente', outro: '📦 Outro',
};

export default function IncomePage() {
  const { user } = useAuth();
  const { viewMode, selectedMemberId } = useView();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const dateRange = useMemo(() => {
    if (period === 'today') return { startDate: today, endDate: today };
    if (period === 'week') return { startDate: weekStart, endDate: weekEnd };
    if (period === 'custom' && customStart && customEnd) return { startDate: customStart, endDate: customEnd };
    return { startDate: monthStart, endDate: monthEnd };
  }, [period, today, weekStart, weekEnd, monthStart, monthEnd, customStart, customEnd]);

  const { data: allIncomes, isLoading } = useIncomes(dateRange);

  const incomes = useMemo(() => {
    if (!allIncomes) return [];
    let filtered = allIncomes;
    if (viewMode === 'personal') filtered = filtered.filter(i => i.user_id === user?.id);
    else if (viewMode === 'member') filtered = filtered.filter((i: any) => i.user_id === selectedMemberId);
    if (categoryFilter) filtered = filtered.filter((i: any) => i.category === categoryFilter);
    return filtered;
  }, [allIncomes, viewMode, user?.id, selectedMemberId, categoryFilter]);

  const stats = useMemo(() => {
    const total = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const recorrentes = incomes.filter((i: any) => i.recurrent).reduce((s, i) => s + Number(i.amount), 0);
    const extras = total - recorrentes;
    const fontes = new Set(incomes.map((i: any) => i.category)).size;
    return { total, recorrentes, extras, fontes };
  }, [incomes]);

  const handleEdit = (income: any) => {
    setEditingIncome(income);
    setFormOpen(true);
  };

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '28px', paddingBottom: '20px', borderBottom: `1px solid ${C.rule}`,
      }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.ink3, marginBottom: '6px' }}>
            entradas
          </p>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '34px', lineHeight: 1, letterSpacing: '-0.5px', color: C.ink,
          }}>
            Receitas
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                border: `1px solid ${period === p.key ? C.ink : '#ccc9c0'}`,
                background: period === p.key ? C.ink : 'none',
                color: period === p.key ? '#fff' : C.ink2,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => { setEditingIncome(null); setFormOpen(true); }}
            style={{
              padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              background: C.ink, color: '#fff', border: `1px solid ${C.ink}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <Plus size={14} /> Nova receita
          </button>
        </div>
      </div>

      {/* Período custom */}
      {period === 'custom' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
        </div>
      )}

      {/* ── STATS 4 cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total mês', value: stats.total, color: C.green, dotColor: C.green },
          { label: 'Recorrentes', value: stats.recorrentes, color: C.blue, dotColor: C.blue },
          { label: 'Extras', value: stats.extras, color: C.amber, dotColor: C.amber },
          { label: 'Fontes', value: stats.fontes, color: C.ink, dotColor: C.ink3, isCount: true },
        ].map(card => (
          <div key={card.label} style={{
            background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px',
            padding: '20px', transition: 'border-color .15s, box-shadow .15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: card.dotColor, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: C.ink3 }}>
                {card.label}
              </span>
            </div>
            <p style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: '28px', letterSpacing: '-0.5px', lineHeight: 1,
              color: card.color,
            }}>
              {card.isCount ? card.value : formatBRL(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── FILTROS CATEGORIA ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        <button
          onClick={() => setCategoryFilter('')}
          style={{
            padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
            fontFamily: "'Cabinet Grotesk', sans-serif",
            border: `1px solid ${!categoryFilter ? C.ink : '#ccc9c0'}`,
            background: !categoryFilter ? C.ink : 'none',
            color: !categoryFilter ? '#fff' : C.ink2, cursor: 'pointer',
          }}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
            style={{
              padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              border: `1px solid ${categoryFilter === cat ? C.ink : '#ccc9c0'}`,
              background: categoryFilter === cat ? C.ink : 'none',
              color: categoryFilter === cat ? '#fff' : C.ink2, cursor: 'pointer',
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* ── LISTA ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.rule}` }}>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.ink2 }}>
            Transações
          </span>
        </div>
        {isLoading ? (
          <div>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: C.rule }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '12px', width: '120px', background: C.rule, borderRadius: '4px', marginBottom: '6px' }} />
                  <div style={{ height: '10px', width: '80px', background: C.rule, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : incomes.length > 0 ? (
          <div>
            {incomes.map((income: any) => (
              <IncomeRow
                key={income.id}
                income={income}
                onEdit={income.user_id === user?.id ? handleEdit : undefined}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: C.ink3, padding: '32px', textAlign: 'center' }}>
            Nenhuma receita encontrada.
          </p>
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
