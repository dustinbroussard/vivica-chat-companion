import { createContext } from 'react';

export type ThemeVariant = 'dark' | 'light';
export type ThemeColor =
  | 'default'
  | 'blue'
  | 'red'
  | 'green'
  | 'purple'
  | 'mardi-gold'
  | 'mardi-gras';

export interface ThemeContextValue {
  color: ThemeColor;
  variant: ThemeVariant;
  currentMood: string;
  setColor: (color: ThemeColor) => void;
  setVariant: (variant: ThemeVariant) => void;
  setMood: (mood: string) => void;
  toggleVariant: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
