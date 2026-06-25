export type PanelThemeColors = {
  primary: string;
  secondary: string;
};

export const PANEL_THEME_EVENT = "lumen-theme:update";

const DEFAULT_PRIMARY = "#00E5FF";
const DEFAULT_SECONDARY = "#1B43FF";

function normalizeHex(hex?: string) {
  if (!hex) return null;

  let value = hex.trim().replace("#", "");

  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return `#${value.toLowerCase()}`;
}

function hexToRgbString(hex?: string) {
  const safe = normalizeHex(hex);
  if (!safe) return null;

  const value = safe.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

export function getSafePanelTheme(input?: Partial<PanelThemeColors>): PanelThemeColors {
  const primary = normalizeHex(input?.primary) || DEFAULT_PRIMARY;
  const secondary = normalizeHex(input?.secondary) || DEFAULT_SECONDARY;

  return { primary, secondary };
}

export function applyPanelThemeToRoot(input?: Partial<PanelThemeColors>) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const theme = getSafePanelTheme(input);

  const primaryRgb = hexToRgbString(theme.primary) || "0, 229, 255";
  const secondaryRgb = hexToRgbString(theme.secondary) || "27, 67, 255";

  root.style.setProperty("--lmn-accent", theme.primary);
  root.style.setProperty("--lmn-accent-2", theme.secondary);
  root.style.setProperty("--lmn-accent-rgb", primaryRgb);
  root.style.setProperty("--lmn-accent-2-rgb", secondaryRgb);
}

export function savePanelThemeToStorage(input?: Partial<PanelThemeColors>) {
  if (typeof window === "undefined") return;

  const theme = getSafePanelTheme(input);
  window.localStorage.setItem("lmn_theme_primary", theme.primary);
  window.localStorage.setItem("lmn_theme_secondary", theme.secondary);
}

export function readPanelThemeFromStorage(): PanelThemeColors | null {
  if (typeof window === "undefined") return null;

  const primary = window.localStorage.getItem("lmn_theme_primary");
  const secondary = window.localStorage.getItem("lmn_theme_secondary");

  if (!primary && !secondary) return null;

  return getSafePanelTheme({
    primary: primary || undefined,
    secondary: secondary || undefined,
  });
}

export function emitPanelThemeChange(input?: Partial<PanelThemeColors>) {
  if (typeof window === "undefined") return;

  const theme = getSafePanelTheme(input);

  window.dispatchEvent(
    new CustomEvent<PanelThemeColors>(PANEL_THEME_EVENT, {
      detail: theme,
    })
  );
}
