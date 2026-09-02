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
import { DEFAULT_INTERFACE_PREFERENCES } from "@/lib/interface-preferences";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { LUMEN_OPERATORS, type OperatorId } from "@/lib/operators/catalog";
import { PANEL_OPERATOR_EVENT } from "../_components/panel-context";

type ColorPreset = {
  name: string;
  primary: string;
  secondary: string;
  note: string;
};

const DEFAULT_THEME: PanelThemeColors = DEFAULT_INTERFACE_PREFERENCES.theme;

const PANEL_THEME_VERSION = "lumenai-interface-v1-20260902";

const PRESETS: ColorPreset[] = [
  {
    name: "Lumen Electric",
    primary: "#00e5ff",
    secondary: "#1b43ff",
    note: "Identidad oficial: cian eléctrico, azul profundo y contraste ejecutivo.",
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [motion, setMotion] = useState<"full" | "reduced">("full");
  const [operatorId, setOperatorId] = useState<OperatorId>(DEFAULT_INTERFACE_PREFERENCES.operatorId);

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

    void fetch("/api/panel/interface", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.preferences) return;
        const preferences = payload.preferences;
        setBase(preferences.theme.base);
        setPrimary(preferences.theme.primary);
        setSecondary(preferences.theme.secondary);
        setMode(preferences.theme.mode === "light" ? "light" : "dark");
        setDensity(preferences.density === "compact" ? "compact" : "comfortable");
        setMotion(preferences.motion === "reduced" ? "reduced" : "full");
        setOperatorId(preferences.operatorId || DEFAULT_INTERFACE_PREFERENCES.operatorId);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    applyPanelThemeToRoot(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.lumenDensity = density;
    document.documentElement.dataset.lumenMotion = motion;
  }, [density, motion]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PANEL_OPERATOR_EVENT, { detail: { operatorId } }));
  }, [operatorId]);

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
      const isDefaultDark = safeCurrent === "#000000" || safeCurrent === DEFAULT_THEME.base;
      const isDefaultLight = safeCurrent === "#f6f7fb";

      if (nextMode === "light" && isDefaultDark) return "#f6f7fb";
      if (nextMode === "dark" && isDefaultLight) return DEFAULT_THEME.base || "#05070b";

      return safeCurrent;
    });
  }

  async function saveTheme() {
    setSaving(true);
    setError(null);
    savePanelThemeToStorage(theme);
    emitPanelThemeChange(theme);
    window.localStorage.setItem("lmn_theme_version", PANEL_THEME_VERSION);
    try {
      const response = await fetch("/api/panel/interface", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, density, motion, operatorId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No se pudo guardar Interface.");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar Interface.");
    } finally {
      setSaving(false);
    }
  }

  function resetTheme() {
    setBase(DEFAULT_THEME.base || "#000000");
    setPrimary(DEFAULT_THEME.primary);
    setSecondary(DEFAULT_THEME.secondary);
    setMixAmount(42);
    setMode("dark");
    setDensity(DEFAULT_INTERFACE_PREFERENCES.density);
    setMotion(DEFAULT_INTERFACE_PREFERENCES.motion);
    setOperatorId(DEFAULT_INTERFACE_PREFERENCES.operatorId);
    savePanelThemeToStorage(DEFAULT_THEME);
    emitPanelThemeChange(DEFAULT_THEME);
    window.localStorage.setItem("lmn_theme_version", PANEL_THEME_VERSION);
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
        eyebrow="LumenAI Personal Workspace"
        title="Interface"
        description="Personaliza la experiencia del propietario dentro del Design System. Estos cambios nunca modifican el Widget que ven tus clientes."
        status={saving ? "Guardando" : saved ? "Interface guardada" : "Vista en vivo"}
        statusTone={error ? "warning" : "active"}
        secondary={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={mode === "light" ? "muted" : "active"}>
              {mode === "light" ? "Modo blanco" : "Modo negro"}
            </StatusBadge>
            <StatusBadge tone="muted">Solo tu workspace</StatusBadge>
          </div>
        }
      />

      <section className="lmn-color-mix-hero">
        <div className="lmn-color-mix-copy">
          <div className="lmn-color-mix-kicker">
            <Sparkles className="h-3.5 w-3.5" />
            Live palette engine
          </div>
          <h2>Tu espacio. Una identidad consistente.</h2>
          <p>
            Ajusta fondo, acentos, estados y modo visual del panel. La identidad
            orientada al cliente se administra exclusivamente desde Widget.
          </p>
          <div className="lmn-color-mix-actions">
            <ActionButton type="button" variant="primary" onClick={() => void saveTheme()} disabled={saving}>
              <Check className="h-3.5 w-3.5" />
              {saving ? "Guardando..." : "Guardar Interface"}
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
              <h3>Identidad del workspace</h3>
              <p>Cambia los colores y ajusta la relación entre ambas luces.</p>
            </div>
            <StatusBadge tone="active">{bridge}</StatusBadge>
          </div>

          <div className="lmn-color-mix-fields">
            <ColorInput label="Fondo del panel" value={theme.base || base} onChange={setBase} />
            <ColorInput label="Luz primaria" value={primary} onChange={setPrimary} />
            <ColorInput label="Luz secundaria" value={secondary} onChange={setSecondary} />
          </div>

          <label className="lmn-color-mix-slider">
            <span>Balance de acentos</span>
            <input
              type="range"
              aria-label="Balance de acentos"
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

          <div className="mt-6 grid gap-5 border-t border-white/10 pt-5">
            <div>
              <h3>Operador personal</h3>
              <p>Acompaña tu workspace y Pulse. El operador público se elige por separado en Widget.</p>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {LUMEN_OPERATORS.map((operator) => (
                  <button
                    key={operator.id}
                    type="button"
                    aria-label={`Elegir ${operator.name}`}
                    aria-pressed={operatorId === operator.id}
                    className={`grid place-items-center rounded-2xl border p-2 transition ${operatorId === operator.id ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[.02] hover:border-white/25"}`}
                    onClick={() => setOperatorId(operator.id)}
                  >
                    <OperatorAvatar operator={operator.id} mood="welcome" size={46} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3>Densidad</h3>
              <p>Controla cuánto contenido cabe en el espacio de trabajo.</p>
              <div className="lmn-color-mix-mode mt-3">
                <button type="button" className={density === "comfortable" ? "is-active" : undefined} onClick={() => setDensity("comfortable")}>Cómoda</button>
                <button type="button" className={density === "compact" ? "is-active" : undefined} onClick={() => setDensity("compact")}>Compacta</button>
              </div>
            </div>
            <div>
              <h3>Movimiento</h3>
              <p>Ajusta la expresividad de transiciones y señales.</p>
              <div className="lmn-color-mix-mode mt-3">
                <button type="button" className={motion === "full" ? "is-active" : undefined} onClick={() => setMotion("full")}>Dinámico</button>
                <button type="button" className={motion === "reduced" ? "is-active" : undefined} onClick={() => setMotion("reduced")}>Reducido</button>
              </div>
            </div>
          </div>
        </article>
      </section>
      {error ? <div className="lmn-autoconfig-error" role="alert">{error}</div> : null}
    </div>
  );
}
