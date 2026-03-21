'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className="p-2 border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-gold-400" />
      ) : (
        <Moon className="w-4 h-4 text-neutral-600" />
      )}
    </button>
  );
}
