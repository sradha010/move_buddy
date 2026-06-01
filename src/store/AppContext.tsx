import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'guest' | 'host';

interface AppState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  user: { name: string; email: string; phone: string } | null;
  setUser: (user: { name: string; email: string; phone: string } | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('buddyride_mode');
    return (saved as Mode) || 'guest';
  });
  const [isAuthenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('buddyride_auth') === 'true';
  });
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(() => {
    const saved = localStorage.getItem('buddyride_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('buddyride_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('buddyride_auth', String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('buddyride_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('buddyride_user');
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ mode, setMode, isAuthenticated, setAuthenticated, user, setUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
