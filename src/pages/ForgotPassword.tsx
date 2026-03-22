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
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
              <text x="16" y="20" textAnchor="middle" style={{fontFamily:'sans-serif', fontSize:'16px', fontWeight:900, fill:'hsl(var(--primary))'}}>$</text>
              <rect x="6" y="25" width="20" height="2" rx="1" fill="hsl(var(--primary))" opacity="0.5"/>
            </svg>
          </div>
          <span className="font-extrabold text-lg tracking-tight">Din-Din <span className="text-primary">Zen</span></span>
        </div>

        <Link to="/login" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors">
          ← Voltar para login
        </Link>

        {sent ? (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">✉️</div>
            <h2 className="text-3xl font-extrabold tracking-tight">E-mail enviado!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos um link para <strong className="text-foreground">{email}</strong>. Verifique sua caixa de entrada e spam.
            </p>
            <div className="bg-primary/[0.08] border border-primary/15 rounded-xl p-4 text-sm text-primary font-medium leading-relaxed">
              O link expira em <strong>15 minutos</strong>. Se não receber, aguarde alguns instantes.
            </div>
            <Button className="w-full h-11" onClick={() => window.location.href = '/login'}>Voltar para o login</Button>
            <Button variant="outline" className="w-full h-11" onClick={() => setSent(false)}>Reenviar e-mail</Button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">Recuperar senha</h2>
            <p className="text-sm text-muted-foreground mb-8">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">E-mail cadastrado</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="h-11 bg-card border-border" />
              </div>
              <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}