"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePanel } from "../_components/panel-context";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { ModuleTabs } from "../_components/ui/ModuleTabs";
import { FieldGroup } from "../_components/ui/FieldGroup";
import { PreviewShell } from "../_components/ui/PreviewShell";
import { SaveBar } from "../_components/ui/SaveBar";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { ActionButton } from "../_components/ui/ActionButton";
import { ChecklistItem } from "../_components/ui/ChecklistItem";
import styles from "./settings.module.css";

type Tone = "formal" | "neutral" | "cercano";
type Position = "br" | "bl" | "tr" | "tl";
type TabKey = "general" | "messages" | "branding" | "position" | "embed" | "preview";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DayHours = { open: boolean; from: string; to: string };
type BusinessHours = Record<DayKey, DayHours>;

type EditableSettings = {
  business_id: string;
  widget_enabled: boolean;
  greeting: string;
  assistant_name: string;
  tone: Tone;
  position: Position;
  primary_color: string;
  gradient_from: string;
  gradient_to: string;
  font_family: string;
};

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: true, from: "10:00", to: "18:00" },
  tue: { open: true, from: "10:00", to: "18:00" },
  wed: { open: true, from: "10:00", to: "18:00" },
  thu: { open: true, from: "10:00", to: "18:00" },
  fri: { open: true, from: "10:00", to: "18:00" },
  sat: { open: false, from: "10:00", to: "14:00" },
  sun: { open: false, from: "10:00", to: "14:00" },
};

const DEFAULTS: Omit<EditableSettings, "business_id"> = {
  widget_enabled: true,
  greeting:
    "Bienvenido a **{business}**\n• Respuesta rápida\n• Atención profesional\n\n¿En qué puedo ayudarte hoy?",
  assistant_name: "LumenAI",
  tone: "neutral",
  position: "br",
  primary_color: "#00E5FF",
  gradient_from: "#00E5FF",
  gradient_to: "#6C3BFF",
  font_family: "Inter",
};

const PANEL_THEME_EVENT = "lumen-theme:update";

const TABS = [
  { key: "general", label: "General", description: "Estado y tono" },
  { key: "messages", label: "Mensajes", description: "Saludo inicial" },
  { key: "branding", label: "Branding", description: "Colores y fuente" },
  { key: "position", label: "Posición", description: "Ubicación web" },
  { key: "embed", label: "Embed", description: "Instalación" },
  { key: "preview", label: "Preview", description: "Vista final" },
];

const FONT_PRESETS = [
  { label: "Inter", value: "Inter" },
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { label: "Manrope", value: "Manrope" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Sora", value: "Sora" },
  { label: "Space Grotesk", value: "Space Grotesk" },
  { label: "Poppins", value: "Poppins" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "System", value: "System" },
];

const COLOR_PRESETS = [
  { name: "Lumen Pulse", primary: "#00E5FF", from: "#00E5FF", to: "#1B43FF" },
  { name: "Kodex Earth", primary: "#68A7FF", from: "#102A7A", to: "#00D7FF" },
  { name: "Lunetra Beam", primary: "#8FD8FF", from: "#061423", to: "#3FA9F5" },
  { name: "Black Ice", primary: "#00E5FF", from: "#05070B", to: "#008CFF" },
  { name: "Vision Cobalt", primary: "#008CFF", from: "#008CFF", to: "#1B43FF" },
  { name: "Stripe Violet", primary: "#6C3BFF", from: "#00E5FF", to: "#6C3BFF" },
  { name: "Executive Blue", primary: "#1B43FF", from: "#008CFF", to: "#6C3BFF" },
  { name: "Aurora Night", primary: "#56E1E8", from: "#122D70", to: "#5C58ED" },
];

function clampHex(input: string | undefined | null, fallback: string) {
  const v = String(input ?? "").trim();
  if (!v) return fallback;
  const withHash = v.startsWith("#") ? v : `#${v}`;
  return /^#([0-9a-fA-F]{6})$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function isValidHex(input: string) {
  const v = String(input ?? "").trim();
  const withHash = v.startsWith("#") ? v : `#${v}`;
  return /^#([0-9a-fA-F]{6})$/.test(withHash);
}

function hexToRgbCsv(hex: string, fallback: string) {
  const v = clampHex(hex, fallback).slice(1);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function safeText(input: string | null | undefined, fallback: string) {
  const v = String(input ?? "").trim();
  return v.length ? v : fallback;
}

function fontStack(name: string) {
  const v = String(name ?? "").trim();

  if (!v || v === "System") {
    return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  }

  const needsQuotes = v.includes(" ") && !v.includes('"') && !v.includes("'");
  const family = needsQuotes ? `"${v}"` : v;

  return `${family}, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value, Object.keys(value as object).sort());
  } catch {
    return JSON.stringify(value);
  }
}

function syncPanelTheme(primary: string, secondary?: string) {
  if (typeof window === "undefined") return;

  const nextPrimary = clampHex(primary, DEFAULTS.primary_color);
  const nextSecondary = clampHex(secondary || primary, DEFAULTS.gradient_to);

  window.localStorage.setItem("lmn_theme_primary", nextPrimary);
  window.localStorage.setItem("lmn_theme_secondary", nextSecondary);

  window.localStorage.setItem("panel_primary_color", nextPrimary);
  window.localStorage.setItem("panel_secondary_color", nextSecondary);

  window.localStorage.setItem("widget_primary_color", nextPrimary);
  window.localStorage.setItem("widget_secondary_color", nextSecondary);

  window.dispatchEvent(
    new CustomEvent(PANEL_THEME_EVENT, {
      detail: {
        primary: nextPrimary,
        secondary: nextSecondary,
      },
    })
  );
}

function ensureGoogleFontLoaded(fontFamily: string) {
  const v = String(fontFamily ?? "").trim();
  if (!v || v === "System") return;
  if (typeof document === "undefined") return;

  const familyParam = encodeURIComponent(v.replace(/"/g, ""));
  const id = `gf-${familyParam}`;

  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@300;400;500;600;700;800;900&display=swap`;

  document.head.appendChild(link);
}

function toneLabel(t: Tone) {
  if (t === "formal") return "Formal";
  if (t === "cercano") return "Cercano";
  return "Neutral";
}

function labelPosition(p: Position) {
  if (p === "bl") return "Abajo izquierda";
  if (p === "tr") return "Arriba derecha";
  if (p === "tl") return "Arriba izquierda";
  return "Abajo derecha";
}

function splitGreeting(greeting: string) {
  const raw = String(greeting ?? "").replace(/\r/g, "").trim();
  if (!raw) return { title: "", body: "" };

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    title: lines[0] ?? "",
    body: lines.slice(1).join("\n").trim(),
  };
}

function applyPlaceholders(text: string, vars: Record<string, string>) {
  let out = String(text ?? "");

  Object.entries(vars).forEach(([k, v]) => {
    out = out.replaceAll(`{${k}}`, v);
  });

  return out;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const { businessId, loading } = usePanel();

  const [row, setRow] = useState<EditableSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [bizName, setBizName] = useState("Tu negocio");
  const [bizPublicKey, setBizPublicKey] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);

  const lastSavedRef = useRef("");

  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "general";
    const saved = window.localStorage.getItem("lmn_settings_tab") as TabKey | null;
    return saved && TABS.some((x) => x.key === saved) ? saved : "general";
  });

  const canLoad = useMemo(() => !loading && !!businessId, [loading, businessId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lmn_settings_tab", tab);
  }, [tab]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (!canLoad) return;

    let alive = true;

    async function load() {
      setBusy(true);
      setErr(null);
      setStatus("idle");
      setHydrated(false);
      setDirty(false);

      const { data: bizData } = await supabase
        .from("businesses")
        .select("name,public_key")
        .eq("id", businessId!)
        .maybeSingle();

      if (!alive) return;

      if (bizData?.name) setBizName(String(bizData.name));
      if (bizData?.public_key) setBizPublicKey(String(bizData.public_key));

      const { data, error } = await supabase
        .from("widget_settings")
        .select(
          "business_id,widget_enabled,greeting,assistant_name,tone,position,primary_color,gradient_from,gradient_to,font_family"
        )
        .eq("business_id", businessId!)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setStatus("error");
        setBusy(false);
        return;
      }

      if (!data) {
        const fullInsert = {
          business_id: businessId!,
          ...DEFAULTS,
          whatsapp: null,
          email: null,
          business_hours: DEFAULT_HOURS,
        };

        const { error: insErr } = await supabase.from("widget_settings").insert(fullInsert);

        if (!alive) return;

        if (insErr) {
          setErr(insErr.message);
          setStatus("error");
          setBusy(false);
          return;
        }

        const payload: EditableSettings = { business_id: businessId!, ...DEFAULTS };

        setRow(payload);
        lastSavedRef.current = stableStringify(payload);
        setHydrated(true);
        setStatus("saved");
        setBusy(false);
        return;
      }

      const loaded = data as any;

      const normalized: EditableSettings = {
        business_id: loaded.business_id ?? businessId!,
        widget_enabled: !!loaded.widget_enabled,
        greeting: safeText(loaded.greeting, DEFAULTS.greeting),
        assistant_name: safeText(loaded.assistant_name, DEFAULTS.assistant_name),
        tone: (loaded.tone ?? DEFAULTS.tone) as Tone,
        position: (loaded.position ?? DEFAULTS.position) as Position,
        primary_color: clampHex(loaded.primary_color, DEFAULTS.primary_color),
        gradient_from: clampHex(loaded.gradient_from, DEFAULTS.gradient_from),
        gradient_to: clampHex(loaded.gradient_to, DEFAULTS.gradient_to),
        font_family: safeText(loaded.font_family, DEFAULTS.font_family),
      };

      setRow(normalized);
      lastSavedRef.current = stableStringify(normalized);
      setHydrated(true);
      setStatus("saved");
      setBusy(false);
    }

    void load();

    return () => {
      alive = false;
    };
  }, [canLoad, businessId]);

  useEffect(() => {
    if (!row?.font_family) return;
    ensureGoogleFontLoaded(row.font_family);
  }, [row?.font_family]);

  useEffect(() => {
    if (!row) return;

    const primary = clampHex(row.primary_color, DEFAULTS.primary_color);
    const secondary = clampHex(row.gradient_to || row.gradient_from, DEFAULTS.gradient_to);

    syncPanelTheme(primary, secondary);
  }, [row?.primary_color, row?.gradient_from, row?.gradient_to]);

  useEffect(() => {
    if (!hydrated || !row) {
      setDirty(false);
      return;
    }

    setDirty(stableStringify(row) !== lastSavedRef.current);
  }, [hydrated, row]);

  useEffect(() => {
    if (!hydrated) return;
    if (saving) return;

    if (err) setStatus("error");
    else if (dirty) setStatus("dirty");
    else setStatus("saved");
  }, [hydrated, dirty, saving, err]);

  async function save() {
    if (!row || !businessId) return;

    setSaving(true);
    setStatus("saving");
    setErr(null);

    const payload = {
      widget_enabled: !!row.widget_enabled,
      greeting: safeText(row.greeting, DEFAULTS.greeting),
      assistant_name: safeText(row.assistant_name, DEFAULTS.assistant_name),
      tone: row.tone ?? DEFAULTS.tone,
      position: row.position ?? DEFAULTS.position,
      primary_color: clampHex(row.primary_color, DEFAULTS.primary_color),
      gradient_from: clampHex(row.gradient_from, DEFAULTS.gradient_from),
      gradient_to: clampHex(row.gradient_to, DEFAULTS.gradient_to),
      font_family: safeText(row.font_family, DEFAULTS.font_family),
    };

    const { error } = await supabase
      .from("widget_settings")
      .update(payload)
      .eq("business_id", businessId);

    setSaving(false);

    if (error) {
      setErr(error.message);
      setStatus("error");
      return;
    }

    const next: EditableSettings = { business_id: businessId, ...payload };

    setRow(next);
    lastSavedRef.current = stableStringify(next);
    syncPanelTheme(next.primary_color, next.gradient_to || next.gradient_from);
    setDirty(false);
    setStatus("saved");
    setFlash("Guardado ✅");
  }

  function resetDefaults() {
    if (!row) return;

    const next = {
      ...row,
      ...DEFAULTS,
      business_id: row.business_id,
    };

    setRow(next);
    syncPanelTheme(next.primary_color, next.gradient_to || next.gradient_from);
    setFlash("Defaults aplicados ✨");
  }

  function applyColorPreset(p: (typeof COLOR_PRESETS)[number]) {
    if (!row) return;

    const next = {
      ...row,
      primary_color: p.primary,
      gradient_from: p.from,
      gradient_to: p.to,
    };

    setRow(next);
    syncPanelTheme(next.primary_color, next.gradient_to || next.gradient_from);
  }

  const pv = {
    enabled: row?.widget_enabled ?? DEFAULTS.widget_enabled,
    greeting: row?.greeting ?? DEFAULTS.greeting,
    assistant: row?.assistant_name ?? DEFAULTS.assistant_name,
    tone: row?.tone ?? DEFAULTS.tone,
    pos: row?.position ?? DEFAULTS.position,
    primary: clampHex(row?.primary_color ?? DEFAULTS.primary_color, DEFAULTS.primary_color),
    gFrom: clampHex(row?.gradient_from ?? DEFAULTS.gradient_from, DEFAULTS.gradient_from),
    gTo: clampHex(row?.gradient_to ?? DEFAULTS.gradient_to, DEFAULTS.gradient_to),
    font: row?.font_family ?? DEFAULTS.font_family,
  };

  const cssVars = {
    ["--primary" as any]: pv.primary,
    ["--gFrom" as any]: pv.gFrom,
    ["--gTo" as any]: pv.gTo,
    ["--pRgb" as any]: hexToRgbCsv(pv.primary, DEFAULTS.primary_color),
    ["--gfRgb" as any]: hexToRgbCsv(pv.gFrom, DEFAULTS.gradient_from),
    ["--gtRgb" as any]: hexToRgbCsv(pv.gTo, DEFAULTS.gradient_to),
  };

  const pageFont = fontStack(pv.font);
  const previewUrl = bizPublicKey ? `/widget?key=${bizPublicKey}` : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const embedScript =
    bizPublicKey && origin
      ? `<script src="${origin}/widget.js" data-lumenai-widget="true" data-key="${bizPublicKey}" data-app-url="${origin}"></script>`
      : "";

  const embedIframe =
    bizPublicKey && origin
      ? `<iframe src="${origin}/widget?key=${bizPublicKey}" style="border:0;width:420px;height:640px;border-radius:18px;"></iframe>`
      : "";

  const greetSplit = splitGreeting(pv.greeting);

  const previewGreetingTitle = applyPlaceholders(greetSplit.title, {
    business: bizName || "Tu negocio",
    assistant: pv.assistant || "LumenAI",
  });

  const previewGreetingBody = applyPlaceholders(greetSplit.body, {
    business: bizName || "Tu negocio",
    assistant: pv.assistant || "LumenAI",
  });

  const warnings = useMemo(() => {
    const w: string[] = [];

    if (row) {
      if (!isValidHex(row.primary_color)) w.push("Color principal inválido.");
      if (!isValidHex(row.gradient_from)) w.push("Gradiente inicial inválido.");
      if (!isValidHex(row.gradient_to)) w.push("Gradiente final inválido.");
      if (String(row.greeting || "").length > 260) {
        w.push("Saludo largo: ideal menos de 220 caracteres.");
      }
    }

    return w;
  }, [row]);

  const saveBarVisible = dirty || saving || status === "error";

  if (loading) {
    return (
      <div className={styles.page} style={{ ...cssVars, fontFamily: pageFont }}>
        <PanelSectionHeader
          eyebrow="Settings"
          title="Cargando configuración."
          description="Estamos preparando los ajustes del widget."
          status="Cargando"
          statusTone="muted"
        />
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className={styles.page} style={{ ...cssVars, fontFamily: pageFont }}>
        <PanelSectionHeader
          eyebrow="Settings"
          title="No hay negocio activo."
          description="Completa el onboarding para configurar el widget de LumenAI."
          status="Sin negocio"
          statusTone="warning"
        />
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} ${saveBarVisible ? styles.pageWithBar : ""}`}
      style={{ ...cssVars, fontFamily: pageFont }}
    >
      <PanelSectionHeader
        eyebrow="Configurador visual"
        title="Control del Widget"
        description="Personaliza cómo se ve, saluda y se instala tu asistente en la web del negocio."
        status={
          saving
            ? "Guardando…"
            : status === "dirty"
            ? "Cambios sin guardar"
            : status === "saved"
            ? "Guardado"
            : status === "error"
            ? "Error"
            : "Listo"
        }
        statusTone={status === "error" ? "danger" : status === "dirty" ? "warning" : "active"}
        actionLabel={previewUrl ? "Abrir widget real" : undefined}
        actionHref={previewUrl ?? undefined}
        secondary={
          <StatusBadge tone={pv.enabled ? "active" : "muted"}>
            {pv.enabled ? "Widget activo" : "Widget desactivado"}
          </StatusBadge>
        }
      />

      {err ? (
        <StatusBadge tone="danger" className="w-fit">
          {err}
        </StatusBadge>
      ) : null}

      {flash ? (
        <StatusBadge tone="active" className="w-fit">
          {flash}
        </StatusBadge>
      ) : null}

      <ModuleTabs
        items={TABS}
        value={tab}
        onChange={(next) => setTab(next as TabKey)}
      />

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          {warnings.length ? (
            <FieldGroup title="Revisión rápida" description="Detalles que conviene corregir antes de publicar.">
              {warnings.map((warning) => (
                <ChecklistItem key={warning} label={warning} warning />
              ))}
            </FieldGroup>
          ) : null}

          {tab === "general" ? (
            <FieldGroup
              title="Estado general"
              description="Define si el widget está activo, cómo se llama el asistente y con qué tono responde."
            >
              {busy || !row ? (
                <Skeleton />
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.switchRow}
                    onClick={() => setRow({ ...row, widget_enabled: !row.widget_enabled })}
                    disabled={busy || saving}
                  >
                    <span className={styles.switchLeft}>
                      <span className={styles.switchLabel}>Widget habilitado</span>
                      <span className={styles.switchHint}>
                        Si está apagado, el embed puede ocultarse en la web.
                      </span>
                    </span>

                    <span
                      className={styles.switchTrack}
                      aria-hidden="true"
                      data-on={pv.enabled ? "1" : "0"}
                    >
                      <span className={styles.switchThumb} style={{ left: pv.enabled ? 22 : 3 }} />
                    </span>
                  </button>

                  <div className={styles.row2}>
                    <Field label="Nombre del asistente" hint="Se muestra dentro del widget.">
                      <input
                        className={styles.input}
                        value={row.assistant_name}
                        onChange={(e) => setRow({ ...row, assistant_name: e.target.value })}
                        placeholder={DEFAULTS.assistant_name}
                      />
                    </Field>

                    <Field label="Tono" hint="Personalidad base del asistente.">
                      <div className={styles.segmented}>
                        {(["formal", "neutral", "cercano"] as Tone[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={row.tone === t ? styles.segActive : styles.segBtn}
                            onClick={() => setRow({ ...row, tone: t })}
                          >
                            {toneLabel(t)}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </>
              )}
            </FieldGroup>
          ) : null}

          {tab === "messages" ? (
            <FieldGroup
              title="Mensaje inicial"
              description="Define cómo saluda LumenAI cuando un cliente abre el widget."
              action={
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (!row) return;
                      setRow({
                        ...row,
                        greeting:
                          "Bienvenido a **{business}**\n• Cotiza en 1 minuto\n• Respuesta inmediata\n\n¿Qué necesitas hoy?",
                      });
                    }}
                    disabled={!row || busy || saving}
                  >
                    Template rápido
                  </ActionButton>

                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (!row) return;
                      setRow({
                        ...row,
                        greeting:
                          "Bienvenido a **{business}**\nProductos originales + entrega rápida.\n\n¿Qué te gustaría comprar?",
                      });
                    }}
                    disabled={!row || busy || saving}
                  >
                    Template tienda
                  </ActionButton>
                </div>
              }
            >
              {busy || !row ? (
                <Skeleton />
              ) : (
                <>
                  <Field label="Saludo" hint="Soporta **negrita** y {business}. Primera línea = título.">
                    <textarea
                      className={styles.textarea}
                      value={row.greeting}
                      onChange={(e) => setRow({ ...row, greeting: e.target.value })}
                      placeholder={DEFAULTS.greeting}
                      rows={5}
                    />
                  </Field>

                  <GreetingPreview title={previewGreetingTitle} body={previewGreetingBody} />
                </>
              )}
            </FieldGroup>
          ) : null}

          {tab === "branding" ? (
            <>
              <FieldGroup
                title="Colorimetría"
                description="El color elegido se refleja en el panel, el fondo, los bordes, CTAs y el widget."
              >
                {busy || !row ? (
                  <Skeleton />
                ) : (
                  <GradientStudio
                    row={row}
                    busy={busy}
                    saving={saving}
                    onPatch={(patch) => setRow({ ...row, ...patch })}
                    onPreset={applyColorPreset}
                  />
                )}
              </FieldGroup>

              <FieldGroup title="Tipografía" description="Define la fuente principal del widget y del configurador.">
                {busy || !row ? (
                  <Skeleton />
                ) : (
                  <>
                    <div className={styles.fontGrid}>
                      {FONT_PRESETS.map((f) => {
                        const active = row.font_family === f.value;

                        return (
                          <button
                            key={f.value}
                            type="button"
                            className={active ? styles.fontCardActive : styles.fontCard}
                            onClick={() => setRow({ ...row, font_family: f.value })}
                            disabled={busy || saving}
                          >
                            <div className={styles.fontTop}>
                              <div className={styles.fontName}>{f.label}</div>
                              {active ? <span className={styles.fontTag}>Activa</span> : null}
                            </div>

                            <div style={{ fontFamily: fontStack(f.value) }}>
                              <div className={styles.fontSample}>Aa</div>
                              <div className={styles.fontSmall}>Texto de ejemplo</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <Field label="Fuente personalizada" hint="Se intentará cargar desde Google Fonts.">
                      <input
                        className={styles.input}
                        value={row.font_family}
                        onChange={(e) => setRow({ ...row, font_family: e.target.value })}
                        placeholder={DEFAULTS.font_family}
                        disabled={busy || saving}
                      />
                    </Field>
                  </>
                )}
              </FieldGroup>
            </>
          ) : null}

          {tab === "position" ? (
            <FieldGroup
              title="Posición del widget"
              description="Define la esquina donde aparecerá el widget en la web del cliente."
            >
              {busy || !row ? (
                <Skeleton />
              ) : (
                <PositionPicker value={row.position} onChange={(p) => setRow({ ...row, position: p })} />
              )}
            </FieldGroup>
          ) : null}

          {tab === "embed" ? (
            <FieldGroup
              title="Instalación"
              description="Copia el script y pégalo antes del cierre del body en la web del cliente."
            >
              {!bizPublicKey ? (
                <ChecklistItem
                  label="Falta public_key"
                  description="Define businesses.public_key para generar el embed público."
                  warning
                />
              ) : (
                <>
                  <CodeBlock
                    title="Script recomendado"
                    code={embedScript}
                    onCopy={async () => {
                      const ok = await copyToClipboard(embedScript);
                      setFlash(ok ? "Copiado ✅" : "No se pudo copiar");
                    }}
                  />

                  <CodeBlock
                    title="Fallback iframe"
                    code={embedIframe}
                    onCopy={async () => {
                      const ok = await copyToClipboard(embedIframe);
                      setFlash(ok ? "Copiado ✅" : "No se pudo copiar");
                    }}
                  />
                </>
              )}
            </FieldGroup>
          ) : null}

          {tab === "preview" ? (
            <FieldGroup
              title="Preview avanzado"
              description="Revisa el widget en desktop y mobile antes de publicarlo."
              action={
                <div className="flex gap-2">
                  <ActionButton
                    type="button"
                    variant={previewMode === "desktop" ? "primary" : "secondary"}
                    onClick={() => setPreviewMode("desktop")}
                  >
                    Desktop
                  </ActionButton>

                  <ActionButton
                    type="button"
                    variant={previewMode === "mobile" ? "primary" : "secondary"}
                    onClick={() => setPreviewMode("mobile")}
                  >
                    Mobile
                  </ActionButton>
                </div>
              }
            >
              <RealWidgetPreviewMock
                mode={previewMode}
                businessName={bizName}
                assistantName={pv.assistant}
                greetingTitle={previewGreetingTitle || "Bienvenido"}
                greetingBody={previewGreetingBody || "Escribe aquí el cuerpo del saludo."}
                primary={pv.primary}
                gFrom={pv.gFrom}
                gTo={pv.gTo}
                fontFamily={pv.font}
              />
            </FieldGroup>
          ) : null}
        </div>

        <aside className={styles.rightCol}>
          <PreviewShell
            title="Vista previa"
            description="Simulación visual del widget con los cambios actuales."
            status={pv.enabled ? "Activo" : "Inactivo"}
            actions={
              <>
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={resetDefaults}
                  disabled={!row || busy || saving}
                >
                  Restaurar
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="primary"
                  onClick={() => void save()}
                  disabled={!row || busy || saving || !dirty}
                >
                  Guardar
                </ActionButton>
              </>
            }
          >
            <div className="mb-4 flex gap-2">
              <ActionButton
                type="button"
                variant={previewMode === "desktop" ? "primary" : "secondary"}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </ActionButton>

              <ActionButton
                type="button"
                variant={previewMode === "mobile" ? "primary" : "secondary"}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </ActionButton>
            </div>

            <RealWidgetPreviewMock
              mode={previewMode}
              businessName={bizName}
              assistantName={pv.assistant}
              greetingTitle={previewGreetingTitle || "Bienvenido"}
              greetingBody={previewGreetingBody || "Escribe aquí el cuerpo del saludo."}
              primary={pv.primary}
              gFrom={pv.gFrom}
              gTo={pv.gTo}
              fontFamily={pv.font}
            />
          </PreviewShell>
        </aside>
      </div>

      <SaveBar
        visible={saveBarVisible}
        title={
          status === "error"
            ? "No se pudo guardar"
            : dirty
            ? "Cambios sin guardar"
            : "Configuración lista"
        }
        description={saving ? "No cierres esta pestaña." : "Ctrl/Cmd + S para guardar manualmente."}
        status={saving ? "Guardando…" : status === "dirty" ? "Pendiente" : status === "error" ? "Error" : "Listo"}
        saving={saving}
        primaryLabel="Guardar"
        secondaryLabel="Restaurar"
        onPrimary={() => void save()}
        onSecondary={resetDefaults}
        primaryDisabled={!row || busy || saving || !dirty}
        secondaryDisabled={!row || busy || saving}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <div>
        <div className={styles.label}>{label}</div>
        {hint ? <div className={styles.hint}>{hint}</div> : null}
      </div>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = clampHex(value, "#00E5FF");

  return (
    <label className={styles.field}>
      <div className={styles.label}>{label}</div>

      <div className={styles.colorRow}>
        <div
          className={styles.colorSwatch}
          style={{ background: `linear-gradient(135deg, ${normalized}, ${normalized}AA)` }}
        />

        <input
          className={styles.colorPicker}
          type="color"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
        />

        <input
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={normalized}
        />
      </div>
    </label>
  );
}

function GradientStudio({
  row,
  busy,
  saving,
  onPatch,
  onPreset,
}: {
  row: EditableSettings;
  busy: boolean;
  saving: boolean;
  onPatch: (patch: Partial<EditableSettings>) => void;
  onPreset: (preset: (typeof COLOR_PRESETS)[number]) => void;
}) {
  const primary = clampHex(row.primary_color, DEFAULTS.primary_color);
  const from = clampHex(row.gradient_from, DEFAULTS.gradient_from);
  const to = clampHex(row.gradient_to, DEFAULTS.gradient_to);
  const disabled = busy || saving;

  return (
    <div className={styles.gradientStudio}>
      <div
        className={styles.gradientHero}
        style={{
          ["--studioPrimary" as any]: primary,
          ["--studioFrom" as any]: from,
          ["--studioTo" as any]: to,
        }}
      >
        <div className={styles.gradientAurora} />
        <div className={styles.gradientHeroTop}>
          <span className={styles.gradientKicker}>Lumen color engine</span>
          <span className={styles.gradientHex}>{primary}</span>
        </div>

        <div className={styles.gradientHeroCopy}>
          <h3>Colorimetría del sistema</h3>
          <p>
            Elige una dirección visual para el widget, el fondo y los acentos del panel.
            Negro dominante, azul como guía y blanco para informar.
          </p>
        </div>

        <div className={styles.gradientDeviceRow} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.gradientPresetRail}>
        {COLOR_PRESETS.map((preset) => {
          const active =
            primary === clampHex(preset.primary, DEFAULTS.primary_color) &&
            from === clampHex(preset.from, DEFAULTS.gradient_from) &&
            to === clampHex(preset.to, DEFAULTS.gradient_to);

          return (
            <button
              key={preset.name}
              type="button"
              className={active ? styles.gradientPresetActive : styles.gradientPresetCard}
              onClick={() => onPreset(preset)}
              disabled={disabled}
            >
              <span
                className={styles.gradientPresetVisual}
                style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
              />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.gradientStopGrid}>
        <ColorField
          label="Acento principal"
          value={row.primary_color}
          onChange={(value) => onPatch({ primary_color: value })}
        />
        <ColorField
          label="Luz inicial"
          value={row.gradient_from}
          onChange={(value) => onPatch({ gradient_from: value })}
        />
        <ColorField
          label="Luz final"
          value={row.gradient_to}
          onChange={(value) => onPatch({ gradient_to: value })}
        />
      </div>
    </div>
  );
}

function GreetingPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.greetPreview}>
      <div className={styles.greetTitle}>{title || "Título del saludo"}</div>
      <div className={styles.greetBody}>{body || "Cuerpo del saludo…"}</div>
    </div>
  );
}

function PositionPicker({
  value,
  onChange,
}: {
  value: Position;
  onChange: (position: Position) => void;
}) {
  const Dot = ({ pos, x, y }: { pos: Position; x: string; y: string }) => {
    const active = value === pos;

    return (
      <button
        type="button"
        className={active ? styles.posDotActive : styles.posDot}
        onClick={() => onChange(pos)}
        style={{ left: x, top: y }}
        aria-label={`Posición ${pos}`}
      />
    );
  };

  return (
    <div className={styles.posWrap}>
      <div className={styles.posTop}>
        <div className={styles.posLabel}>Elige la esquina</div>
        <StatusBadge tone="active">{labelPosition(value)}</StatusBadge>
      </div>

      <div className={styles.posBox}>
        <div className={styles.posBg} />
        <Dot pos="tl" x="12%" y="18%" />
        <Dot pos="tr" x="88%" y="18%" />
        <Dot pos="bl" x="12%" y="82%" />
        <Dot pos="br" x="88%" y="82%" />
        <div className={styles.posDash} />
      </div>

      <ChecklistItem
        label="Aplicación real"
        description="El embed lee position desde /api/widget/config."
        done
      />
    </div>
  );
}

function CodeBlock({
  title,
  code,
  onCopy,
}: {
  title: string;
  code: string;
  onCopy: () => void;
}) {
  return (
    <div className={styles.codeBox}>
      <div className={styles.codeTitle}>{title}</div>
      <pre className={styles.codePre}>{code}</pre>

      <ActionButton type="button" variant="primary" onClick={onCopy}>
        Copiar
      </ActionButton>
    </div>
  );
}

function RealWidgetPreviewMock(props: {
  mode: "desktop" | "mobile";
  businessName: string;
  assistantName: string;
  greetingTitle: string;
  greetingBody: string;
  primary: string;
  gFrom: string;
  gTo: string;
  fontFamily: string;
}) {
  const fs = fontStack(props.fontFamily);
  const isMobile = props.mode === "mobile";

  return (
    <div
      className={`${styles.mockWidget} ${isMobile ? styles.mockWidgetMobile : ""}`}
      style={{ fontFamily: fs }}
    >
      <div className={styles.mockHeader}>
        <div className={styles.mockHeaderLeft}>
          <div
            className={styles.mockAvatar}
            style={{ background: `linear-gradient(135deg, ${props.gFrom}, ${props.gTo})` }}
            aria-hidden="true"
          >
            {String(props.businessName || "B").slice(0, 1).toUpperCase()}
          </div>

          <div className={styles.mockTitleWrap}>
            <div className={styles.mockBiz}>{props.businessName}</div>

            <div className={styles.mockMeta}>
              <span
                className={styles.mockDot}
                style={{ background: props.primary, boxShadow: `0 0 16px ${props.primary}55` }}
              />
              <span>Online</span>
              <span className={styles.mockSep}>•</span>
              <span className={styles.mockMuted}>Asistente: {props.assistantName}</span>
            </div>
          </div>
        </div>

        <div className={styles.mockHeaderBtns} aria-hidden="true">
          <span className={styles.mockBtn} />
          <span className={styles.mockBtn} />
          <span className={styles.mockBtn} />
        </div>
      </div>

      <div className={styles.mockBody}>
        <div className={styles.mockRowAs}>
          <div className={styles.mockBubble}>
            <div className={styles.mockRich}>
              <div className={styles.mockH2}>{props.greetingTitle || "Bienvenido"}</div>
              <div className={styles.mockP}>
                {props.greetingBody || "Escribe aquí el cuerpo del saludo."}
              </div>
              <div className={styles.mockQ}>¿En qué te puedo ayudar hoy?</div>
            </div>

            <div className={styles.mockTime}>LumenAI • ahora</div>
          </div>
        </div>

        <div className={styles.mockRowUser}>
          <div className={styles.mockBubbleUser}>
            Hola 👋 quiero cotizar
            <div className={styles.mockTimeRight}>Tú • ahora</div>
          </div>
        </div>

        <div className={styles.mockRowAs}>
          <div className={styles.mockBubble}>
            <div className={styles.mockRich}>
              <div className={styles.mockH3}>Opciones</div>
              <div className={styles.mockP}>
                - Ideal: <b>Premium</b>
              </div>
              <div className={styles.mockP}>
                - Económica: <b>Básica</b>
              </div>
              <div className={styles.mockQ}>¿Para qué servicio sería?</div>
            </div>

            <div className={styles.mockTime}>LumenAI • ahora</div>
          </div>
        </div>
      </div>

      <div className={styles.mockFooter}>
        <div className={styles.mockInput} aria-hidden="true" />

        <button
          type="button"
          className={styles.mockSend}
          style={{ background: `linear-gradient(135deg, ${props.gFrom}, ${props.gTo})` }}
          aria-label="Enviar"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skLine} />
      <div className={styles.skLine2} />
      <div className={styles.skLine} />
      <div className={styles.skLine3} />
    </div>
  );
}
