import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses } from '@/hooks/useExpenses';
import { useGroups } from '@/hooks/useGroups';
import { useView } from '@/contexts/ViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, FileText, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function Reports() {
  const { user } = useAuth();
  const { viewMode, selectedMemberId } = useView();
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { data: groups } = useGroups();

  const now = new Date();
  const { startDate, endDate } = useMemo(() => {
    switch (period) {
      case 'week': return { startDate: format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'), endDate: format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd') };
      case 'month': return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'quarter': return { startDate: format(startOfQuarter(now), 'yyyy-MM-dd'), endDate: format(endOfQuarter(now), 'yyyy-MM-dd') };
      case 'year': return { startDate: format(startOfYear(now), 'yyyy-MM-dd'), endDate: format(endOfYear(now), 'yyyy-MM-dd') };
      case 'custom': return { startDate: customStart, endDate: customEnd };
    }
  }, [period, customStart, customEnd]);

  const { data: allExpenses, isLoading } = useExpenses({ startDate, endDate });

  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    switch (viewMode) {
      case 'personal': return allExpenses.filter(e => e.user_id === user?.id);
      case 'family': return allExpenses.filter((e: any) => e.visibility === 'family');
      case 'member': return allExpenses.filter((e: any) => e.user_id === selectedMemberId && e.visibility === 'family');
      default: return allExpenses;
    }
  }, [allExpenses, viewMode, user?.id, selectedMemberId]);

  const totalPeriod = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const breakdown = useMemo(() => {
    if (!expenses.length || !groups) return [];
    const byGroup: Record<string, number> = {};
    expenses.forEach(e => { byGroup[e.group_id] = (byGroup[e.group_id] || 0) + Number(e.amount); });
    const days = startDate && endDate
      ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1;
    return groups
      .filter(g => byGroup[g.id])
      .map(g => ({ ...g, total: byGroup[g.id], pct: totalPeriod > 0 ? (byGroup[g.id] / totalPeriod * 100) : 0, avgDay: byGroup[g.id] / days }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, groups, totalPeriod, startDate, endDate]);

  const dailyData = useMemo(() => {
    if (!expenses.length || !startDate || !endDate) return [];
    try {
      const days = eachDayOfInterval({ start: new Date(startDate + 'T00:00:00'), end: new Date(endDate + 'T00:00:00') });
      const byDay: Record<string, number> = {};
      days.forEach(d => { byDay[format(d, 'yyyy-MM-dd')] = 0; });
      expenses.forEach(e => { if (e.date in byDay) byDay[e.date] += Number(e.amount); });
      return days.map(d => ({ date: format(d, 'dd/MM', { locale: ptBR }), total: byDay[format(d, 'yyyy-MM-dd')] }));
    } catch { return []; }
  }, [expenses, startDate, endDate]);

  const handleExportCSV = () => {
    if (!expenses.length) return;
    const header = 'Data,Descrição,Grupo,Valor,Recorrente,Notas\n';
    const rows = expenses.map(e => {
      const group = groups?.find(g => g.id === e.group_id);
      return `${e.date},"${e.description}","${group?.name || ''}",${e.amount},${e.recurrent ? 'Sim' : 'Não'},"${e.notes || ''}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despesas_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!breakdown.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatório de Despesas`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 28);
    doc.text(`Total: ${formatBRL(totalPeriod)}`, 14, 35);

    (doc as any).autoTable({
      startY: 45,
      head: [['Grupo', 'Total', '%', 'Média/dia']],
      body: breakdown.map(b => [
        `${b.icon} ${b.name}`,
        formatBRL(b.total),
        `${b.pct.toFixed(1)}%`,
        formatBRL(b.avgDay),
      ]),
      foot: [['Total', formatBRL(totalPeriod), '100%', '']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio_${startDate}_${endDate}.pdf`);
  };

  const periods: { value: Period; label: string }[] = [
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Ano' },
    { value: 'custom', label: 'Período' },
  ];

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">análise</p>
          <h1 className="page-title">Relatórios</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/reports/annual">
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Anual
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!expenses.length} className="gap-1.5">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!breakdown.length} className="gap-1.5">
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

      <div className="card-surface p-5">
        <h2 className="label-caps mb-4">Gastos diários</h2>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-muted rounded-lg" />
        ) : dailyData.length > 0 ? (
          <div className="w-full min-w-0 overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para o período</p>
        )}
      </div>

      <div className="card-surface overflow-hidden">
        <div className="p-4 pb-2">
          <h2 className="label-caps">Detalhamento por grupo</h2>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}
          </div>
        ) : breakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 label-caps font-medium">Grupo</th>
                  <th className="text-right p-3 label-caps font-medium">Total</th>
                  <th className="text-right p-3 label-caps font-medium">%</th>
                  <th className="text-right p-3 label-caps font-medium">Média/dia</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map(b => (
                  <tr key={b.id} className="border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md flex items-center justify-center text-xs" style={{ backgroundColor: b.color + '20' }}>
                          {b.icon}
                        </div>
                        <span className="font-medium text-foreground">{b.name}</span>
                      </div>
                    </td>
                    <td className="text-right p-3 currency text-foreground">{formatBRL(b.total)}</td>
                    <td className="text-right p-3 text-muted-foreground">{b.pct.toFixed(1)}%</td>
                    <td className="text-right p-3 currency text-muted-foreground">{formatBRL(b.avgDay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="p-3 font-semibold text-foreground">Total</td>
                  <td className="text-right p-3 currency font-semibold text-foreground">{formatBRL(totalPeriod)}</td>
                  <td className="text-right p-3 text-muted-foreground">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-8 text-center">Nenhuma despesa no período selecionado.</p>
        )}
      </div>
    </div>
  );
}
