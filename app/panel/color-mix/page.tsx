"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Copy, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import {
  applyPanelThemeToRoot,
  emitPanelThemeChange,
  readPanelThemeFromStorage,
  savePanelThemeToStorage,
  type PanelThemeColors,
} from "@/lib/panel-theme";
import { ActionButton } from "../_components/ui/ActionButton";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { supabase } from "@/lib/supabase/client";

type ColorPreset = {
  name: string;
  primary: string;
  secondary: string;
  note: string;
};

const DEFAULT_THEME: PanelThemeColors = {
  base: "#000000",
  primary: "#c7ff3d",
  secondary: "#725cff",
  mode: "dark",
};

const PANEL_THEME_VERSION = "lumenai-premium-blue-20260705";

const PRESETS: ColorPreset[] = [
  {
    name: "Lime Orbit",
    primary: "#c7ff3d",
    secondary: "#725cff",
    note: "Negro editorial con luz lime y profundidad violeta.",
  },
  {
    name: "Clinical Mint",
    primary: "#b8ff4f",
    secondary: "#8fe7c8",
    note: "Mas limpio, cercano a dashboards health premium.",
  },
  {
    name: "Obsidian Blue",
    primary: "#82b7ff",
    secondary: "#395cff",
    note: "Tecnico, frio y muy legible para sistemas operativos.",
  },
  {
    name: "Soft Pulse",
    primary: "#f2a2ff",
    secondary: "#5f6bff",
    note: "Violeta medido para secciones de IA y analisis.",
  },
];

function normalizeHex(value: string, fallback: string) {
  const raw = String(value || "").trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#([0-9a-fA-F]{6})$/.test(withHash)
    ? withHash.toLowerCase()
    : fallback.toLowerCase();
}

function hexToRgb(hex: string) {
  const safe = normalizeHex(hex, "#000000").slice(1);

  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(a: string, b: string, amount: number) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const t = Math.max(0, Math.min(100, amount)) / 100;

  return rgbToHex(
    left.r + (right.r - left.r) * t,
    left.g + (right.g - left.g) * t,
    left.b + (right.b - left.b) * t
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="lmn-color-mix-field">
      <span>{label}</span>
      <div>
        <input
          type="color"
          value={normalizeHex(value, "#000000")}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-label={`${label} en formato hexadecimal`}
        />
      </div>
    </label>
  );
}

export default function ColorMixPage() {
  const [base, setBase] = useState(DEFAULT_THEME.base || "#000000");
  const [primary, setPrimary] = useState(DEFAULT_THEME.primary);
  const [secondary, setSecondary] = useState(DEFAULT_THEME.secondary);
  const [mixAmount, setMixAmount] = useState(42);
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [widgetSynced, setWidgetSynced] = useState(false);
  const [syncingWidget, setSyncingWidget] = useState(false);

  const bridge = useMemo(
    () => mixHex(primary, secondary, mixAmount),
    [primary, secondary, mixAmount]
  );

  const theme = useMemo<PanelThemeColors>(
    () => ({
      base: normalizeHex(base, mode === "light" ? "#f6f7fb" : "#000000"),
      primary: normalizeHex(primary, DEFAULT_THEME.primary),
      secondary: normalizeHex(secondary, DEFAULT_THEME.secondary),
      mode,
    }),
    [base, mode, primary, secondary]
  );

  useEffect(() => {
    const stored = readPanelThemeFromStorage();

    if (stored) {
      setBase(stored.base || (stored.mode === "light" ? "#f6f7fb" : DEFAULT_THEME.base || "#000000"));
      setPrimary(stored.primary || DEFAULT_THEME.primary);
      setSecondary(stored.secondary || DEFAULT_THEME.secondary);
      setMode(stored.mode === "light" ? "light" : "dark");
    }
  }, []);

  useEffect(() => {
    applyPanelThemeToRoot(theme);
  }, [theme]);

  async function copyVars() {
    const value = [
      `--lmn-accent: ${theme.primary};`,
      `--lmn-accent-2: ${theme.secondary};`,
      `--lmn-mix-bridge: ${bridge};`,
      `--lmn-bg-custom: ${theme.base};`,
      `data-lmn-theme="${theme.mode}"`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  }

  function applyPreset(preset: ColorPreset) {
    setPrimary(preset.primary);
    setSecondary(preset.secondary);
  }

  function setVisualMode(nextMode: "dark" | "light") {
    setMode(nextMode);
    setBase((current) => {
      const safeCurrent = normalizeHex(current, nextMode === "light" ? "#f6f7fb" : "#000000");
      const isDefaultDark = safeCurrent === "#000000";
      const isDefaultLight = safeCurrent === "#f6f7fb";

      if (nextMode === "light" && isDefaultDark) return "#f6f7fb";
      if (nextMode === "dark" && isDefaultLight) return "#000000";

      return safeCurrent;
    });
  }

  async function syncWidgetTheme() {
    setSyncingWidget(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const headers = new Headers({ "Content-Type": "application/json" });

      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch("/api/panel/widget", {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          primaryColor: theme.primary,
          gradientFrom: theme.primary,
          gradientTo: theme.secondary,
        }),
      });

      setWidgetSynced(res.ok);
      window.setTimeout(() => setWidgetSynced(false), 1800);
    } catch {
      setWidgetSynced(false);
    } finally {
      setSyncingWidget(false);
    }
  }

  async function saveTheme() {
    savePanelThemeToStorage(theme);
    emitPanelThemeChange(theme);
    window.localStorage.setItem("lmn_theme_version", PANEL_THEME_VERSION);
    window.localStorage.setItem(
      "lmn_widget_theme",
      JSON.stringify({
        primaryColor: theme.primary,
        gradientFrom: theme.primary,
        gradientTo: theme.secondary,
        mode: theme.mode,
        bridge,
      })
    );
    setSaved(true);
    setWidgetSynced(true);
    window.setTimeout(() => setSaved(false), 1400);
    await syncWidgetTheme();
  }

  function resetTheme() {
    setBase(DEFAULT_THEME.base || "#000000");
    setPrimary(DEFAULT_THEME.primary);
    setSecondary(DEFAULT_THEME.secondary);
    setMixAmount(42);
    setMode("dark");
    savePanelThemeToStorage(DEFAULT_THEME);
    emitPanelThemeChange(DEFAULT_THEME);
    window.localStorage.setItem("lmn_theme_version", PANEL_THEME_VERSION);
    window.localStorage.removeItem("lmn_widget_theme");
  }

  return (
    <div
      className="lmn-module-page lmn-color-mix-page"
      style={
        {
          "--mix-base": theme.base,
          "--mix-primary": theme.primary,
          "--mix-secondary": theme.secondary,
          "--mix-bridge": bridge,
        } as CSSProperties
      }
    >
      <PanelSectionHeader
        variant="hero"
        eyebrow="Sistema visual"
        title="Color Mix"
        description="Mezcla las luces principales del panel y aplica un sistema de color coherente en todas las secciones de LumenAI."
        status={saved ? "Tema guardado" : "Vista en vivo"}
        statusTone="active"
        secondary={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={mode === "light" ? "muted" : "active"}>
              {mode === "light" ? "Modo blanco" : "Modo negro"}
            </StatusBadge>
            {widgetSynced ? <StatusBadge tone="active">Widget sincronizado</StatusBadge> : null}
          </div>
        }
      />

      <section className="lmn-color-mix-hero">
        <div className="lmn-color-mix-copy">
          <div className="lmn-color-mix-kicker">
            <Sparkles className="h-3.5 w-3.5" />
            Live palette engine
          </div>
          <h2>Dos luces, un sistema visual.</h2>
          <p>
            El panel conserva el fondo negro y solo cambia la energia visual:
            acentos, botones, estados, luces de cards y elementos activos.
          </p>
          <div className="lmn-color-mix-actions">
            <ActionButton type="button" variant="primary" onClick={() => void saveTheme()}>
              <Check className="h-3.5 w-3.5" />
              Guardar mezcla
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => void syncWidgetTheme()}
              disabled={syncingWidget}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {syncingWidget ? "Aplicando..." : "Aplicar al widget"}
            </ActionButton>
            <ActionButton type="button" variant="secondary" onClick={copyVars}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copiado" : "Copiar variables"}
            </ActionButton>
            <ActionButton type="button" variant="secondary" onClick={resetTheme}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => setVisualMode(mode === "light" ? "dark" : "light")}
            >
              {mode === "light" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
              {mode === "light" ? "Modo negro" : "Modo blanco"}
            </ActionButton>
          </div>
        </div>

        <div className="lmn-color-mix-stage" aria-hidden="true">
          <span className="lmn-color-mix-light is-primary" />
          <span className="lmn-color-mix-light is-secondary" />
          <div className="lmn-color-mix-card">
            <small>Preview</small>
            <strong>{bridge}</strong>
            <i />
          </div>
        </div>
      </section>

      <section className="lmn-color-mix-grid">
        <article className="lmn-color-mix-panel">
          <div className="lmn-color-mix-panel-head">
            <div>
              <h3>Mezcla manual</h3>
              <p>Cambia los colores y ajusta el punto medio de la luz.</p>
            </div>
            <StatusBadge tone="active">{bridge}</StatusBadge>
          </div>

          <div className="lmn-color-mix-fields">
            <ColorInput label="Fondo del panel" value={theme.base || base} onChange={setBase} />
            <ColorInput label="Luz primaria" value={primary} onChange={setPrimary} />
            <ColorInput label="Luz secundaria" value={secondary} onChange={setSecondary} />
          </div>

          <label className="lmn-color-mix-slider">
            <span>Balance de mezcla</span>
            <input
              type="range"
              aria-label="Balance de mezcla"
              aria-valuetext={`${mixAmount}%`}
              min="0"
              max="100"
              value={mixAmount}
              onChange={(event) => setMixAmount(Number(event.target.value))}
            />
            <b>{mixAmount}%</b>
          </label>

          <div className="lmn-color-mix-strip">
            <span style={{ background: theme.primary }} />
            <span style={{ background: bridge }} />
            <span style={{ background: theme.secondary }} />
          </div>

          <div className="lmn-color-mix-mode">
            <button
              type="button"
              className={mode === "dark" ? "is-active" : undefined}
              onClick={() => setVisualMode("dark")}
            >
              <Moon className="h-4 w-4" />
              Negro obsidiana
            </button>
            <button
              type="button"
              className={mode === "light" ? "is-active" : undefined}
              onClick={() => setVisualMode("light")}
            >
              <Sun className="h-4 w-4" />
              Blanco premium
            </button>
          </div>
        </article>

        <article className="lmn-color-mix-panel">
          <div className="lmn-color-mix-panel-head">
            <div>
              <h3>Presets premium</h3>
              <p>Variantes sobrias para mantener el sistema profesional.</p>
            </div>
          </div>

          <div className="lmn-color-mix-presets">
            {PRESETS.map((preset) => {
              const active =
                normalizeHex(primary, DEFAULT_THEME.primary) === normalizeHex(preset.primary, DEFAULT_THEME.primary) &&
                normalizeHex(secondary, DEFAULT_THEME.secondary) === normalizeHex(preset.secondary, DEFAULT_THEME.secondary);

              return (
                <button
                  key={preset.name}
                  type="button"
                  className={active ? "is-active" : undefined}
                  onClick={() => applyPreset(preset)}
                >
                  <i style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }} />
                  <strong>{preset.name}</strong>
                  <span>{preset.note}</span>
                </button>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
