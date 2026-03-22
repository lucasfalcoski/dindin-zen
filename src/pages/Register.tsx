import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail } from 'lucide-react';

export default function Register() {
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe seu nome completo.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName.trim());
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
    } else {
      setRegistered(true);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'E-mail reenviado!', description: 'Verifique sua caixa de entrada.' });
    }
  };

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Verifique seu e-mail</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>. Clique no link para ativar sua conta.
          </p>
          <Button variant="outline" className="w-full h-11" onClick={handleResend} disabled={resending}>
            {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reenviar e-mail
          </Button>
          <Link to="/login" className="text-sm font-bold text-foreground hover:text-primary underline underline-offset-2 block">
            Voltar ao login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex w-[52%] bg-foreground flex-col p-12 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full border border-white/5 translate-x-1/3 translate-y-1/3" />
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
              <text x="16" y="20" textAnchor="middle" style={{fontFamily:'sans-serif', fontSize:'16px', fontWeight:900, fill:'white'}}>$</text>
              <rect x="6" y="25" width="20" height="2" rx="1" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <span className="text-white font-extrabold text-lg tracking-tight">Din-Din <span className="text-primary">Zen</span></span>
        </div>
        <div className="flex-1 flex flex-col justify-center py-10">
          <p className="text-xs font-bold tracking-[2px] uppercase text-white/30 mb-5">Comece agora</p>
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Seu dinheiro,<br />
            <span className="text-white/40 font-serif italic font-normal">organizado.</span>
          </h1>
          <p className="text-sm text-white/40 leading-relaxed max-w-sm">
            Crie sua conta grátis e comece a controlar suas finanças em menos de 3 minutos.
          </p>
        </div>
        <div className="border-t border-white/[0.08] pt-8 space-y-3">
          {['Grátis para sempre, sem cartão', 'Dados seguros e criptografados', 'Funciona como app no celular'].map(f => (
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
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                <text x="16" y="20" textAnchor="middle" style={{fontFamily:'sans-serif', fontSize:'16px', fontWeight:900, fill:'hsl(var(--primary))'}}>$</text>
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight">Din-Din <span className="text-primary">Zen</span></span>
          </div>

          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors">
            ← Voltar
          </button>

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">Criar conta</h2>
          <p className="text-sm text-muted-foreground mb-8">Comece a controlar suas finanças hoje, gratuitamente.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Nome completo</Label>
              <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Seu nome completo" className="h-11 bg-card border-border" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="h-11 bg-card border-border" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Senha</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" className="h-11 bg-card border-border" />
            </div>
            <Button type="submit" className="w-full h-12 font-bold text-sm mt-2" disabled={loading}>
              {loading ? 'Criando...' : 'Criar minha conta'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-bold text-foreground hover:text-primary underline underline-offset-2">Entrar →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}