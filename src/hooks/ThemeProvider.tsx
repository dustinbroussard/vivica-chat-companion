import { useState, useEffect } from 'react';
import { Storage, DebouncedStorage, STORAGE_KEYS } from '@/utils/storage';
import { useDynamicTheme } from '@/hooks/useDynamicTheme';
import { ThemeContext, ThemeColor, ThemeVariant } from './theme-context';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [color, setColor] = useState<ThemeColor>('default');
  const [variant, setVariant] = useState<ThemeVariant>('dark');
  const [currentMood, setMood] = useState<string>('serene');

  useEffect(() => {
    const saved = Storage.get(STORAGE_KEYS.THEME, { color: 'default' as ThemeColor, variant: 'dark' as ThemeVariant });
    setColor(saved.color as ThemeColor);
    setVariant(saved.variant as ThemeVariant);
  }, []);

  useEffect(() => {
    const themeAttr = `${color === 'ai-choice' ? 'default' : color}-${variant}`;
    document.documentElement.setAttribute('data-theme', themeAttr);
    document.documentElement.classList.toggle('dark', variant === 'dark');
    DebouncedStorage.set(STORAGE_KEYS.THEME, { color, variant }, 300);
  }, [color, variant]);

  useDynamicTheme(currentMood, variant, color === 'ai-choice');

  const toggleVariant = () => {
    setVariant(variant === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ color, variant, currentMood, setColor, setVariant, setMood, toggleVariant }}>
      {children}
    </ThemeContext.Provider>
  );
};
