import { useContext } from 'react';
import { ThemeContext, ThemeColor, ThemeVariant } from './theme-context';

export { ThemeColor, ThemeVariant };

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
