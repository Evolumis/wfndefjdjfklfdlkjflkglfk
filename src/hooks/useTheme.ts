import { useEffect } from 'react';

export type ThemeMode = 'light';

export function useTheme() {
  useEffect(() => {
    try {
      localStorage.removeItem('evasion_dashboard_theme');
      const root = document.documentElement;
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } catch {}
  }, []);

  return {
    theme: 'light' as const,
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: false,
  };
}

