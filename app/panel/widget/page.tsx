"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Globe2,
  ImageIcon,
  MonitorSmartphone,
  Power,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type Position = "br" | "bl" | "tr" | "tl";

type WidgetPanelData = {
  ok?: boolean;
  error?: string;
  business?: {
    id: string;
    name: string;
    public_key: string | null;
    install_key: string;
  };
  widget?: {
    enabled: boolean;
    position: Position;
    assistantName: string;
    greeting: string;
    whatsapp: string;
    email: string;
    avatarUrl: string;
    brandLogoUrl: string;
    primaryColor: string;
    gradientFrom: string;
    gradientTo: string;
    updatedAt: string | null;
    publishedAt: string | null;
  };
};

const POSITION_LABELS: Record<Position, string> = {
  br: "Abajo derecha",
  bl: "Abajo izquierda",
  tr: "Arriba derecha",
  tl: "Arriba izquierda",
};

async function apiFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(path, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

export default function PanelWidgetPage() {
  const [data, setData] = useState<WidgetPanelData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const [logoInput, setLogoInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const business = data?.business ?? null;
  const widget = data?.widget ?? null;

  const installKey = business?.install_key ?? "";
  const appUrl = origin || "http://localhost:3000";
  const position = widget?.position ?? "br";

  const directWidgetUrl = useMemo(() => {
    if (!installKey) return "";
    return `${appUrl}/widget?key=${encodeURIComponent(installKey)}&preview=1`;
  }, [appUrl, installKey]);

  const embedCode = useMemo(() => {
    if (!installKey) return "";

    return `<script
  src="${appUrl}/widget.js"
  data-key="${installKey}"
  data-app-url="${appUrl}"
  data-position="${position}"
  async
></script>`;
  }, [appUrl, installKey, position]);

  const testHtml = useMemo(() => {
    if (!embedCode) return "";

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Prueba LumenAI</title>
  </head>
  <body>
    <h1>Mi web externa</h1>
    <p>El widget de LumenAI aparece en la esquina seleccionada.</p>

    ${embedCode}
  </body>
</html>`;
  }, [embedCode]);

  async function copy(text: string, label = "Copiado ✅") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1300);
    } catch {
      setCopied("No se pudo copiar");
      window.setTimeout(() => setCopied(null), 1300);
    }
  }

  async function loadWidget() {
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch("/api/panel/widget", {
        method: "GET",
      });

      const json = (await res.json().catch(() => ({}))) as WidgetPanelData;

      if (!res.ok || json.ok === false) {
        setErr(json.error || "No se pudo cargar Widget.");
        setData(null);
        return;
      }

      setData(json);
    } catch {
      setErr("No se pudo conectar con /api/panel/widget.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function patchWidget(payload: Record<string, unknown>) {
    if (saving) return;

    setSaving(true);
    setErr(null);

    const previous = data;

    setData((prev) => {
      if (!prev?.widget) return prev;

      return {
        ...prev,
        widget: {
          ...prev.widget,
          ...(payload.widgetEnabled !== undefined
            ? { enabled: Boolean(payload.widgetEnabled) }
            : {}),
          ...(payload.position !== undefined
            ? { position: payload.position as Position }
            : {}),
          ...(payload.avatarUrl !== undefined
            ? { avatarUrl: String(payload.avatarUrl ?? "") }
            : {}),
          ...(payload.brandLogoUrl !== undefined
            ? { brandLogoUrl: String(payload.brandLogoUrl ?? "") }
            : {}),
        },
      };
    });

    try {
      const res = await apiFetch("/api/panel/widget", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as WidgetPanelData;

      if (!res.ok || json.ok === false) {
        setData(previous);
        setErr(json.error || "No se pudo guardar Widget.");
        return;
      }

      setData(json);
    } catch {
      setData(previous);
      setErr("No se pudo conectar para guardar Widget.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadWidget();
  }, []);

  useEffect(() => {
    setAvatarInput(widget?.avatarUrl ?? "");
    setLogoInput(widget?.brandLogoUrl ?? "");
  }, [widget?.avatarUrl, widget?.brandLogoUrl]);

  async function uploadAvatar(file: File | null) {
    if (!file || uploading) return;

    setUploading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const form = new FormData();

      form.set("file", file);
      form.set("kind", "avatar");

      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch("/api/panel/widget/asset", {
        method: "POST",
        headers,
        body: form,
        credentials: "include",
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };

      if (!res.ok || json.ok === false || !json.url) {
        setErr(json.error || "No se pudo subir la imagen del widget.");
        return;
      }

      setAvatarInput(json.url);
      await patchWidget({ avatarUrl: json.url });
    } catch {
      setErr("No se pudo subir la imagen del widget.");
    } finally {
      setUploading(false);
    }
  }

  const enabled = widget?.enabled ?? false;

  return (
    <div className="flex flex-col gap-5">
      <PanelSectionHeader
        eyebrow="Instalación pública"
        title="Instalación del Widget"
        description="Copia el script instalable de LumenAI y pégalo en cualquier web para activar el asistente."
        status={loading ? "Cargando…" : enabled ? "Widget activo" : "Widget desactivado"}
        statusTone={enabled ? "active" : "warning"}
        secondary={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={enabled ? "active" : "warning"}>
              {enabled ? "Visible para clientes" : "Oculto"}
            </StatusBadge>

            {copied ? <StatusBadge tone="muted">{copied}</StatusBadge> : null}

            <button
              type="button"
              onClick={() => void loadWidget()}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.025] px-3 text-xs font-bold text-white/80 transition hover:bg-white/[0.05] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-[16px] border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-100">
          {err}
        </div>
      ) : null}

      {loading ? (
        <GlassCard variant="soft" className="p-6">
          <p className="text-sm text-white/55">Cargando configuración del widget…</p>
        </GlassCard>
      ) : !business || !widget ? (
        <GlassCard variant="soft" className="p-6">
          <p className="text-sm text-white/55">
            No se encontró negocio activo. Revisa el onboarding o la relación user → business.
          </p>
        </GlassCard>
      ) : (
        <>
          <WidgetLaunchGuide
            enabled={enabled}
            embedCode={embedCode}
            onCopy={() => void copy(embedCode, "Script copiado")}
          />

          <WidgetExperiencePreview
            businessName={business.name}
            assistantName={widget.assistantName}
            enabled={enabled}
            gradientFrom={widget.gradientFrom || "#00E5FF"}
            gradientTo={widget.gradientTo || "#6C3BFF"}
          />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
            <GlassCard variant="base" accent className="p-5 md:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-white/70" />
                      <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
                        Código de instalación
                      </h3>
                    </div>

                    <p className="mt-2 max-w-[760px] text-sm leading-6 text-white/50">
                      Este código se pega antes de cerrar el <code>&lt;/body&gt;</code> de la web del cliente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void copy(embedCode, "Script copiado ✅")}
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white transition hover:bg-white/[0.06]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar script
                  </button>
                </div>

                <pre className="max-h-[260px] overflow-auto rounded-[16px] border border-white/[0.07] bg-black/30 p-4 text-xs leading-6 text-white/78">
                  <code>{embedCode}</code>
                </pre>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoTile
                    icon={<Globe2 className="h-4 w-4" />}
                    label="Dominio actual"
                    value={appUrl}
                  />

                  <InfoTile
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Public key"
                    value={installKey}
                    copyValue={installKey}
                    onCopy={copy}
                  />

                  <InfoTile
                    icon={<MonitorSmartphone className="h-4 w-4" />}
                    label="Posición"
                    value={POSITION_LABELS[position]}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="base" accent className="p-5 md:p-6">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
                        Control rápido
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/50">
                        Activa, desactiva y define la esquina donde aparecerá el widget.
                      </p>
                    </div>

                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-[13px] border"
                      style={{
                        borderColor: enabled
                          ? "rgba(0,220,140,.20)"
                          : "rgba(255,190,80,.22)",
                        background: enabled
                          ? "rgba(0,220,140,.08)"
                          : "rgba(255,190,80,.10)",
                      }}
                    >
                      <Power className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void patchWidget({ widgetEnabled: !enabled })}
                    disabled={saving}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.035] text-sm font-black text-white transition hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando…"
                      : enabled
                      ? "Desactivar widget"
                      : "Activar widget"}
                  </button>

                  <div className="mt-5">
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Posición
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(Object.keys(POSITION_LABELS) as Position[]).map((item) => {
                        const active = position === item;

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => void patchWidget({ position: item })}
                            disabled={saving}
                            className={`rounded-[13px] border px-3 py-3 text-left text-xs font-bold transition disabled:opacity-50 ${
                              active
                                ? "border-white/18 bg-white/[0.07] text-white"
                                : "border-white/[0.07] bg-white/[0.02] text-white/55 hover:bg-white/[0.04]"
                            }`}
                          >
                            {POSITION_LABELS[item]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.018] p-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <CheckCircle2 className="h-4 w-4" />
                    Estado de publicación
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Última actualización: {formatDate(widget.updatedAt)}
                  </p>
                </div>
              </div>
            </GlassCard>
          </section>

          <GlassCard variant="base" accent className="p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-white/70" />
                  <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
                    Marca visible del widget
                  </h3>
                </div>

                <p className="mt-2 max-w-[760px] text-sm leading-6 text-white/50">
                  Define la foto o logo que veran los clientes dentro del chat y en el boton flotante.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <GradientSelectorCard
                    active={Boolean(avatarInput)}
                    title="Avatar visible"
                    text="Imagen del asistente en el chat."
                    gradient="linear-gradient(135deg, rgba(var(--lmn-accent-rgb,0,140,255),.55), rgba(var(--lmn-accent-2-rgb,108,59,255),.35))"
                  />
                  <GradientSelectorCard
                    active={Boolean(logoInput)}
                    title="Logo de marca"
                    text="Identidad del negocio para previews."
                    gradient="linear-gradient(135deg, rgba(255,255,255,.18), rgba(var(--lmn-accent-rgb,0,140,255),.22))"
                  />
                  <GradientSelectorCard
                    active={enabled}
                    title="Widget publico"
                    text="Boton activo para clientes reales."
                    gradient="linear-gradient(135deg, rgba(40,220,160,.35), rgba(var(--lmn-accent-rgb,0,140,255),.18))"
                  />
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Foto/avatar del asistente
                    </span>
                    <input
                      value={avatarInput}
                      onChange={(event) => setAvatarInput(event.target.value)}
                      placeholder="https://..."
                      className="h-11 rounded-[12px] border border-white/[0.075] bg-black/20 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/18"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void patchWidget({ avatarUrl: avatarInput })}
                        disabled={saving}
                        className="inline-flex h-9 items-center rounded-[10px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white transition hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        Guardar avatar
                      </button>

                      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.025] px-3 text-xs font-black text-white/82 transition hover:bg-white/[0.05]">
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? "Subiendo..." : "Subir imagen"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            void uploadAvatar(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Logo de marca
                    </span>
                    <input
                      value={logoInput}
                      onChange={(event) => setLogoInput(event.target.value)}
                      placeholder="https://..."
                      className="h-11 rounded-[12px] border border-white/[0.075] bg-black/20 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/18"
                    />
                    <button
                      type="button"
                      onClick={() => void patchWidget({ brandLogoUrl: logoInput })}
                      disabled={saving}
                      className="inline-flex h-9 w-fit items-center rounded-[10px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white transition hover:bg-white/[0.06] disabled:opacity-50"
                    >
                      Guardar logo
                    </button>
                  </label>
                </div>
              </div>

              <div className="overflow-hidden rounded-[16px] border border-white/[0.075] bg-white/[0.020] p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                  Preview de identidad
                </div>
                <div className="relative mt-4 min-h-[210px] rounded-[16px] border border-white/[0.065] bg-black/20 p-4">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-80"
                    style={{
                      background:
                        "radial-gradient(220px 150px at 20% 10%, rgba(var(--lmn-accent-rgb,0,140,255),.18), transparent 62%), radial-gradient(240px 150px at 85% 90%, rgba(var(--lmn-accent-2-rgb,108,59,255),.16), transparent 62%)",
                    }}
                  />
                  <div className="relative flex items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30">
                    {avatarInput ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarInput}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl font-black text-white">
                        {(widget.assistantName || "L").slice(0, 1)}
                      </span>
                    )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">
                        {widget.assistantName || "LumenAI"}
                      </div>
                      <div className="mt-1 truncate text-xs text-white/45">
                        {business.name}
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-5 rounded-[14px] border border-white/[0.070] bg-white/[0.045] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                      Mensaje inicial
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-white/82">
                      Hola, soy {widget.assistantName || "LumenAI"}. Te ayudo con horarios, precios, pagos y disponibilidad.
                    </div>
                    <div className="mt-3 h-px bg-gradient-to-r from-white/18 via-white/8 to-transparent" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-bold text-white/68">
                        Cotizar
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-bold text-white/68">
                        Horarios
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-bold text-white/68">
                        Pagar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
            <GlassCard variant="soft" className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
                    Vista previa directa
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Preview del widget usando la misma key pública del negocio.
                  </p>
                </div>

                <a
                  href={directWidgetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white no-underline transition hover:bg-white/[0.06]"
                >
                  Abrir directo
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mt-5 h-[650px] overflow-hidden rounded-[18px] border border-white/[0.075] bg-black/25">
                <iframe
                  key={directWidgetUrl}
                  src={directWidgetUrl}
                  title="Preview widget LumenAI"
                  loading="lazy"
                  className="h-full w-full border-0"
                />
              </div>
            </GlassCard>

            <GlassCard variant="soft" className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    HTML de prueba
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-white/42">
                    Úsalo para probar en una página externa simple.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void copy(testHtml, "HTML copiado ✅")}
                  className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.025] px-3 text-xs font-bold text-white/80 transition hover:bg-white/[0.05]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
              </div>

              <pre className="mt-4 max-h-[420px] overflow-auto rounded-[14px] border border-white/[0.07] bg-black/30 p-4 text-[11px] leading-5 text-white/65">
                <code>{testHtml}</code>
              </pre>
            </GlassCard>
          </section>
        </>
      )}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  copyValue,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (text: string, label?: string) => Promise<void>;
}) {
  return (
    <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.018] p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-white/34">
        {icon}
        {label}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <code className="truncate text-xs text-white/76">{value}</code>

        {copyValue && onCopy ? (
          <button
            type="button"
            onClick={() => void onCopy(copyValue, "Copiado ✅")}
            className="shrink-0 rounded-[9px] border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-bold text-white/70"
          >
            Copiar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WidgetExperiencePreview({
  businessName,
  assistantName,
  enabled,
  gradientFrom,
  gradientTo,
}: {
  businessName: string;
  assistantName: string;
  enabled: boolean;
  gradientFrom: string;
  gradientTo: string;
}) {
  const assistant = assistantName || "LumenAI";

  return (
    <GlassCard variant="strong" accent className="relative overflow-hidden p-0">
      <BorderBeam
        size={210}
        duration={14}
        colorFrom={gradientFrom}
        colorTo={gradientTo}
        borderWidth={1}
      />
      <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.032] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/46">
            <Sparkles className="h-3.5 w-3.5" />
            Widget experience
          </div>

          <h3 className="mt-4 max-w-3xl text-3xl font-black leading-[0.96] tracking-[-0.06em] text-white md:text-4xl">
            Cada respuesta debe sentirse como una pieza comercial clara.
          </h3>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/54">
            El widget no solo contesta. Ordena la informacion con titulo,
            contexto, pasos y cierre para que el cliente entienda rapido que
            hacer despues.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ExperienceRule title="Titulo visible" text="Encabezado con el color del widget." />
            <ExperienceRule title="Contenido escaneable" text="Bloques cortos, bullets y prioridad." />
            <ExperienceRule title="Cierre natural" text="CTA contextual sin presion falsa." />
          </div>
        </div>

        <MagicCard
          gradientFrom={gradientFrom}
          gradientTo={gradientTo}
          gradientColor="rgba(0, 229, 255, .08)"
          gradientOpacity={0.24}
          className="rounded-[24px]"
        >
          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.070] bg-[#080B12]/90 p-4 shadow-[0_22px_60px_rgba(0,0,0,.34)]">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background: `radial-gradient(280px 180px at 15% 0%, ${gradientFrom}24, transparent 64%), radial-gradient(320px 180px at 100% 100%, ${gradientTo}20, transparent 62%)`,
              }}
            />
            <div className="relative flex items-center justify-between border-b border-white/[0.060] pb-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/[0.080] text-white"
                  style={{
                    background: `linear-gradient(135deg, ${gradientFrom}44, ${gradientTo}28)`,
                  }}
                >
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">{assistant}</div>
                  <div className="truncate text-xs text-white/42">{businessName}</div>
                </div>
              </div>
              <StatusBadge tone={enabled ? "active" : "warning"}>
                {enabled ? "Live" : "Draft"}
              </StatusBadge>
            </div>

            <div className="relative mt-4 grid gap-3">
              <div className="ml-auto max-w-[86%] rounded-[18px] border border-white/12 bg-white px-4 py-3 text-sm font-semibold leading-6 text-black">
                Necesito saber precios y si puedo hablar con alguien.
              </div>
              <div className="max-w-[92%] rounded-[20px] border border-white/[0.075] bg-white/[0.040] p-4">
                <div
                  className="text-lg font-black leading-tight tracking-[-0.04em]"
                  style={{
                    background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Opciones para avanzar
                </div>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  Puedo ayudarte a revisar precios publicados, confirmar
                  disponibilidad y dejar el contacto listo para el equipo.
                </p>
                <div className="mt-3 grid gap-2 text-xs font-semibold text-white/58">
                  <span>1. Te muestro la opcion mas relevante.</span>
                  <span>2. Confirmo dudas antes de pedir datos.</span>
                  <span>3. Si hay interes claro, derivo a WhatsApp.</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-black text-white/68">
                    Ver precios
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-black text-white/68">
                    Hablar con equipo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </MagicCard>
      </div>
    </GlassCard>
  );
}

function ExperienceRule({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[18px] border border-white/[0.065] bg-white/[0.024] p-4">
      <div className="text-sm font-black text-white">{title}</div>
      <div className="mt-2 text-xs leading-5 text-white/46">{text}</div>
    </div>
  );
}

function WidgetLaunchGuide({
  enabled,
  embedCode,
  onCopy,
}: {
  enabled: boolean;
  embedCode: string;
  onCopy: () => void;
}) {
  return (
    <GlassCard variant="base" accent className="overflow-visible p-5 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
            Instalacion guiada
          </div>
          <h3 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">
            Widget listo para copiar y pegar
          </h3>
          <p className="mt-3 max-w-[760px] text-sm leading-7 text-white/52">
            La persona solo tiene que copiar el script, pegarlo antes de cerrar el body de su web y publicar.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InstallStep number="01" title="Copiar" text="Pulsa copiar script." active />
            <InstallStep number="02" title="Pegar" text="Antes de </body>." active={Boolean(embedCode)} />
            <InstallStep number="03" title="Probar" text="Abre la vista previa." active={enabled} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="lmn-liquid-button inline-flex h-11 items-center gap-2 px-4 text-sm font-black text-white"
            >
              <Copy className="h-4 w-4" />
              Copiar script de instalacion
            </button>
            <details className="lmn-inline-disclosure text-xs font-bold text-white/60">
              <summary className="cursor-pointer select-none text-white/74">
                Mostrar script
              </summary>
              <pre className="mt-3 max-h-36 overflow-auto rounded-[8px] bg-black/45 p-3 text-[11px] leading-5 text-white/70">
                <code>{embedCode}</code>
              </pre>
            </details>
          </div>
        </div>

        <div className="rounded-[18px] border border-white/[0.070] bg-white/[0.018] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
            Estado operativo
          </div>
          <div className="mt-3 grid gap-3">
            <OperationalCheck
              done={Boolean(embedCode)}
              title="Script generado"
              text="La key publica ya esta lista para instalar."
            />
            <OperationalCheck
              done={enabled}
              title="Widget visible"
              text="El canal publico responde si esta activo."
            />
            <OperationalCheck
              done
              title="Chat conectado"
              text="Los mensajes entran al inbox y pueden crear leads."
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function OperationalCheck({
  done,
  title,
  text,
}: {
  done?: boolean;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-white/[0.055] bg-black/20 p-3">
      <span
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border"
        style={{
          borderColor: done ? "rgba(65,220,150,.25)" : "rgba(255,255,255,.08)",
          background: done ? "rgba(65,220,150,.10)" : "rgba(255,255,255,.02)",
        }}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-white/76" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-white/46">{text}</span>
      </span>
    </div>
  );
}

function InstallStep({
  number,
  title,
  text,
  active,
}: {
  number: string;
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className="rounded-[15px] border p-4"
      style={{
        borderColor: active
          ? "rgba(var(--lmn-accent-rgb,0,140,255),.20)"
          : "rgba(255,255,255,.07)",
        background: active
          ? "linear-gradient(135deg, rgba(var(--lmn-accent-rgb,0,140,255),.10), rgba(var(--lmn-accent-2-rgb,108,59,255),.06))"
          : "rgba(255,255,255,.018)",
      }}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
        {number}
      </div>
      <div className="mt-2 text-sm font-black text-white">{title}</div>
      <div className="mt-1 text-xs leading-5 text-white/45">{text}</div>
    </div>
  );
}

function GradientSelectorCard({
  active,
  title,
  text,
  gradient,
}: {
  active?: boolean;
  title: string;
  text: string;
  gradient: string;
}) {
  return (
    <div
      className="relative min-h-[118px] overflow-hidden rounded-[16px] border p-4"
      style={{
        borderColor: active
          ? "rgba(var(--lmn-accent-rgb,0,140,255),.24)"
          : "rgba(255,255,255,.070)",
        background: "rgba(255,255,255,.018)",
      }}
    >
      <div className="absolute inset-0 opacity-70" style={{ background: gradient }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/58" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/12 bg-black/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/72">
            {active ? "Activo" : "Pendiente"}
          </span>
          <Sparkles className="h-4 w-4 text-white/70" />
        </div>
        <div>
          <div className="text-sm font-black text-white">{title}</div>
          <div className="mt-1 text-xs leading-5 text-white/62">{text}</div>
        </div>
      </div>
    </div>
  );
}
