import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAcceptInvite } from '@/hooks/useFamily';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const acceptInvite = useAcceptInvite();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !token || accepted) return;

    const accept = async () => {
      try {
        const result = await acceptInvite.mutateAsync(token);
        if (result.error) {
          setError(result.error);
          return;
        }
        setAccepted(true);
        toast({ title: `Bem-vindo à família ${result.family_name}! 🎉` });
        navigate('/', { replace: true });
      } catch {
        setError('Erro ao aceitar convite. Tente novamente.');
      }
    };

    accept();
  }, [user, token]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="card-surface p-8 max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Convite para família</h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado para participar de uma família. Faça login ou crie uma conta para aceitar o convite.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate(`/login?redirect=/invite/${token}`)}>
              Fazer login
            </Button>
            <Button variant="outline" onClick={() => navigate(`/register?redirect=/invite/${token}`)}>
              Criar conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="card-surface p-8 max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Erro no convite</h1>
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={() => navigate('/')}>Ir para o Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Aceitando convite...</p>
      </div>
    </div>
  );
}
