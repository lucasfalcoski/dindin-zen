import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Receipt, DollarSign, Target, Gauge,
  Building2, CreditCard, TrendingUp, Users, Search,
  Goal, Tag, BarChart3,
} from 'lucide-react';

const GUIDE_ITEMS = [
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Visão geral do mês: saldo, despesas e taxa de poupança em tempo real.' },
  { icon: Receipt, title: 'Despesas', desc: 'Botão + ou tecla N para registrar. Organize por grupos, tags e método de pagamento.' },
  { icon: DollarSign, title: 'Receitas', desc: 'Registre seu salário como recorrente e ele volta automaticamente todo mês.' },
  { icon: Target, title: 'Orçamento', desc: 'Defina limites por categoria. A barra mostra em tempo real o quanto já usou.' },
  { icon: Gauge, title: 'Score', desc: 'Sua saúde financeira de 0 a 100 calculada com base nos seus hábitos.' },
  { icon: Building2, title: 'Contas', desc: 'Cadastre contas bancárias e acompanhe seu saldo real atualizado.' },
  { icon: CreditCard, title: 'Cartões', desc: 'Controle fatura, limite e vencimento de cada cartão de crédito.' },
  { icon: Goal, title: 'Metas', desc: 'Crie objetivos financeiros e acompanhe sua evolução mês a mês.' },
  { icon: TrendingUp, title: 'Projeção', desc: 'Veja para onde suas finanças estão indo com base no histórico.' },
  { icon: BarChart3, title: 'Relatórios', desc: 'Análises mensais e anuais detalhadas dos seus gastos e receitas.' },
  { icon: Users, title: 'Família', desc: 'Compartilhe despesas e orçamentos com membros da sua família.' },
  { icon: Tag, title: 'Tags', desc: 'Marque despesas com etiquetas personalizadas para filtrar depois.' },
  { icon: Search, title: 'Buscar', desc: 'Pressione ⌘K (ou Ctrl+K) para busca rápida em qualquer tela.' },
];

interface HelpGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpGuide({ open, onOpenChange }: HelpGuideProps) {
  const { user } = useAuth();

  const handleClose = () => {
    if (user) localStorage.setItem(`help_seen_${user.id}`, 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col max-h-[90dvh] p-0 gap-0 sm:max-w-lg">
        {/* Header fixo */}
        <div className="bg-primary px-6 py-5 flex-shrink-0 rounded-t-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-lg font-semibold text-primary-foreground">
                Como usar o Din-din Zen
              </h2>
              <p className="text-sm text-primary-foreground/80">
                Tudo que você precisa saber em 2 minutos
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <div className="space-y-3">
            {GUIDE_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-accent/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dica extra */}
          <div className="mt-4 p-3 rounded-xl border border-border bg-card">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-medium">Dica:</span> Use o botão <span className="font-medium">?</span> no menu a qualquer momento para rever este guia.
            </p>
          </div>
        </div>

        {/* Botão fixo no rodapé */}
        <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-border bg-card rounded-b-lg">
          <Button onClick={handleClose} className="w-full">
            Entendi! 🎉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
