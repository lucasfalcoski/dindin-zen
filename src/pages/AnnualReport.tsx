import { useState, useMemo } from 'react';
import { format, startOfYear, endOfYear, getDaysInMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncomes } from '@/hooks/useIncomes';
import { useGroups } from '@/hooks/useGroups';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { SummaryCard } from '@/components/SummaryCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Line, ComposedChart,
} from 'recharts';
import { Wallet, DollarSign, PiggyBank, TrendingUp, TrendingDown, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function AnnualReport() {
  const { user } = useAuth();
  const { viewMode, selectedMemberId } = useView();
  const [year, setYear] = useState(new Date().getFullYear());

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: allExpenses, isLoading } = useExpenses({ startDate, endDate });
  const { data: allIncomes } = useIncomes({ startDate, endDate });
  const { data: groups } = useGroups();

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    if (viewMode === 'personal') return allExpenses.filter(e => e.user_id === user?.id);
    if (viewMode === 'family') return allExpenses.filter((e: any) => e.visibility === 'family');
    if (viewMode === 'member') return allExpenses.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
    return allExpenses;
  }, [allExpenses, viewMode, user?.id, selectedMemberId]);

  const incomes = useMemo(() => {
    if (!allIncomes) return [];
    if (viewMode === 'personal') return allIncomes.filter(i => i.user_id === user?.id);
    if (viewMode === 'family') return allIncomes.filter((i: any) => i.visibility === 'family');
    if (viewMode === 'member') return allIncomes.filter((i: any) => i.user_id === selectedMemberId && i.visibility === 'family');
    return allIncomes;
  }, [allIncomes, viewMode, user?.id, selectedMemberId]);

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    let cumulative = 0;
    return MONTHS_PT.map((m, i) => {
      const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
      const expTotal = expenses.filter(e => e.date.startsWith(monthStr)).reduce((s, e) => s + Number(e.amount), 0);
      const incTotal = incomes.filter(inc => inc.date.startsWith(monthStr)).reduce((s, inc) => s + Number(inc.amount), 0);
      cumulative += incTotal - expTotal;
      return { month: m, despesas: expTotal, receitas: incTotal, saldo: cumulative };
    });
  }, [expenses, incomes, year]);

  // Summary stats
  const stats = useMemo(() => {
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalInc = incomes.reduce((s, i) => s + Number(i.amount), 0);
    const saved = totalInc - totalExp;

    let mostExpMonth = { idx: 0, val: 0 };
    let leastExpMonth = { idx: 0, val: Infinity };
    monthlyData.forEach((m, i) => {
      if (m.despesas > mostExpMonth.val) mostExpMonth = { idx: i, val: m.despesas };
      if (m.despesas > 0 && m.despesas < leastExpMonth.val) leastExpMonth = { idx: i, val: m.despesas };
    });
    if (leastExpMonth.val === Infinity) leastExpMonth = { idx: 0, val: 0 };

    return { totalExp, totalInc, saved, mostExpMonth: MONTHS_FULL[mostExpMonth.idx], leastExpMonth: MONTHS_FULL[leastExpMonth.idx] };
  }, [expenses, incomes, monthlyData]);

  // Heatmap data: 12 months × 31 days
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 12 }, () => Array(31).fill(0));
    expenses.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      grid[d.getMonth()][d.getDate() - 1] += Number(e.amount);
    });
    const maxVal = Math.max(...grid.flat(), 1);
    return { grid, maxVal };
  }, [expenses]);

  const getHeatColor = (val: number, max: number) => {
    if (val === 0) return 'hsl(var(--muted))';
    const intensity = Math.min(val / max, 1);
    return `hsl(var(--primary) / ${0.15 + intensity * 0.85})`;
  };

  const handleExportCSV = () => {
    const header = 'Mês,Receitas,Despesas,Saldo\n';
    const rows = monthlyData.map(m => `${m.month},${m.receitas.toFixed(2)},${m.despesas.toFixed(2)},${m.saldo.toFixed(2)}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_anual_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Relatório Anual ${year}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Total Gasto: ${formatBRL(stats.totalExp)}`, 14, 35);
    doc.text(`Total Recebido: ${formatBRL(stats.totalInc)}`, 14, 42);
    doc.text(`Total Poupado: ${formatBRL(stats.saved)}`, 14, 49);
    doc.text(`Mês mais caro: ${stats.mostExpMonth}`, 14, 56);
    doc.text(`Mês mais econômico: ${stats.leastExpMonth}`, 14, 63);

    (doc as any).autoTable({
      startY: 75,
      head: [['Mês', 'Receitas', 'Despesas', 'Saldo Acumulado']],
      body: monthlyData.map(m => [m.month, formatBRL(m.receitas), formatBRL(m.despesas), formatBRL(m.saldo)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio_anual_${year}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Relatório Anual</h1>
          <div className="flex items-center gap-1 bg-accent rounded-lg">
            <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-accent/80 rounded-l-lg transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium text-foreground">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-accent/80 rounded-r-lg transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total gasto" value={stats.totalExp} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label="Total recebido" value={stats.totalInc} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard
          label="Total poupado"
          value={stats.saved}
          icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
          valueClassName={stats.saved >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        />
        <SummaryCard label="Mês mais caro" value={0} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} formatFn={() => stats.mostExpMonth} />
        <SummaryCard label="Mês + econômico" value={0} icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} formatFn={() => stats.leastExpMonth} />
      </div>

      {/* Stacked bar chart with cumulative line */}
      <div className="card-surface p-5">
        <h2 className="label-caps mb-4">Receitas vs Despesas por mês</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} stackId="stack" />
            <Bar yAxisId="left" dataKey="despesas" name="Despesas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="stack" />
            <Line yAxisId="right" type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ fill: 'hsl(var(--foreground))', r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="card-surface p-5">
        <h2 className="label-caps mb-4">Heatmap de gastos</h2>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: 'auto repeat(31, 1fr)' }}>
              {/* Header row: day numbers */}
              <div className="w-8" />
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className="w-4 h-4 text-[8px] text-muted-foreground text-center leading-4">{i + 1}</div>
              ))}

              {/* Month rows */}
              {heatmapData.grid.map((row, monthIdx) => (
                <div key={monthIdx} className="contents">
                  <div className="w-8 text-[10px] text-muted-foreground font-medium leading-4 pr-1 text-right">
                    {MONTHS_PT[monthIdx]}
                  </div>
                  {row.map((val, dayIdx) => {
                    const daysInMonth = getDaysInMonth(new Date(year, monthIdx));
                    const isValid = dayIdx < daysInMonth;
                    return (
                      <UITooltip key={dayIdx}>
                        <TooltipTrigger asChild>
                          <div
                            className="w-4 h-4 rounded-[2px] transition-colors"
                            style={{
                              backgroundColor: isValid ? getHeatColor(val, heatmapData.maxVal) : 'transparent',
                              cursor: isValid && val > 0 ? 'pointer' : 'default',
                            }}
                          />
                        </TooltipTrigger>
                        {isValid && val > 0 && (
                          <TooltipContent className="text-xs">
                            {dayIdx + 1}/{monthIdx + 1}: {formatBRL(val)}
                          </TooltipContent>
                        )}
                      </UITooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map(i => (
            <div key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: getHeatColor(i * heatmapData.maxVal, heatmapData.maxVal) }} />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
