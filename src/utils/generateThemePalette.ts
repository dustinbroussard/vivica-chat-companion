export type ThemePalette = Record<string, string>;

const basePalettes: Record<string, Record<string, [number, number, number]>> = {
  serene: {
    '--background': [210, 40, 96],
    '--foreground': [210, 30, 10],
    '--primary': [195, 60, 55],
    '--accent': [180, 70, 75],
  },
  fiery: {
    '--background': [10, 40, 95],
    '--foreground': [10, 30, 10],
    '--primary': [5, 70, 60],
    '--accent': [25, 85, 65],
  },
  mysterious: {
    '--background': [260, 40, 95],
    '--foreground': [260, 30, 10],
    '--primary': [250, 45, 50],
    '--accent': [280, 60, 70],
  },
  playful: {
    '--background': [50, 70, 95],
    '--foreground': [50, 30, 10],
    '--primary': [330, 70, 65],
    '--accent': [200, 80, 65],
  },
  romantic: {
    '--background': [340, 40, 95],
    '--foreground': [340, 25, 10],
    '--primary': [350, 60, 65],
    '--accent': [320, 70, 75],
  },
  fallback: {
    '--background': [0, 0, 100],
    '--foreground': [0, 0, 0],
    '--primary': [0, 0, 0],
    '--accent': [0, 0, 0],
  },
};

const randomWithin = (value: number, range: number) =>
  Math.max(0, Math.min(100, value + (Math.random() * 2 - 1) * range));

export function generateThemePalette(mood: string): ThemePalette {
  // TODO: Replace with LLM-powered palette generation via API.
  const base = basePalettes[mood as keyof typeof basePalettes] || basePalettes.fallback;

  const palette: ThemePalette = {};
  Object.entries(base).forEach(([key, [h, s, l]]) => {
    palette[key] = `${Math.round(randomWithin(h, 5))} ${Math.round(
      randomWithin(s, 5)
    )}% ${Math.round(randomWithin(l, 5))}%`;
  });
  return palette;
}
