import { useEffect, useRef } from 'react';
import { generateThemePalette } from '@/utils/generateThemePalette';
import { generateNarration } from '@/utils/generateNarration';

export function useDynamicTheme(mood: string, enabled: boolean) {
  const timeoutRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      try {
        const palette = generateThemePalette(mood);
        const root = document.documentElement;
        Object.entries(palette).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
        root.classList.add('theme-changing');
        setTimeout(() => root.classList.remove('theme-changing'), 500);
        console.log('Generated AI theme:', palette);
        generateNarration(mood);
      } catch (e) {
        console.error('Failed to apply AI theme, falling back', e);
        document.documentElement.removeAttribute('style');
      }
    }, 500);

    return () => window.clearTimeout(timeoutRef.current);
  }, [mood, enabled]);
}
