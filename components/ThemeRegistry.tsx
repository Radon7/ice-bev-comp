'use client';

import { useMemo, useState, createContext, useContext, ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

type Mode = 'light' | 'dark';

const ColorModeContext = createContext({ toggleColorMode: () => {} });

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');

  const colorMode = useMemo(
    () => ({ toggleColorMode: () => setMode(prev => (prev === 'light' ? 'dark' : 'light')) }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#2196F3' },
          secondary: { main: '#FF9800' },
          success: { main: '#4CAF50' },
          ...(mode === 'dark'
            ? {
                background: { default: '#0a0f1a', paper: '#111827' },
              }
            : {}),
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 },
          subtitle2: { fontWeight: 600 },
        },
        components: {
          MuiPaper: {
            defaultProps: { elevation: 1 },
            styleOverrides: {
              root: { backgroundImage: 'none' },
            },
          },
          MuiSlider: {
            styleOverrides: {
              root: { height: 6 },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: { textTransform: 'none', fontWeight: 600 },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
