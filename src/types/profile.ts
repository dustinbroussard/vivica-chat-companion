export type ThemeVariant = 'dark' | 'light';
export type ThemeColor =
  | 'default'
  | 'blue'
  | 'red'
  | 'green'
  | 'purple'
  | 'mardi-gold'
  | 'mardi-gras';

export interface Profile {
  id: string;
  name: string;
  model: string;
  codeModel?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isVivica?: boolean;
  useProfileTheme?: boolean;
  themeColor?: ThemeColor;
  themeVariant?: ThemeVariant;
}
