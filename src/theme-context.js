// Tema claro/escuro: 'auto' segue o sistema; o botão 🌙 no cabeçalho alterna.
// A escolha fica salva no banco (tabela settings) e sobrevive ao fechar o app.

import { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from './db/database';
import { palettes } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState(() => getSetting('theme', 'auto'));

  const isDark = mode === 'dark' || (mode === 'auto' && system === 'dark');

  const value = useMemo(
    () => ({
      colors: isDark ? palettes.dark : palettes.light,
      isDark,
      mode,
      cycleMode: () =>
        setMode((current) => {
          const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
          setSetting('theme', next);
          return next;
        }),
    }),
    [isDark, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
