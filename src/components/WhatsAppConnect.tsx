import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { MessageCircle, Check, Loader2, X } from 'lucide-react';
import {
  useWhatsAppUser,
  useSendWhatsAppCode,
  useVerifyWhatsAppCode,
  useDisconnectWhatsApp,
  useTestWhatsAppConnection,
  formatPhone,
} from '@/hooks/useWhatsApp';
import { cn } from '@/lib/utils';

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function WhatsAppConnect() {
  const { data: waUser, isLoading } = useWhatsAppUser();
  const sendCode = useSendWhatsAppCode();
  const verifyCode = useVerifyWhatsAppCode();
  const disconnect = useDisconnectWhatsApp();
  const testConnection = useTestWhatsAppConnection();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [shake, setShake] = useState(false);
  const [verified, setVerified] = useState(false);

  // Countdown for resend
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Countdown timer for code expiry (10 min)
  const [expiresAt, setExpiresAt] = useState(0);

  useEffect(() => {
    if (step !== 'code') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const canResend = now >= resendAt;
  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expirySeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expiryMin = Math.floor(expirySeconds / 60);
  const expirySec = expirySeconds % 60;

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length === 11;

  const resetDialog = () => {
    setStep('phone');
    setPhone('');
    setOtpValue('');
    setShake(false);
    setVerified(false);
  };

  const handleSendCode = async () => {
    try {
      const norm = await sendCode.mutateAsync(phone);
      setNormalizedPhone(norm);
      setStep('code');
      setResendAt(Date.now() + 60_000);
      setExpiresAt(Date.now() + 600_000);
      setNow(Date.now());
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleVerify = async () => {
    try {
      await verifyCode.mutateAsync({ phone: normalizedPhone, code: otpValue });
      setVerified(true);
      setTimeout(() => {
        setDialogOpen(false);
        resetDialog();
      }, 1500);
    } catch (e: any) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleResend = async () => {
    try {
      await sendCode.mutateAsync(phone);
      setResendAt(Date.now() + 60_000);
      setExpiresAt(Date.now() + 600_000);
      setNow(Date.now());
      toast({ title: 'Código reenviado!' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast({ title: 'WhatsApp desconectado' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleTestMessage = async () => {
    toast({ title: 'Mensagem de teste enviada! 📱', description: 'Verifique seu WhatsApp.' });
  };

  if (isLoading) {
    return <div className="card-surface p-5 h-20 animate-pulse rounded-xl" />;
  }

  // Connected state
  if (waUser) {
    return (
      <div className="card-surface p-5 space-y-3">
        <h2 className="label-caps">WhatsApp</h2>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Conectado</p>
            <p className="text-sm text-muted-foreground">{formatPhone(waUser.phone)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleTestMessage}>
            Testar conexão
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                Desconectar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você não receberá mais notificações e não poderá registrar movimentações pelo WhatsApp.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Desconectar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Link to="/whatsapp-history" className="text-xs text-primary hover:underline">
          Ver histórico de mensagens →
        </Link>
      </div>
    );
  }

  // Disconnected state
  return (
    <>
      <div className="card-surface p-5 space-y-3">
        <h2 className="label-caps">WhatsApp</h2>
        <div className="flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-[#25D366] shrink-0" />
          <p className="text-sm text-muted-foreground">
            Conecte seu WhatsApp para registrar movimentações pelo celular
          </p>
        </div>
        <Button
          className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
          onClick={() => { resetDialog(); setDialogOpen(true); }}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Conectar WhatsApp
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetDialog(); setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          {step === 'phone' && (
            <>
              <DialogHeader>
                <DialogTitle>Conectar WhatsApp</DialogTitle>
                <DialogDescription>
                  Informe seu número de celular com DDD
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="(XX) XXXXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
                  maxLength={16}
                />
                <Button
                  className="w-full"
                  disabled={!phoneValid || sendCode.isPending}
                  onClick={handleSendCode}
                >
                  {sendCode.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Enviar código de verificação
                </Button>
              </div>
            </>
          )}

          {step === 'code' && !verified && (
            <>
              <DialogHeader>
                <DialogTitle>Verificar código</DialogTitle>
                <DialogDescription>
                  Enviamos um código de 6 dígitos para o seu WhatsApp
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className={cn('flex justify-center', shake && 'animate-shake')}>
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Expira em {expiryMin}:{String(expirySec).padStart(2, '0')}
                </p>

                <Button
                  className="w-full"
                  disabled={otpValue.length < 6 || verifyCode.isPending}
                  onClick={handleVerify}
                >
                  {verifyCode.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Verificar
                </Button>

                <div className="text-center">
                  {canResend ? (
                    <button
                      onClick={handleResend}
                      className="text-sm text-primary hover:underline"
                      disabled={sendCode.isPending}
                    >
                      Reenviar código
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Reenviar em {resendSeconds}s
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {verified && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-16 w-16 rounded-full bg-[#25D366]/20 flex items-center justify-center animate-in zoom-in-50">
                <Check className="h-8 w-8 text-[#25D366]" />
              </div>
              <p className="text-lg font-semibold text-foreground">WhatsApp conectado!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
