export type PanelThemeColors = {
  base?: string;
  primary: string;
  secondary: string;
  mode?: "light" | "dark" | "system";
};

export const PANEL_THEME_EVENT = "lumen-theme:update";

const DEFAULT_BASE = "#05080d";
const DEFAULT_PRIMARY = "#1477ff";
const DEFAULT_SECONDARY = "#72baff";

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
  const base = normalizeHex(input?.base) || DEFAULT_BASE;
  const primary = normalizeHex(input?.primary) || DEFAULT_PRIMARY;
  const secondary = normalizeHex(input?.secondary) || DEFAULT_SECONDARY;
  const mode =
    input?.mode === "light" || input?.mode === "dark" || input?.mode === "system"
      ? input.mode
      : "dark";

  return { base, primary, secondary, mode };
}

export function applyPanelThemeToRoot(input?: Partial<PanelThemeColors>) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const theme = getSafePanelTheme(input);

  const baseRgb = hexToRgbString(theme.base) || "5, 8, 13";
  const primaryRgb = hexToRgbString(theme.primary) || "20, 119, 255";
  const secondaryRgb = hexToRgbString(theme.secondary) || "114, 186, 255";
  const resolvedMode =
    theme.mode === "system"
      ? window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme.mode || "dark";

  root.style.setProperty("--lmn-bg-custom", theme.base || DEFAULT_BASE);
  root.style.setProperty("--lmn-bg-custom-rgb", baseRgb);
  root.style.setProperty("--lmn-accent", theme.primary);
  root.style.setProperty("--lmn-accent-2", theme.secondary);
  root.style.setProperty("--lmn-accent-rgb", primaryRgb);
  root.style.setProperty("--lmn-accent-2-rgb", secondaryRgb);
  root.dataset.lmnTheme = resolvedMode;
  root.dataset.theme = resolvedMode;
  root.classList.toggle("lmn-theme-light", resolvedMode === "light");
  root.classList.toggle("lmn-theme-dark", resolvedMode !== "light");
  root.classList.toggle("dark", resolvedMode !== "light");
}

export function savePanelThemeToStorage(input?: Partial<PanelThemeColors>) {
  if (typeof window === "undefined") return;

  const theme = getSafePanelTheme(input);
  window.localStorage.setItem("lmn_theme_base", theme.base || DEFAULT_BASE);
  window.localStorage.setItem("lmn_theme_primary", theme.primary);
  window.localStorage.setItem("lmn_theme_secondary", theme.secondary);
  window.localStorage.setItem("lmn_theme_mode", theme.mode || "dark");
}

export function readPanelThemeFromStorage(): PanelThemeColors | null {
  if (typeof window === "undefined") return null;

  const base = window.localStorage.getItem("lmn_theme_base");
  const primary = window.localStorage.getItem("lmn_theme_primary");
  const secondary = window.localStorage.getItem("lmn_theme_secondary");
  const mode = window.localStorage.getItem("lmn_theme_mode");

  if (!base && !primary && !secondary && !mode) return null;

  return getSafePanelTheme({
    base: base || undefined,
    primary: primary || undefined,
    secondary: secondary || undefined,
    mode:
      mode === "light" || mode === "dark" || mode === "system"
        ? mode
        : undefined,
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
