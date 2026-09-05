import {
  pearlLightThemeClass,
  pearlDarkThemeClass,
  pearlExtensionClass,
  tahitianLightThemeClass,
  tahitianDarkThemeClass,
  tahitianExtensionClass,
  freshwaterLightThemeClass,
  freshwaterDarkThemeClass,
  southSeaLightThemeClass,
  southSeaDarkThemeClass,
} from '@msanagu/pearl';

export type ThemeName = 'pearl' | 'tahitian' | 'freshwater' | 'south-sea';
export type ThemeMode = 'light' | 'dark';

interface ThemeEntry {
  label: string;
  light: string;
  dark: string;
  /** Only Pearl and Tahitian have a luster/overtone extension class — the other two don't export one. */
  extension?: string;
}

export const THEMES: Record<ThemeName, ThemeEntry> = {
  pearl: { label: 'Pearl', light: pearlLightThemeClass, dark: pearlDarkThemeClass, extension: pearlExtensionClass },
  tahitian: { label: 'Tahitian', light: tahitianLightThemeClass, dark: tahitianDarkThemeClass, extension: tahitianExtensionClass },
  freshwater: { label: 'Freshwater', light: freshwaterLightThemeClass, dark: freshwaterDarkThemeClass },
  'south-sea': { label: 'South Sea', light: southSeaLightThemeClass, dark: southSeaDarkThemeClass },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

/**
 * Light/dark follows the user, never the theme. The initial mode is read
 * from the OS `prefers-color-scheme` once at startup; after that only a
 * manual toggle changes it. Switching themes keeps whatever mode the user
 * is in — no theme carries its own default mode.
 */
export function systemMode(): ThemeMode {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function themeClassName(name: ThemeName, mode: ThemeMode): string {
  const entry = THEMES[name];
  const base = mode === 'dark' ? entry.dark : entry.light;
  return entry.extension ? `${base} ${entry.extension}` : base;
}
