import { useEffect, useRef } from 'react';
import { generateThemePalette, DualThemePalette } from '@/utils/generateThemePalette';
import { generateNarration } from '@/utils/generateNarration';
import { toast } from '@/components/ui/sonner';

type ThemeVariant = 'dark' | 'light';

export function useDynamicTheme(mood: string, variant: ThemeVariant, enabled: boolean) {
  const paletteRef = useRef<DualThemePalette | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.removeAttribute('style');
      paletteRef.current = null;
      return;
    }

    let cancelled = false;
    const applyTheme = async () => {
      try {
        if (!paletteRef.current) {
          paletteRef.current = await generateThemePalette(mood);
          if (cancelled) return;
          toast.success('AI theme applied');
          generateNarration(mood);
        }
        const palette = paletteRef.current[variant];
        Object.entries(palette).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
        root.classList.add('theme-changing');
        setTimeout(() => root.classList.remove('theme-changing'), 500);
      } catch (e) {
        console.error('Failed to apply AI theme, falling back', e);
        root.removeAttribute('style');
        paletteRef.current = null;
        toast.error('Failed to apply AI theme');
      }
    };

    applyTheme();
    return () => {
      cancelled = true;
    };
  }, [mood, variant, enabled]);
}

