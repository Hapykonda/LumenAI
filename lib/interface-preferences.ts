import type { PanelThemeColors } from "@/lib/panel-theme";
import { normalizeOperatorId, type OperatorId } from "@/lib/operators/catalog";

export type InterfacePreferences = {
  theme: PanelThemeColors;
  density: "comfortable" | "compact";
  motion: "full" | "reduced";
  operatorId: OperatorId;
};

export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = {
  theme: {
    base: "#05080d",
    primary: "#1477ff",
    secondary: "#72baff",
    mode: "dark",
  },
  density: "comfortable",
  motion: "full",
  operatorId: "pulse",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function color(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : fallback;
}

export function normalizeInterfacePreferences(value: unknown): InterfacePreferences {
  const source = record(value);
  const theme = record(source.theme);
  return {
    theme: {
      base: color(theme.base, DEFAULT_INTERFACE_PREFERENCES.theme.base || "#05080d"),
      primary: color(theme.primary, DEFAULT_INTERFACE_PREFERENCES.theme.primary),
      secondary: color(theme.secondary, DEFAULT_INTERFACE_PREFERENCES.theme.secondary),
      mode: theme.mode === "light" ? "light" : "dark",
    },
    density: source.density === "compact" ? "compact" : "comfortable",
    motion: source.motion === "reduced" ? "reduced" : "full",
    operatorId: normalizeOperatorId(source.operatorId),
  };
}
