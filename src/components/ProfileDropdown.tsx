import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfiles';
import { EmojiAvatar } from '@/components/EmojiAvatar';
import { LogOut, User, MessageCircle, ClipboardList, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ProfileDropdown() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
          <EmojiAvatar emoji={profile?.avatar_emoji} color={profile?.avatar_color} userId={user?.id} size="sm" />
          <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden xl:inline">
            {profile?.display_name || user?.email?.split('@')[0]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="h-4 w-4 mr-2" />
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/profile', { state: { scrollTo: 'whatsapp' } })}>
          <MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/whatsapp-history')}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Histórico WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/profile', { state: { scrollTo: 'preferences' } })}>
          <Settings className="h-4 w-4 mr-2" />
          Preferências
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
