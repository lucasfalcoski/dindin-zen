import { useState, useMemo } from 'react';
import { format, addDays, addMonths, isBefore, isAfter, isEqual, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { SummaryCard } from '@/components/SummaryCard';
import { AlertTriangle, TrendingDown, Calendar, Wallet } from 'lucide-react';

type Period = 30 | 60 | 90;

interface FutureEvent {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  source: 'recorrente' | 'parcela';
}

export default function Forecast() {
  const { user } = useAuth();
  const [days, setDays] = useState<Period>(30);
  const today = startOfDay(new Date());
  const endDate = addDays(today, days);

  // Fetch recent data to find recurrents and installments
  const pastStart = format(addMonths(today, -3), 'yyyy-MM-dd');
  const futureEnd = format(addDays(today, 90), 'yyyy-MM-dd');

  const { data: allExpenses } = useExpenses({ startDate: pastStart, endDate: futureEnd });
  const { data: allIncomes } = useIncomes({ startDate: pastStart, endDate: futureEnd });
  const { data: accounts } = useAccounts();

  const myExpenses = useMemo(() => (allExpenses || []).filter(e => e.user_id === user?.id), [allExpenses, user]);
  const myIncomes = useMemo(() => (allIncomes || []).filter(i => i.user_id === user?.id), [allIncomes, user]);

  // Current balance from accounts
  const currentBalance = useMemo(() =>
    (accounts || []).reduce((s, a) => s + Number(a.balance), 0),
    [accounts]
  );

  // Build future events
  const futureEvents = useMemo(() => {
    const events: FutureEvent[] = [];
    const todayStr = format(today, 'yyyy-MM-dd');

    // Recurrent expenses: project from latest occurrence
    const recurrentExpenses = myExpenses.filter(e => e.recurrent);
    const seenRecurrent = new Map<string, typeof recurrentExpenses[0]>();
    recurrentExpenses.forEach(e => {
      const key = `${e.description}-${e.amount}`;
      const existing = seenRecurrent.get(key);
      if (!existing || e.date > existing.date) seenRecurrent.set(key, e);
    });

    seenRecurrent.forEach(e => {
      // Project monthly from the last occurrence
      let nextDate = new Date(e.date + 'T12:00:00');
      for (let i = 0; i < 4; i++) {
        nextDate = addMonths(nextDate, 1);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        if (dateStr > todayStr && dateStr <= format(endDate, 'yyyy-MM-dd')) {
          events.push({
            date: dateStr,
            description: e.description,
            amount: Number(e.amount),
            type: 'expense',
            source: 'recorrente',
          });
        }
      }
    });

    // Installments: future ones already in DB
    myExpenses
      .filter(e => e.installment_total && e.date > todayStr && e.date <= format(endDate, 'yyyy-MM-dd'))
      .forEach(e => {
        events.push({
          date: e.date,
          description: `${e.description} (${e.installment_current}/${e.installment_total})`,
          amount: Number(e.amount),
          type: 'expense',
          source: 'parcela',
        });
      });

    // Recurrent incomes
    const recurrentIncomes = myIncomes.filter(i => i.recurrent);
    const seenIncRecurrent = new Map<string, typeof recurrentIncomes[0]>();
    recurrentIncomes.forEach(i => {
      const key = `${i.description}-${i.amount}`;
      const existing = seenIncRecurrent.get(key);
      if (!existing || i.date > existing.date) seenIncRecurrent.set(key, i);
    });

    seenIncRecurrent.forEach(i => {
      let nextDate = new Date(i.date + 'T12:00:00');
      for (let j = 0; j < 4; j++) {
        nextDate = addMonths(nextDate, 1);
        const dateStr = format(nextDate, 'yyyy-MM-dd');
        if (dateStr > todayStr && dateStr <= format(endDate, 'yyyy-MM-dd')) {
          events.push({
            date: dateStr,
            description: i.description,
            amount: Number(i.amount),
            type: 'income',
            source: 'recorrente',
          });
        }
      }
    });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [myExpenses, myIncomes, today, endDate, user]);

  // Build daily chart data
  const { chartData, minBalance, minBalanceDate, endBalance, hasNegative } = useMemo(() => {
    const data: { date: string; label: string; saldo: number; isProjection: boolean }[] = [];
    let balance = currentBalance;
    let min = balance;
    let minDate = format(today, 'dd/MM');
    let negative = false;

    // Build event lookup by date
    const eventsByDate = new Map<string, FutureEvent[]>();
    futureEvents.forEach(e => {
      const list = eventsByDate.get(e.date) || [];
      list.push(e);
      eventsByDate.set(e.date, list);
    });

    for (let i = 0; i <= days; i++) {
      const d = addDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd/MM', { locale: ptBR });

      const dayEvents = eventsByDate.get(dateStr) || [];
      dayEvents.forEach(ev => {
        if (ev.type === 'income') balance += ev.amount;
        else balance -= ev.amount;
      });

      if (balance < min) { min = balance; minDate = label; }
      if (balance < 0) negative = true;

      data.push({ date: dateStr, label, saldo: Math.round(balance * 100) / 100, isProjection: i > 0 });
    }

    return { chartData: data, minBalance: min, minBalanceDate: minDate, endBalance: balance, hasNegative: negative };
  }, [currentBalance, futureEvents, days, today]);

  const periods: { value: Period; label: string }[] = [
    { value: 30, label: '30 dias' },
    { value: 60, label: '60 dias' },
    { value: 90, label: '90 dias' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projeção Financeira</h1>
        <div className="flex gap-1 bg-accent rounded-lg p-0.5">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === p.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert */}
      {hasNegative && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">
            Atenção: seu saldo projetado ficará negativo. Revise seus gastos recorrentes.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Saldo atual"
          value={currentBalance}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          valueClassName={currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        />
        <SummaryCard
          label={`Saldo em ${days} dias`}
          value={endBalance}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          valueClassName={endBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        />
        <SummaryCard
          label="Menor saldo projetado"
          value={minBalance}
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
          valueClassName={minBalance >= 0 ? '' : 'text-destructive'}
        />
        <SummaryCard
          label="Lançamentos previstos"
          value={0}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          formatFn={() => `${futureEvents.length} itens`}
        />
      </div>

      {/* Chart */}
      <div className="card-surface p-5">
        <h2 className="label-caps mb-4">Saldo projetado dia a dia</h2>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(chartData.length / 8))}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Dia ${l}`} />
            {hasNegative && <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeWidth={1.5} />}
            <Area
              type="monotone"
              dataKey="saldo"
              fill="url(#saldoGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline */}
      <div className="card-surface p-5">
        <h2 className="label-caps mb-4">O que está por vir</h2>
        {futureEvents.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {futureEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="text-center min-w-[44px]">
                  <p className="text-xs text-muted-foreground">{ev.date.split('-').slice(1).reverse().join('/')}</p>
                </div>
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${ev.type === 'income' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{ev.description}</p>
                  <p className="text-xs text-muted-foreground">{ev.source === 'recorrente' ? 'Recorrente' : 'Parcela'}</p>
                </div>
                <span className={`currency text-sm ${ev.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {ev.type === 'income' ? '+' : '−'}{formatBRL(ev.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum lançamento recorrente ou parcela encontrada para o período.
          </p>
        )}
      </div>
    </div>
  );
}
