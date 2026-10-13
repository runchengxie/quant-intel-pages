export const THEMES = ["system", "light", "dark"] as const;
export type Theme = typeof THEMES[number];
export function normalizeTheme(value: unknown): Theme {
  return value === 'system' || value === 'light' || value === 'dark' ? value : 'system';
}
export function nextTheme(value: unknown): Theme {
  const current = normalizeTheme(value);
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}
export function applyTheme(value: unknown, root: HTMLElement = document.documentElement): Theme {
  const theme = normalizeTheme(value);
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'system' ? 'light dark' : theme;
  return theme;
}
