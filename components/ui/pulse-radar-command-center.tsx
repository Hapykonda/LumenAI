"use client";

import { Activity, Clock3, RefreshCw } from "lucide-react";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";
import { PulseRadar } from "@/components/ui/pulse-radar";
import { PulseExecutiveOperator } from "@/components/ui/pulse-executive-operator";
import { PulseSignalStream, type PulseSignalItem } from "@/components/ui/pulse-signal-stream";
import { PulseActionStack, type PulseActionItem } from "@/components/ui/pulse-action-stack";
import type { InsightMood, PulseOverallStatus, PulseRecommendation } from "@/lib/pulse-insights";

export type PulseMetricItem = {
  label: string;
  value: string | number;
  state: "good" | "neutral" | "warning";
  description: string;
};

export type PulseCommandCenterState = {
  overallStatus: PulseOverallStatus;
  systemMood: InsightMood;
  summary: string;
  executiveSummary?: string;
  greeting?: string;
  suggestedFocus?: string;
  questions?: string[];
  signals: PulseSignalItem[];
  recommendations: PulseRecommendation[];
  metrics: PulseMetricItem[];
  nextBestActions: PulseActionItem[];
  rawMetrics?: { readiness?: number };
  refreshedAt?: string;
  readinessStatus?: string;
};

function statusLabel(status: PulseOverallStatus) {
  if (status === "healthy") return "Sistema estable";
  if (status === "opportunity") return "Oportunidad detectada";
  if (status === "warning") return "Atención necesaria";
  if (status === "needs_setup") return "Requiere configuración";
  return "Sin datos suficientes";
}

function formatUpdated(value?: string) {
  if (!value) return "Sin actualización";
  try {
    return new Date(value).toLocaleString("es", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "Sin actualización";
  }
}

export function PulseRadarCommandCenter({
  state,
  loading = false,
  onRefresh,
}: {
  state: PulseCommandCenterState;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const readinessMetric = state.metrics.find((item) => item.label === "Readiness")?.value;
  const legacySignals = state.signals.map((signal) => ({
    label: signal.title,
    value: signal.severity === "success" ? "Listo" : signal.severity === "warning" ? "Ajustar" : signal.severity === "critical" ? "Urgente" : "Leyendo",
    tone: signal.severity === "success" ? "good" as const : signal.severity === "warning" ? "warn" as const : signal.severity === "critical" ? "risk" as const : "info" as const,
  }));
  const readiness = Number.isFinite(Number(state.rawMetrics?.readiness))
    ? Number(state.rawMetrics?.readiness)
    : Number.parseInt(String(readinessMetric ?? "0"), 10) || 0;

  return (
    <section className={`lmn-pulse-command-center is-${state.overallStatus}`} data-mood={state.systemMood}>
      <AnimatedHeroLights intensity={state.overallStatus === "warning" ? "high" : "medium"} />

      <header className="lmn-pulse-command-header">
        <div>
          <span className="lmn-command-eyebrow">Centro operativo LumenAI</span>
          <h1>Pulse Radar</h1>
          <p>
            Consola inteligente para leer estado, señales reales y acciones prioritarias del negocio.
          </p>
        </div>
        <div className="lmn-command-status-panel">
          <span>{statusLabel(state.overallStatus)}</span>
          <strong>{state.readinessStatus || `${readiness}% readiness`}</strong>
          <small>
            <Clock3 className="h-3.5 w-3.5" />
            {formatUpdated(state.refreshedAt)}
          </small>
          {onRefresh ? (
            <button type="button" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Actualizar
            </button>
          ) : null}
        </div>
      </header>

      <div className="lmn-pulse-command-grid">
        <div className="lmn-pulse-radar-core-panel">
          <PulseRadar
            status={state.readinessStatus || statusLabel(state.overallStatus)}
            score={readiness}
            signals={legacySignals}
            recommendations={state.recommendations}
          />
          <div className="lmn-command-metric-strip">
            {state.metrics.slice(0, 4).map((metric) => (
              <div key={metric.label} className={`is-${metric.state}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.description}</small>
              </div>
            ))}
          </div>
        </div>

        <PulseExecutiveOperator
          status={state.overallStatus}
          mood={state.systemMood}
          greeting={state.greeting || "Lectura operativa lista."}
          summary={state.executiveSummary || state.summary}
          suggestedFocus={state.suggestedFocus}
          questions={state.questions}
          recommendations={state.recommendations}
          thinking={loading}
        />
      </div>

      <div className="lmn-pulse-command-lower">
        <PulseSignalStream signals={state.signals} />
        <PulseActionStack actions={state.nextBestActions} />
      </div>

      <div className="lmn-pulse-command-footer">
        <Activity className="h-3.5 w-3.5" />
        <span>{state.summary}</span>
      </div>
    </section>
  );
}
