import { useState, useCallback, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGroups, ExpenseGroup } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, Sparkles, AlertTriangle, Download } from 'lucide-react';
import { parseOFX } from '@/lib/ofxParser';
import { PAYMENT_METHODS } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  groupId: string;
  groupName: string;
  paymentMethod: string;
  notes: string;
  selected: boolean;
  errors: string[];
  isDuplicate: boolean;
  aiSuggested: boolean;
}

interface ImportExpensesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  'dinheiro': 'dinheiro',
  'débito': 'debito',
  'debito': 'debito',
  'crédito': 'credito',
  'credito': 'credito',
  'pix': 'pix',
  'transferência': 'transferencia',
  'transferencia': 'transferencia',
  'outro': 'outro',
};

function downloadTemplate() {
  const header = 'data,descrição,valor,grupo,método_pagamento,observações';
  const rows = [
    '2025-01-15,Supermercado Extra,234.50,Alimentação,debito,Compras do mês',
    '2025-01-16,Uber para o trabalho,28.90,Transporte,pix,',
    '2025-01-17,Consulta médica,350.00,Saúde,credito,Dr. Silva',
  ];
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_despesas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try dd/MM/yyyy
  const parts = raw.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

export function ImportExpensesModal({ open, onOpenChange }: ImportExpensesModalProps) {
  const { user } = useAuth();
  const { data: groups } = useGroups();
  const { data: existingExpenses } = useExpenses();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const groupMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups?.forEach(g => {
      map[g.name.toLowerCase()] = g.id;
    });
    return map;
  }, [groups]);

  const findGroupId = (name: string): string => {
    if (!name) return groups?.[groups.length - 1]?.id || '';
    return groupMap[name.toLowerCase()] || groups?.[groups.length - 1]?.id || '';
  };

  const checkDuplicate = (date: string, amount: number, description: string): boolean => {
    if (!existingExpenses) return false;
    return existingExpenses.some(e =>
      e.date === date &&
      Math.abs(e.amount - amount) < 0.01 &&
      e.description.toLowerCase().includes(description.toLowerCase().slice(0, 10))
    );
  };

  const validateRow = (date: string, description: string, amount: number): string[] => {
    const errors: string[] = [];
    if (!parseDate(date)) errors.push('Data inválida. Use yyyy-MM-dd ou dd/MM/yyyy');
    if (!description?.trim()) errors.push('Descrição é obrigatória');
    if (isNaN(amount) || amount <= 0) errors.push('Valor deve ser um número positivo');
    return errors;
  };

  const processCSV = (text: string) => {
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    const parsed: ImportRow[] = result.data.map((row: any, i: number) => {
      const rawDate = row['data'] || row['Data'] || '';
      const description = row['descrição'] || row['descricao'] || row['Descrição'] || '';
      const rawAmount = row['valor'] || row['Valor'] || '0';
      const groupName = row['grupo'] || row['Grupo'] || '';
      const pm = row['método_pagamento'] || row['metodo_pagamento'] || row['Método'] || 'outro';
      const notes = row['observações'] || row['observacoes'] || row['Observações'] || '';

      const date = parseDate(rawDate) || rawDate;
      const amount = parseFloat(String(rawAmount).replace(',', '.'));
      const errors = validateRow(rawDate, description, amount);
      const isDuplicate = !errors.length && checkDuplicate(date, amount, description);

      return {
        id: crypto.randomUUID(),
        date,
        description,
        amount: isNaN(amount) ? 0 : amount,
        groupId: findGroupId(groupName),
        groupName,
        paymentMethod: PAYMENT_METHOD_MAP[pm.toLowerCase()] || 'outro',
        notes,
        selected: errors.length === 0,
        errors,
        isDuplicate,
        aiSuggested: false,
      };
    });
    setRows(parsed);
  };

  const processOFX = (text: string) => {
    const transactions = parseOFX(text);
    const parsed: ImportRow[] = transactions.map(t => {
      const errors = validateRow(t.date, t.description, t.amount);
      const isDuplicate = !errors.length && checkDuplicate(t.date, t.amount, t.description);
      return {
        id: crypto.randomUUID(),
        date: t.date,
        description: t.description,
        amount: t.amount,
        groupId: '',
        groupName: '',
        paymentMethod: 'debito',
        notes: '',
        selected: errors.length === 0,
        errors,
        isDuplicate,
        aiSuggested: false,
      };
    });
    setRows(parsed);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.toLowerCase().endsWith('.ofx')) {
        processOFX(text);
      } else {
        processCSV(text);
      }
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [groups, existingExpenses]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const classifyWithAI = async () => {
    if (!groups?.length) return;
    const unclassified = rows.filter(r => !r.groupId || r.groupId === groups[groups.length - 1]?.id);
    if (!unclassified.length) {
      toast.info('Todas as linhas já têm grupo definido');
      return;
    }

    setClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('classify-expense', {
        body: {
          descriptions: unclassified.map(r => r.description),
          groups: groups.map(g => ({ name: g.name })),
        },
      });

      if (error) throw error;

      const classifications: string[] = data.classifications || [];
      setRows(prev => {
        const updated = [...prev];
        let ci = 0;
        for (const row of updated) {
          if (!row.groupId || row.groupId === groups[groups.length - 1]?.id) {
            const suggested = classifications[ci];
            if (suggested) {
              const gId = findGroupId(suggested);
              if (gId) {
                row.groupId = gId;
                row.groupName = suggested;
                row.aiSuggested = true;
              }
            }
            ci++;
          }
        }
        return updated;
      });
      toast.success(`${classifications.length} despesas classificadas por IA`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao classificar com IA');
    } finally {
      setClassifying(false);
    }
  };

  const toggleRow = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const toggleAll = (checked: boolean) => {
    setRows(prev => prev.map(r => r.errors.length === 0 ? { ...r, selected: checked } : r));
  };

  const updateRowGroup = (id: string, groupId: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, groupId, aiSuggested: false } : r));
  };

  const updateRowPM = (id: string, pm: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, paymentMethod: pm } : r));
  };

  const handleImport = async () => {
    const selected = rows.filter(r => r.selected && r.errors.length === 0);
    if (!selected.length) return;

    setImporting(true);
    try {
      const inserts = selected.map(r => ({
        user_id: user!.id,
        description: r.description,
        amount: r.amount,
        date: r.date,
        group_id: r.groupId,
        payment_method: r.paymentMethod as any,
        notes: r.notes || null,
        recurrent: false,
      }));

      const { error } = await supabase.from('expenses').insert(inserts as any);
      if (error) throw error;

      const ignored = rows.length - selected.length;
      toast.success(`${selected.length} despesas importadas com sucesso${ignored > 0 ? `, ${ignored} ignoradas` : ''}`);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setRows([]);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao importar despesas');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Despesas</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arraste um arquivo CSV ou OFX aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.ofx"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar template CSV
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{rows.length} linhas</Badge>
              <Badge variant="outline">{selectedCount} selecionadas</Badge>
              {rows.some(r => r.isDuplicate) && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {rows.filter(r => r.isDuplicate).length} possíveis duplicatas
                </Badge>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={classifyWithAI}
                disabled={classifying}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {classifying ? 'Classificando...' : 'Classificar com IA'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRows([])}>
                Limpar
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
              <TooltipProvider>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b text-left">
                      <th className="p-2 w-8">
                        <Checkbox
                          checked={rows.every(r => r.selected || r.errors.length > 0)}
                          onCheckedChange={(c) => toggleAll(!!c)}
                        />
                      </th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 text-right">Valor</th>
                      <th className="p-2">Grupo</th>
                      <th className="p-2">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr
                        key={row.id}
                        className={`border-b transition-colors ${
                          row.errors.length > 0 ? 'bg-destructive/10' : row.isDuplicate ? 'bg-yellow-500/10' : ''
                        }`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={row.selected}
                            disabled={row.errors.length > 0}
                            onCheckedChange={() => toggleRow(row.id)}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {row.errors.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger className="text-destructive underline decoration-dotted">
                                {row.date || '—'}
                              </TooltipTrigger>
                              <TooltipContent>
                                {row.errors.map((e, i) => <p key={i}>{e}</p>)}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            row.date
                          )}
                        </td>
                        <td className="p-2 max-w-[200px] truncate">
                          {row.description}
                          {row.isDuplicate && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-3 w-3 inline ml-1 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>Possível duplicata</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Select value={row.groupId} onValueChange={v => updateRowGroup(row.id, v)}>
                              <SelectTrigger className="h-7 text-xs w-[130px]">
                                <SelectValue placeholder="Grupo" />
                              </SelectTrigger>
                              <SelectContent>
                                {groups?.map(g => (
                                  <SelectItem key={g.id} value={g.id}>
                                    {g.icon} {g.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {row.aiSuggested && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/10 text-primary">
                                IA
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <Select value={row.paymentMethod} onValueChange={v => updateRowPM(row.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map(pm => (
                                <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TooltipProvider>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
                {importing ? 'Importando...' : `Importar ${selectedCount} selecionadas`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
