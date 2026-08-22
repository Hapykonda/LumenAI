"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Database, Newspaper, TimerOff, X } from "lucide-react";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import SectionIntroGate from "../_components/SectionIntroGate";
import {
  PulseRadarCommandCenter,
  type PulseCommandCenterState,
} from "@/components/ui/pulse-radar-command-center";
import type { InsightMood, PulseOverallStatus, PulseRecommendation } from "@/lib/pulse-insights";
import type { PulseRadarInsight } from "@/lib/pulse-radar/types";

type LegacySignal = {
  label: string;
  value: string;
  tone: "good" | "warn" | "risk" | "info";
};

type RawMetrics = {
  readiness?: number;
  leadsTotal?: number;
  chatsTotal?: number;
  messagesTotal?: number;
  leads24h?: number;
  chats24h?: number;
  messages24h?: number;
  unreadChats?: number;
  hotLeads?: number;
  opportunitiesOpen?: number;
  knowledgePublished?: number;
  widgetConfigured?: boolean;
  widgetEnabled?: boolean;
  calibrationPublished?: boolean;
  activeCampaigns?: number;
  hasEnoughActivity?: boolean;
};

type RadarData = Partial<PulseCommandCenterState> & {
  ok?: boolean;
  error?: string;
  headline?: string;
  brief?: string;
  greeting?: string;
  mood?: InsightMood;
  systemMood?: InsightMood;
  overallStatus?: PulseOverallStatus;
  rawMetrics?: RawMetrics;
  legacySignals?: LegacySignal[];
  recommendations?: PulseRecommendation[];
  assistantMessage?: {
    greeting: string;
    summary: string;
    mood: InsightMood;
    recommendations: PulseRecommendation[];
  };
  actions?: Array<{ title: string; detail: string; href: string }>;
  marketNotes?: string[];
  insights?: PulseRadarInsight[];
  marketNews?: Array<{
    headline?: string;
    title?: string;
    source?: string;
    link?: string;
    url?: string;
    summary?: string;
    pubDate?: string;
  }>;
};

const SIGNAL_STATUS: Record<string, string> = {
  new: "Nueva",
  viewed: "Vista",
  action_prepared: "Accion preparada",
  awaiting_approval: "Esperando aprobacion",
  executing: "Ejecutando",
  resolved: "Resuelta",
  partially_resolved: "Resolucion parcial",
  failed: "Fallida",
  reverted: "Revertida",
  dismissed: "Descartada",
};

function fallbackState(data: RadarData | null, loading: boolean, error: string | null): PulseCommandCenterState {
  const rawMetrics = data?.rawMetrics ?? {};
  const recommendations = data?.recommendations ?? [];
  const signals = data?.signals?.length
    ? data.signals
    : [
        {
          id: "system",
          title: "Sistema",
          message: loading
            ? "Pulse esta leyendo el panel."
            : error
              ? "No se pudo leer el estado del sistema."
              : "Sin datos suficientes todavia.",
          type: "system" as const,
          severity: error ? "critical" as const : "info" as const,
          emoji: error ? "\u{1F6A8}" : "\u{1F535}",
          actionHref: "/panel/overview",
        },
        {
          id: "widget",
          title: "Widget",
          message: rawMetrics.widgetEnabled ? "Widget activo." : "Conecta o prueba el widget.",
          type: "widget" as const,
          severity: rawMetrics.widgetEnabled ? "success" as const : "warning" as const,
          emoji: rawMetrics.widgetEnabled ? "\u{1F310}" : "\u{1F9E9}",
          actionHref: "/panel/widget",
        },
      ];

  const metrics = data?.metrics?.length
    ? data.metrics
    : [
        {
          label: "Readiness",
          value: `${rawMetrics.readiness ?? 0}%`,
          state: (rawMetrics.readiness ?? 0) >= 80 ? "good" as const : "warning" as const,
          description: "Preparacion operativa",
        },
        {
          label: "Chats 24h",
          value: rawMetrics.chats24h ?? 0,
          state: rawMetrics.chats24h ? "good" as const : "neutral" as const,
          description: "Actividad reciente",
        },
        {
          label: "Leads",
          value: rawMetrics.leadsTotal ?? 0,
          state: rawMetrics.leadsTotal ? "good" as const : "neutral" as const,
          description: "Contactos capturados",
        },
        {
          label: "Knowledge",
          value: rawMetrics.knowledgePublished ?? 0,
          state: rawMetrics.knowledgePublished ? "good" as const : "warning" as const,
          description: "Piezas publicadas",
        },
      ];

  const nextBestActions = data?.nextBestActions?.length
    ? data.nextBestActions
    : recommendations.slice(0, 4).map((item, index) => ({
        label: item.ctaLabel || item.cta || item.title,
        description: item.reasoning || item.message,
        href: item.href || "/panel/overview",
        priority: index === 0 ? "primary" as const : "secondary" as const,
      }));

  return {
    overallStatus: data?.overallStatus ?? (error ? "warning" : loading ? "empty" : "needs_setup"),
    systemMood: data?.systemMood ?? data?.mood ?? data?.assistantMessage?.mood ?? (error ? "warning" : "calm"),
    summary:
      data?.summary ||
      data?.assistantMessage?.summary ||
      data?.brief ||
      "Pulse Radar lee actividad, widget, knowledge y calibracion para proponer la siguiente accion real.",
    executiveSummary:
      data?.executiveSummary ||
      data?.assistantMessage?.summary ||
      "Todavia no hay suficientes datos. Conecta el widget, publica la calibracion y carga knowledge clave.",
    greeting: data?.greeting || data?.assistantMessage?.greeting || "Lectura operativa lista.",
    suggestedFocus: data?.suggestedFocus || "Prioriza la configuracion base antes de medir crecimiento.",
    questions: data?.questions ?? ["Revisamos widget?", "Ajustamos knowledge?", "Publicamos calibracion?"],
    signals,
    recommendations,
    metrics,
    nextBestActions,
    rawMetrics,
    refreshedAt: data?.refreshedAt,
    readinessStatus: data?.readinessStatus,
  };
}

export default function RadarPage() {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalBusy, setSignalBusy] = useState<string | null>(null);

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(refresh ? "/api/panel/radar/refresh" : "/api/panel/radar", {
        method: refresh ? "POST" : "GET",
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as RadarData;
      if (!res.ok || json.ok === false) {
        setError(json.error || "No se pudo cargar Pulse Radar.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("No se pudo conectar con Pulse Radar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const commandState = useMemo(() => fallbackState(data, loading, error), [data, loading, error]);
  const actions = data?.actions?.length
    ? data.actions
    : commandState.nextBestActions.map((action) => ({
        title: action.label,
        detail: action.description,
        href: action.href,
      }));
  const marketNews = data?.marketNews ?? [];
  const marketNotes = data?.marketNotes ?? [];
  const insights = data?.insights ?? [];

  async function updateSignal(signalId: string, action: "dismiss" | "snooze") {
    setSignalBusy(signalId);
    setError(null);
    try {
      const response = await fetch("/api/panel/pulse-radar/signals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, action, snoozeMinutes: 20 }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar la senal.");
      await load();
    } catch (signalError) {
      setError(signalError instanceof Error ? signalError.message : "No se pudo actualizar la senal.");
    } finally {
      setSignalBusy(null);
    }
  }

  return (
    <SectionIntroGate
      title="Radar ejecutivo para leer senales antes de actuar."
      description="Pulse Radar concentra actividad, senales internas, contexto de mercado y acciones recomendadas para que el equipo no tenga que abrir cada modulo antes de decidir."
      bullets={[
        "Detecta riesgos, oportunidades y senales urgentes del sistema.",
        "Cruza actividad interna con notas de mercado cuando hay fuentes disponibles.",
        "Convierte observaciones en acciones concretas dentro del panel.",
      ]}
      primaryActionLabel="Entrar al area"
      skipActionLabel="Omitir"
      storageKey="lumenai:intro:radar:v1"
      reverseLayout
    >
      <main className="lmn-radar-page grid gap-4 pb-8">
        <PanelSectionHeader
          eyebrow="Pulse Radar"
          title="Pulse Radar"
          description="Centro vivo para estado, senales reales y acciones prioritarias."
          status={loading ? "leyendo" : "actualizado"}
          statusTone="active"
        />

        {error ? <div className="lmn-autoconfig-error" role="alert">{error}</div> : null}

        <PulseRadarCommandCenter
          state={commandState}
          loading={loading}
          onRefresh={() => void load(true)}
        />

        <section aria-labelledby="pulse-signal-heading" className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="lmn-radar-card-kicker">Lifecycle verificable</div>
              <h2 id="pulse-signal-heading" className="mt-1 text-xl font-black text-white">Senales activas</h2>
            </div>
            <span className="text-xs text-white/58">Fuente, periodo, evidencia y resultado sincronizados</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.map((insight) => {
              const evidence = insight.evidence?.metrics && typeof insight.evidence.metrics === "object"
                ? Object.entries(insight.evidence.metrics as Record<string, unknown>).slice(0, 4)
                : [];
              const prepareAction = insight.actions?.find((item) => item.id.startsWith("prepare-"));
              return (
                <GlassCard key={insight.id} variant="soft" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="lmn-radar-card-kicker">{SIGNAL_STATUS[insight.status || "new"] || insight.status}</span>
                      <h3 className="mt-2 text-base font-black text-white">{insight.title}</h3>
                    </div>
                    <span className="rounded border border-white/10 px-2 py-1 text-[10px] font-bold text-white/60">{insight.severity}</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-white/55">{insight.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/48">
                    <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" />{insight.source?.label || "Sistema"}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{insight.period?.label || "Estado actual"}</span>
                  </div>
                  {evidence.length ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      {evidence.map(([label, value]) => (
                        <div key={label} className="border-l border-white/10 pl-2">
                          <dt className="text-[9px] uppercase text-white/38">{label}</dt>
                          <dd className="text-xs font-bold text-white/72">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {insight.lastError ? <p role="alert" className="mt-3 text-xs text-red-300">{insight.lastError}</p> : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {prepareAction ? (
                      <Link href={prepareAction.href} className="inline-flex min-h-11 items-center gap-2 rounded bg-white px-3 text-xs font-black text-black no-underline">
                        {prepareAction.label}<ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {!insight.actionRunId && insight.status !== "dismissed" ? (
                      <>
                        <button type="button" disabled={signalBusy === insight.id} onClick={() => void updateSignal(insight.id, "snooze")} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-white/65">
                          <TimerOff className="h-3.5 w-3.5" />Posponer
                        </button>
                        <button type="button" disabled={signalBusy === insight.id} onClick={() => void updateSignal(insight.id, "dismiss")} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-white/65">
                          <X className="h-3.5 w-3.5" />Descartar
                        </button>
                      </>
                    ) : null}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>

        <section className="lmn-radar-layout grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="lmn-radar-news-grid grid gap-3 md:grid-cols-2">
            {marketNews.slice(0, 4).map((item, index) => {
              const title = item.headline || item.title || "Senal de mercado";
              const href = item.link || item.url || "";
              return (
                <GlassCard key={`${title}-${index}`} variant="soft" className="lmn-radar-news-card p-4">
                  <div className="lmn-radar-card-kicker flex items-center gap-2">
                    <Newspaper className="h-3.5 w-3.5" />
                    {item.source || "Fuente"}
                  </div>
                  <h3>{title}</h3>
                  <p>{item.summary || "Radar cruza esta senal con el estado interno del negocio."}</p>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-black text-white no-underline"
                    >
                      Ver fuente
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </GlassCard>
              );
            })}
            {!marketNews.length ? (
              <GlassCard variant="soft" className="lmn-radar-empty p-5 md:col-span-2">
                <h3 className="text-xl font-black text-white">Fuentes de mercado</h3>
                <p className="mt-2 text-sm leading-7 text-white/48">
                  Pulse ya funciona con senales internas. Cuando agregues fuentes externas, apareceran aqui.
                </p>
              </GlassCard>
            ) : null}
          </div>

          <GlassCard variant="soft" className="lmn-radar-side p-4">
            <div className="lmn-radar-card-kicker">Acciones recomendadas</div>
            <div className="mt-3 grid gap-2">
              {actions.slice(0, 4).map((action) => (
                <Link key={`${action.title}-${action.href}`} href={action.href} className="lmn-radar-action-row no-underline">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-white">{action.title}</div>
                      <p className="mt-1 text-[11px] leading-5 text-white/42">{action.detail}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-white/42" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <div className="lmn-radar-card-kicker">Notas</div>
              <div className="mt-3 grid gap-2">
                {(marketNotes.length
                  ? marketNotes
                  : ["Pulse lee senales internas y prepara acciones prioritarias cuando haya mas actividad."]
                )
                  .slice(0, 3)
                  .map((note, index) => (
                    <p key={`${note}-${index}`} className="text-xs leading-6 text-white/48">
                      {note}
                    </p>
                  ))}
              </div>
            </div>
          </GlassCard>
        </section>
      </main>
    </SectionIntroGate>
  );
}
