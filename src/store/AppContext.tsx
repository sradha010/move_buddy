import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'guest' | 'host';

interface AppUser {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role?: 'guest' | 'host' | 'admin';
  profile_photo?: string;
  is_verified?: boolean;
}

interface AppState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    return (localStorage.getItem('buddyride_mode') as Mode) || 'guest';
  });

  const [isAuthenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('buddyride_auth') === 'true';
  });

  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('buddyride_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessTokenState] = useState<string | null>(() => {
    return localStorage.getItem('buddyride_token');
  });

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
    if (token) {
      localStorage.setItem('buddyride_token', token);
    } else {
      localStorage.removeItem('buddyride_token');
    }
  };

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
    <AppContext.Provider value={{
      mode, setMode,
      isAuthenticated, setAuthenticated,
      user, setUser,
      accessToken, setAccessToken,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
