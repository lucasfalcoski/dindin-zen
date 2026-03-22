import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card-surface w-full max-w-sm p-8 animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Entrar</h1>
        <p className="text-sm text-muted-foreground mb-6">Acesse sua conta para gerenciar suas finanças</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm space-y-2">
          <Link to="/forgot-password" className="text-primary hover:underline block">Esqueci minha senha</Link>
          <p className="text-muted-foreground">
            Não tem conta?{' '}
            <Link to="/register" className="text-primary hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
