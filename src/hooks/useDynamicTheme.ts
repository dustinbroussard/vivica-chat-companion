import { useEffect } from 'react';
import { generateThemePalette } from '@/utils/generateThemePalette';
import { generateNarration } from '@/utils/generateNarration';

export function useDynamicTheme(mood: string, enabled: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.removeAttribute('style');
      return;
    }

    let cancelled = false;
    const applyTheme = async () => {
      try {
        const palette = await generateThemePalette(mood);
        if (cancelled) return;
        Object.entries(palette).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
        root.classList.add('theme-changing');
        setTimeout(() => root.classList.remove('theme-changing'), 500);
        console.log('Generated AI theme:', palette);
        generateNarration(mood);
      } catch (e) {
        console.error('Failed to apply AI theme, falling back', e);
        root.removeAttribute('style');
      }
    };

    applyTheme();
    return () => {
      cancelled = true;
    };
  }, [mood, enabled]);
}
