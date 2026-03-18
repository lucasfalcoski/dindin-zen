import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card-surface w-full max-w-sm p-8 animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mb-6">Enviaremos um link para redefinir sua senha</p>
        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-foreground">Link enviado para <strong>{email}</strong>. Verifique seu e-mail.</p>
            <Link to="/login" className="text-primary hover:underline text-sm">Voltar para login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>
            <Link to="/login" className="text-primary hover:underline text-sm block text-center">Voltar para login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
