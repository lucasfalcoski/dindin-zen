import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, Loader2, Mail } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="card-surface w-full max-w-sm p-8 animate-fade-in text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>. Clique no link para ativar sua conta.
          </p>
          <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
            {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reenviar e-mail
          </Button>
          <Link to="/login" className="text-sm text-primary hover:underline block">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card-surface w-full max-w-sm p-8 animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Criar conta</h1>
        <p className="text-sm text-muted-foreground mb-6">Comece a controlar suas finanças agora</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Seu nome completo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
