"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HeartPulse, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";

type Check = {
  key: string;
  label: string;
  status: "ready" | "warning" | "critical" | string;
  detail: string;
};

type HealthData = {
  ok?: boolean;
  error?: string;
  health?: "ready" | "warning" | "critical";
  checks?: Check[];
  summary?: {
    total: number;
    ready: number;
    warnings: number;
    critical: number;
  };
};

function tone(status?: string): "active" | "warning" | "danger" | "muted" {
  if (status === "ready") return "active";
  if (status === "warning") return "warning";
  if (status === "critical") return "danger";
  return "muted";
}

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const checks = data?.checks ?? [];
    return {
      critical: checks.filter((item) => item.status === "critical"),
      warning: checks.filter((item) => item.status === "warning"),
      ready: checks.filter((item) => item.status === "ready"),
    };
  }, [data?.checks]);

  async function load(check = false) {
    if (check) setChecking(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(check ? "/api/panel/system-health/check" : "/api/panel/system-health", {
        method: check ? "POST" : "GET",
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as HealthData;
      if (!res.ok || json.ok === false) {
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

  return (
    <main className="grid gap-5 pb-10">
      <PanelSectionHeader
        eyebrow="System QA Agent"
        title="Health operativo"
        description="Checklist tecnico-amigable para validar auth, Supabase, widget, Knowledge, snapshots, action runs y keys server-side."
        status={data?.health || "leyendo"}
        statusTone={tone(data?.health)}
        secondary={
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void load()} disabled={loading} variant="secondary">
              <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              Actualizar
            </ActionButton>
            <ActionButton onClick={() => void load(true)} disabled={checking} variant="primary">
              {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HeartPulse className="h-3.5 w-3.5" />}
              Ejecutar diagnostico
            </ActionButton>
          </div>
        }
      />

      {error ? <div className="lmn-autoconfig-error">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Checks" value={summary.total} />
        <Metric label="Ready" value={summary.ready} hot={data?.health === "ready"} />
        <Metric label="Warnings" value={summary.warnings} hot={summary.warnings > 0} />
        <Metric label="Critical" value={summary.critical} danger={summary.critical > 0} />
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
                Este panel no muestra secretos. Solo indica si cada modulo tiene configuracion suficiente para operar.
              </p>
            </div>
            {data?.health === "critical" ? (
              <ShieldAlert className="h-6 w-6 text-red-200" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-cyan-200" />
            )}
          </div>

          <div className="mt-5 grid gap-2">
            {(data?.checks ?? []).map((check) => (
              <div key={check.key} className="apex-cut flex items-start justify-between gap-4 border border-white/[0.07] bg-white/[0.018] p-3">
                <div>
                  <div className="text-sm font-black text-white">{check.label}</div>
                  <p className="mt-1 text-xs leading-5 text-white/46">{check.detail}</p>
                </div>
                <StatusBadge tone={tone(check.status)}>{check.status}</StatusBadge>
              </div>
            ))}
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
