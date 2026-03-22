import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const DindinLogoLight = () => (
  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
    <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
      <text x="16" y="20" textAnchor="middle" style={{fontFamily:'sans-serif', fontSize:'16px', fontWeight:900, fill:'white'}}>$</text>
      <rect x="6" y="25" width="20" height="2" rx="1" fill="white" opacity="0.4"/>
      <rect x="9" y="28" width="14" height="1.5" rx="0.75" fill="white" opacity="0.2"/>
    </svg>
  </div>
);

const DindinLogoDark = () => (
  <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
      <text x="16" y="20" textAnchor="middle" style={{fontFamily:'sans-serif', fontSize:'16px', fontWeight:900, fill:'hsl(var(--primary))'}}>$</text>
      <rect x="6" y="25" width="20" height="2" rx="1" fill="hsl(var(--primary))" opacity="0.5"/>
    </svg>
  </div>
);

export default function Login() {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  if (user) return <Navigate to={redirect} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotConfirmed(false);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setEmailNotConfirmed(true);
      } else {
        toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
      }
    }
  };

  const handleResendConfirmation = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'E-mail reenviado!', description: 'Verifique sua caixa de entrada.' });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — editorial */}
      <div className="hidden lg:flex w-[52%] bg-foreground flex-col p-12 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full border border-white/5 translate-x-1/3 translate-y-1/3" />
        <div className="absolute bottom-10 right-10 w-52 h-52 rounded-full border border-white/5" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <DindinLogoLight />
          <span className="text-white font-extrabold text-lg tracking-tight">
            Din-Din <span className="text-primary">Zen</span>
          </span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center py-10">
          <p className="text-xs font-bold tracking-[2px] uppercase text-white/30 mb-5">Controle financeiro pessoal</p>
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Suas finanças,<br />
            <span className="text-white/40 font-serif italic font-normal">do seu jeito.</span>
          </h1>
          <p className="text-sm text-white/40 leading-relaxed max-w-sm mb-10">
            Controle inteligente do seu dinheiro. Orçamentos, metas e família — tudo junto, sem complicação.
          </p>
          <div className="flex gap-8">
            {[['R$ 0', 'custo para começar'], ['3 min', 'para configurar'], ['∞', 'controle total']].map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-extrabold text-white tracking-tight">{n}</div>
                <div className="text-xs text-white/30 font-medium mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-white/[0.08] pt-8 space-y-3">
          {[
            'Dashboard com visão completa das suas finanças',
            'Orçamento por categoria com alertas inteligentes',
            'Gestão familiar com divisão de despesas',
            'Metas com projeção automática de conclusão',
            'Classificação de despesas por IA',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-white/45 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <DindinLogoDark />
            <span className="font-extrabold text-lg tracking-tight">Din-Din <span className="text-primary">Zen</span></span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">Bom dia.</h2>
          <p className="text-sm text-muted-foreground mb-8">Entre na sua conta para continuar de onde parou.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="h-11 bg-card border-border"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Senha</Label>
                <Link to="/forgot-password" className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Esqueci a senha
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-11 bg-card border-border"
              />
            </div>

            {emailNotConfirmed && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-sm text-foreground">
                  Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleResendConfirmation} disabled={resending}>
                  {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reenviar confirmação
                </Button>
              </div>
            )}

            <Button type="submit" className="w-full h-12 font-bold text-sm mt-2" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link to="/register" className="font-bold text-foreground hover:text-primary underline underline-offset-2">
              Criar conta grátis →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}