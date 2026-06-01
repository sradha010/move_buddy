import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'guest' | 'host';
type Theme = 'dark' | 'light';

interface AppState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  user: { name: string; email: string; phone: string } | null;
  setUser: (user: { name: string; email: string; phone: string } | null) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
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
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('buddyride_theme') as Theme;
    const initial = saved || 'dark';
    // Apply immediately to avoid flash of wrong theme
    document.documentElement.setAttribute('data-theme', initial);
    return initial;
  });

  const setTheme = (next: Theme) => {
    // Add transition class for smooth switch
    document.documentElement.classList.add('theme-transition');
    document.documentElement.setAttribute('data-theme', next);
    setThemeState(next);
    localStorage.setItem('buddyride_theme', next);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 350);
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
    <AppContext.Provider value={{ mode, setMode, isAuthenticated, setAuthenticated, user, setUser, theme, setTheme }}>
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
