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
  /** The mode this theme wants to be met in — Tahitian and South Sea read
   *  dark-first, Pearl and Freshwater light-first. Picking a theme snaps the
   *  mode to this; toggling the mode afterwards still overrides freely.
   *  Mirrors the Storybook registry in the Pearl repo. */
  defaultMode: ThemeMode;
}

export const THEMES: Record<ThemeName, ThemeEntry> = {
  pearl: { label: 'Pearl', light: pearlLightThemeClass, dark: pearlDarkThemeClass, extension: pearlExtensionClass, defaultMode: 'light' },
  tahitian: { label: 'Tahitian', light: tahitianLightThemeClass, dark: tahitianDarkThemeClass, extension: tahitianExtensionClass, defaultMode: 'dark' },
  freshwater: { label: 'Freshwater', light: freshwaterLightThemeClass, dark: freshwaterDarkThemeClass, defaultMode: 'light' },
  'south-sea': { label: 'South Sea', light: southSeaLightThemeClass, dark: southSeaDarkThemeClass, defaultMode: 'dark' },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export function themeClassName(name: ThemeName, mode: ThemeMode): string {
  const entry = THEMES[name];
  const base = mode === 'dark' ? entry.dark : entry.light;
  return entry.extension ? `${base} ${entry.extension}` : base;
}
