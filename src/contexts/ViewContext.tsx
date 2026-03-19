import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { useMyFamilies, useFamilyMembers } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';

export type ViewMode = 'personal' | 'family' | 'member';

interface ViewContextType {
  viewMode: ViewMode;
  selectedMemberId: string | null;
  selectedMemberName: string | null;
  familyId: string | null;
  setView: (mode: ViewMode, memberId?: string | null) => void;
  hasFamily: boolean;
  familyMembers: Array<{ user_id: string | null; invited_email: string | null; role: string; status: string }>;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: families } = useMyFamilies();
  const familyId = families?.[0]?.id || null;
  const { data: members } = useFamilyMembers(familyId || undefined);

  const [viewMode, setViewMode] = useState<ViewMode>('personal');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const hasFamily = !!(families && families.length > 0);
  const activeMembers = useMemo(() => 
    (members || []).filter(m => m.status === 'active'),
    [members]
  );

  const selectedMemberName = useMemo(() => {
    if (!selectedMemberId || !activeMembers.length) return null;
    const member = activeMembers.find(m => m.user_id === selectedMemberId);
    return member?.invited_email?.split('@')[0] || null;
  }, [selectedMemberId, activeMembers]);

  const setView = (mode: ViewMode, memberId?: string | null) => {
    setViewMode(mode);
    setSelectedMemberId(mode === 'member' ? (memberId || null) : null);
  };

  return (
    <ViewContext.Provider value={{
      viewMode,
      selectedMemberId,
      selectedMemberName,
      familyId,
      setView,
      hasFamily,
      familyMembers: activeMembers,
    }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) throw new Error('useView must be used within ViewProvider');
  return context;
}
