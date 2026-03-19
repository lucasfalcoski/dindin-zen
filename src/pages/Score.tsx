import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getScoreColor(score: number) {
  if (score >= 70) return 'hsl(142, 71%, 45%)';
  if (score >= 40) return 'hsl(45, 93%, 47%)';
  return 'hsl(0, 84%, 60%)';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Precisa melhorar';
}

interface ScoreComponent {
  label: string;
  score: number;
  maxScore: number;
  tip: string;
  emoji: string;
}

export default function Score() {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd');

  // Fetch current + past 6 months of data
  const sixMonthsAgo = format(subMonths(startOfMonth(now), 6), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: allExpenses } = useExpenses({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: allIncomes } = useIncomes({ startDate: sixMonthsAgo, endDate: monthEnd });
  const { data: groups } = useGroups();
  const { data: budgets } = useBudgets(currentMonth);

  const myExpenses = useMemo(() => (allExpenses || []).filter(e => e.user_id === user?.id), [allExpenses, user]);
  const myIncomes = useMemo(() => (allIncomes || []).filter(i => i.user_id === user?.id), [allIncomes, user]);

  // Calculate score components
  const { totalScore, components, monthlyScores } = useMemo(() => {
    const comps: ScoreComponent[] = [];

    // Current month data
    const monthPrefix = format(now, 'yyyy-MM');
    const monthExp = myExpenses.filter(e => e.date.startsWith(monthPrefix));
    const monthInc = myIncomes.filter(i => i.date.startsWith(monthPrefix));
    const totalExp = monthExp.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc = monthInc.reduce((s, i) => s + Number(i.amount), 0);

    // 1. Savings rate (30 pts)
    let savingsScore = 0;
    if (totalInc > 0) {
      const rate = (totalInc - totalExp) / totalInc;
      savingsScore = Math.max(0, Math.min(30, Math.round(rate * 100)));
    }
    comps.push({
      label: 'Taxa de poupança',
      score: savingsScore,
      maxScore: 30,
      tip: totalInc > 0
        ? `Você poupou ${((totalInc - totalExp) / totalInc * 100).toFixed(0)}% da renda. Meta: 20%+`
        : 'Registre suas receitas para calcular',
      emoji: '💰',
    });

    // 2. Budget control (30 pts)
    let budgetScore = 0;
    if (budgets && budgets.length > 0 && groups) {
      let withinCount = 0;
      budgets.forEach(b => {
        const spent = monthExp.filter(e => e.group_id === b.group_id).reduce((s, e) => s + Number(e.amount), 0);
        if (spent <= b.amount) withinCount++;
      });
      budgetScore = Math.round((withinCount / budgets.length) * 30);
    }
    comps.push({
      label: 'Controle de orçamento',
      score: budgetScore,
      maxScore: 30,
      tip: budgets && budgets.length > 0
        ? `${budgetScore === 30 ? 'Todos' : 'Alguns'} grupos dentro do limite`
        : 'Configure orçamentos em /budget para pontuar',
      emoji: '📊',
    });

    // 3. Consistency (20 pts) - consecutive months with positive balance
    let consecutive = 0;
    for (let i = 0; i < 6; i++) {
      const m = format(subMonths(startOfMonth(now), i), 'yyyy-MM');
      const mExp = myExpenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + Number(e.amount), 0);
      const mInc = myIncomes.filter(inc => inc.date.startsWith(m)).reduce((s, inc) => s + Number(inc.amount), 0);
      if (mInc > mExp) consecutive++;
      else break;
    }
    const consistencyScore = Math.min(20, Math.round((consecutive / 6) * 20));
    comps.push({
      label: 'Consistência',
      score: consistencyScore,
      maxScore: 20,
      tip: `${consecutive} meses seguidos com saldo positivo`,
      emoji: '📈',
    });

    // 4. Income diversification (10 pts)
    const categories = new Set(monthInc.map(i => i.category));
    const diversScore = Math.min(10, categories.size * 3);
    comps.push({
      label: 'Diversificação de receitas',
      score: diversScore,
      maxScore: 10,
      tip: `${categories.size} fonte(s) de renda. Diversifique para pontuar mais`,
      emoji: '🌐',
    });

    // 5. Impulse spending (10 pts)
    const leisureGroups = (groups || []).filter(g =>
      ['lazer', 'entretenimento', 'compras'].some(k => g.name.toLowerCase().includes(k))
    );
    const leisureIds = new Set(leisureGroups.map(g => g.id));
    const avgMonthly = totalInc > 0 ? totalInc * 0.15 : totalExp * 0.15;
    const bigLeisure = monthExp.filter(e => leisureIds.has(e.group_id) && Number(e.amount) > avgMonthly);
    const impulseScore = Math.max(0, 10 - bigLeisure.length * 3);
    comps.push({
      label: 'Controle de impulsos',
      score: impulseScore,
      maxScore: 10,
      tip: bigLeisure.length === 0
        ? 'Sem gastos impulsivos altos em lazer'
        : `${bigLeisure.length} gasto(s) alto(s) em lazer detectados`,
      emoji: '🛡️',
    });

    const total = comps.reduce((s, c) => s + c.score, 0);

    // Monthly history
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(startOfMonth(now), i);
      const prefix = format(m, 'yyyy-MM');
      const mExp = myExpenses.filter(e => e.date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount), 0);
      const mInc = myIncomes.filter(inc => inc.date.startsWith(prefix)).reduce((s, inc) => s + Number(inc.amount), 0);
      let mScore = 0;
      if (mInc > 0) mScore += Math.max(0, Math.min(30, Math.round(((mInc - mExp) / mInc) * 100)));
      mScore += budgetScore; // Approximate
      mScore += consistencyScore;
      mScore += diversScore;
      mScore += impulseScore;
      history.push({ month: MONTHS_PT[m.getMonth()], score: Math.min(100, mScore) });
    }

    return { totalScore: total, components: comps, monthlyScores: history };
  }, [myExpenses, myIncomes, groups, budgets, user]);

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (totalScore / 100) * circumference;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Score Financeiro</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Score ring */}
        <div className="card-surface p-8 flex flex-col items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={getScoreColor(totalScore)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground">{totalScore}</span>
              <span className="text-xs text-muted-foreground">de 100</span>
            </div>
          </div>
          <p className="mt-4 text-lg font-semibold" style={{ color: getScoreColor(totalScore) }}>
            {getScoreLabel(totalScore)}
          </p>
        </div>

        {/* Breakdown */}
        <div className="card-surface p-5 space-y-3">
          <h2 className="label-caps mb-2">Composição do score</h2>
          {components.map((comp, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {comp.emoji} {comp.label}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {comp.score}/{comp.maxScore}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(comp.score / comp.maxScore) * 100}%`,
                    backgroundColor: getScoreColor((comp.score / comp.maxScore) * 100),
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{comp.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly history */}
      <div className="card-surface p-5">
        <h2 className="label-caps mb-4">Histórico do score</h2>
        <div className="w-full min-w-0 overflow-x-auto">
          <ResponsiveContainer width="100%" height={200} minWidth={280}>
            <LineChart data={monthlyScores}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="score" name="Score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
