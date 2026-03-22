'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

type Mode = 'light' | 'dark';

const ColorModeContext = createContext({
  mode: 'dark' as Mode,
  toggleColorMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Mode | null;
    if (saved === 'light' || saved === 'dark') {
      setMode(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}
