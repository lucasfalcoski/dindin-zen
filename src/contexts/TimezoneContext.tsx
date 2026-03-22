import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useProfile } from '@/hooks/useProfiles';
import { format } from 'date-fns';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

interface TimezoneContextType {
  timezone: string;
  /** Returns today's date string (yyyy-MM-dd) in the user's timezone */
  todayString: () => string;
  /** Formats a date string for display in the user's timezone (dd/MM/yyyy) */
  formatDateDisplay: (dateStr: string) => string;
  /** Formats a date string short (dd MMM) in the user's timezone */
  formatDateShortDisplay: (dateStr: string) => string;
  /** Returns current Date object adjusted conceptually to the user's timezone */
  nowInUserTz: () => Date;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

function getTimezoneNow(tz: string): Date {
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}

function todayInTz(tz: string): string {
  const d = getTimezoneNow(tz);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const timezone = profile?.timezone || DEFAULT_TIMEZONE;

  const value = useMemo<TimezoneContextType>(() => ({
    timezone,
    todayString: () => todayInTz(timezone),
    formatDateDisplay: (dateStr: string) => {
      // dateStr is yyyy-MM-dd, display as dd/MM/yyyy
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    },
    formatDateShortDisplay: (dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    },
    nowInUserTz: () => getTimezoneNow(timezone),
  }), [timezone]);

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useUserTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    // Fallback for usage outside provider
    return {
      timezone: DEFAULT_TIMEZONE,
      todayString: () => todayInTz(DEFAULT_TIMEZONE),
      formatDateDisplay: (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      },
      formatDateShortDisplay: (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      },
      nowInUserTz: () => getTimezoneNow(DEFAULT_TIMEZONE),
    };
  }
  return context;
}
