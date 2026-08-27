"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { usePanel } from "../_components/panel-context";

type CheckStatus = "ready" | "warning" | "critical";

type Check = {
  key: string;
  label: string;
  status: CheckStatus | string;
  detail: string;
  category?: "workspace" | "intelligence" | "release";
  action?: { href: string; label: string };
};

type HealthData = {
  ok?: boolean;
  error?: string;
  health?: CheckStatus;
  checks?: Check[];
  summary?: {
    total: number;
    ready: number;
    warnings: number;
    critical: number;
  };
  release?: {
    score: number;
    readyForPreview: boolean;
    readyForProduction: boolean;
    checkedAt: string;
    activeProbe: boolean;
    environment: string;
    publicUrl: string | null;
    nextAction: null | {
      key: string;
      title: string;
      detail: string;
      href: string;
      label: string;
    };
  };
};

type Filter = "all" | CheckStatus;

function tone(status?: string): "active" | "warning" | "danger" | "muted" {
  if (status === "ready") return "active";
  if (status === "warning") return "warning";
  if (status === "critical") return "danger";
  return "muted";
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function SystemHealthPage() {
  const { operatorId } = usePanel();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [copyState, setCopyState] = useState<"copied" | "failed" | null>(null);

  const grouped = useMemo(() => {
    const checks = data?.checks ?? [];
    return {
      critical: checks.filter((item) => item.status === "critical"),
      warning: checks.filter((item) => item.status === "warning"),
      ready: checks.filter((item) => item.status === "ready"),
    };
  }, [data?.checks]);

  const visibleChecks = useMemo(() => {
    const checks = data?.checks ?? [];
    return filter === "all" ? checks : checks.filter((item) => item.status === filter);
  }, [data?.checks, filter]);

  async function load(check = false) {
    if (check) setChecking(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        check ? "/api/panel/system-health/check" : "/api/panel/system-health",
        {
          method: check ? "POST" : "GET",
          cache: "no-store",
          credentials: "include",
        },
      );
      const json = (await response.json().catch(() => ({}))) as HealthData;

      if (!response.ok || json.ok === false) {
        setError(json.error || "No se pudo revisar Health.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("No se pudo conectar con System Health.");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = data?.summary ?? { total: 0, ready: 0, warnings: 0, critical: 0 };
  const release = data?.release;

  async function copyReport() {
    if (!data) return;

    const report = [
      `LumenAI launch readiness: ${release?.score ?? 0}%`,
      `Preview: ${release?.readyForPreview ? "ready" : "blocked"}`,
      `Production: ${release?.readyForProduction ? "ready" : "blocked"}`,
      ...((data.checks ?? []).map(
        (check) => `[${check.status.toUpperCase()}] ${check.label}: ${check.detail}`,
      )),
    ].join("\n");

    try {
      await writeClipboard(report);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState(null), 1800);
  }

  return (
    <main className="lmn-module-page lmn-health-page grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="System QA Agent"
        title="Health operativo"
        description="Control de lanzamiento para validar seguridad, Supabase, IA, widget externo, despliegue y pagos sin exponer secretos."
        status={data?.health || "leyendo"}
        statusTone={tone(data?.health)}
        secondary={
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void copyReport()} disabled={!data} variant="ghost">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {copyState === "copied"
                ? "Informe copiado"
                : copyState === "failed"
                  ? "No se pudo copiar"
                  : "Copiar informe"}
            </ActionButton>
            <ActionButton onClick={() => void load()} disabled={loading} variant="secondary">
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Actualizar
            </ActionButton>
            <ActionButton onClick={() => void load(true)} disabled={checking} variant="primary">
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HeartPulse className="h-3.5 w-3.5" />
              )}
              Ejecutar diagnostico
            </ActionButton>
          </div>
        }
      />

      {error ? (
        <div className="lmn-autoconfig-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Resumen de diagnosticos">
        <Metric label="Checks" value={summary.total} />
        <Metric label="Ready" value={summary.ready} hot={data?.health === "ready"} />
        <Metric label="Warnings" value={summary.warnings} hot={summary.warnings > 0} />
        <Metric label="Critical" value={summary.critical} danger={summary.critical > 0} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <GlassCard variant="strong" accent className="p-5 md:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full p-[9px]"
              style={{
                background: `conic-gradient(#5ee7ff ${release?.score ?? 0}%, rgba(255,255,255,.07) 0)`,
              }}
              role="img"
              aria-label={`Preparacion de lanzamiento ${release?.score ?? 0} por ciento`}
            >
              <div className="grid h-full w-full place-items-center rounded-full border border-white/[0.08] bg-[#05070b] text-center">
                <div>
                  <div className="text-3xl font-black tracking-[-0.06em] text-white">
                    {release?.score ?? 0}%
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
                    Launch score
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={release?.readyForPreview ? "active" : "warning"}>
                  Preview {release?.readyForPreview ? "habilitado" : "bloqueado"}
                </StatusBadge>
                <StatusBadge tone={release?.readyForProduction ? "active" : "danger"}>
                  Produccion {release?.readyForProduction ? "lista" : "bloqueada"}
                </StatusBadge>
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.045em] text-white">
                Centro de lanzamiento
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">
                Un control unificado para despliegue, seguridad, IA, widget externo y cobros. El diagnostico activo prueba el endpoint publico sin mostrar secretos.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-white/38">
                <span>Entorno: {release?.environment || "desconocido"}</span>
                <span>URL: {release?.publicUrl || "sin publicar"}</span>
                <span>{release?.activeProbe ? "Prueba externa ejecutada" : "Prueba externa pendiente"}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="soft" className="p-5">
          <div className="flex items-start gap-4">
            <OperatorAvatar
              operator={operatorId}
              mood={release?.readyForProduction ? "celebrating" : "working"}
              size={74}
              label="Operador LumenAI revisando el lanzamiento"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/68">
                <Sparkles className="h-3.5 w-3.5" /> Siguiente accion
              </div>
              <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-white">
                {release?.nextAction?.title || "Todo bajo control"}
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/48">
                {release?.nextAction?.detail || "No hay bloqueos detectados en este diagnostico."}
              </p>
              {release?.nextAction ? (
                <ActionButton href={release.nextAction.href} variant="primary" className="mt-4">
                  {release.nextAction.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </ActionButton>
              ) : null}
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <GlassCard variant="strong" accent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                Readiness
              </div>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.065em] text-white">
                {data?.health === "ready"
                  ? "Sistema listo"
                  : data?.health === "critical"
                    ? "Requiere atencion"
                    : "Casi listo"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
                Cada resultado incluye una accion directa. Los estados criticos bloquean produccion; los warnings se deben cerrar antes de promover el preview.
              </p>
            </div>
            {data?.health === "critical" ? (
              <ShieldAlert className="h-6 w-6 text-red-200" />
            ) : release?.readyForProduction ? (
              <Rocket className="h-6 w-6 text-cyan-200" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-cyan-200" />
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar diagnosticos">
            {(["all", "critical", "warning", "ready"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`lmn-focus-ring min-h-10 border px-3 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  filter === value
                    ? "border-cyan-200/24 bg-cyan-200/[0.08] text-cyan-50"
                    : "border-white/[0.08] text-white/54 hover:bg-white/[0.05] hover:text-white"
                }`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "Todos" : value}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2" aria-live="polite">
            {visibleChecks.map((check) => (
              <div
                key={check.key}
                className="apex-cut flex flex-col gap-3 border border-white/[0.07] bg-white/[0.018] p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-white">{check.label}</div>
                    {check.category ? (
                      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/28">
                        {check.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-white/46">{check.detail}</p>
                  {check.action ? (
                    <ActionButton href={check.action.href} variant="ghost" className="mt-2 h-8">
                      {check.action.label}
                      <ArrowUpRight className="h-3 w-3" />
                    </ActionButton>
                  ) : null}
                </div>
                <StatusBadge tone={tone(check.status)}>{check.status}</StatusBadge>
              </div>
            ))}
            {!visibleChecks.length ? (
              <div className="apex-cut border border-white/[0.07] bg-white/[0.018] p-5 text-sm text-white/46">
                No hay checks en este filtro.
              </div>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard variant="soft" className="p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Prioridad
          </div>
          <div className="mt-3 grid gap-4">
            <PriorityBlock title="Critico" checks={grouped.critical} />
            <PriorityBlock title="Warnings" checks={grouped.warning} />
            <PriorityBlock title="Ready" checks={grouped.ready.slice(0, 6)} compact />
          </div>
        </GlassCard>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  hot,
  danger,
}: {
  label: string;
  value: number;
  hot?: boolean;
  danger?: boolean;
}) {
  return (
    <GlassCard variant="soft" accent={hot || danger} className="p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{label}</div>
      <div className={`mt-3 text-3xl font-black tracking-[-0.06em] ${danger ? "text-red-100" : "text-white"}`}>
        {value}
      </div>
    </GlassCard>
  );
}

function PriorityBlock({
  title,
  checks,
  compact,
}: {
  title: string;
  checks: Check[];
  compact?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{title}</div>
      <div className="mt-2 grid gap-2">
        {checks.length ? (
          checks.map((check) => (
            <div key={check.key} className="apex-cut border border-white/[0.06] bg-white/[0.018] p-3">
              <div className="text-xs font-black text-white">{check.label}</div>
              {!compact ? <p className="mt-1 text-[11px] leading-5 text-white/42">{check.detail}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-xs leading-5 text-white/42">Sin elementos en esta categoria.</p>
        )}
      </div>
    </div>
  );
}
