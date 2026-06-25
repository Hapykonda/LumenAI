"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageCircle,
  Radar,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { CalendarScheduler } from "@/components/calendar-scheduler";
import { cn } from "@/lib/utils";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

type Tone = "neutral" | "active" | "warning" | "danger";

type EnterpriseCardProps = {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  dense?: boolean;
};

export function EnterpriseCard({
  children,
  className,
  accent,
  dense,
}: EnterpriseCardProps) {
  return (
    <section
      className={cn(
        "lmn-matte-card relative overflow-hidden border",
        dense ? "p-4" : "p-5 md:p-6",
        className
      )}
      style={{
        borderColor: accent
          ? `rgba(${accentA}, .16)`
          : "rgba(255,255,255,.064)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,.024), rgba(255,255,255,.004) 46%, rgba(0,0,0,.12)), #05070d",
        boxShadow:
          "0 14px 34px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.034)",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          background: accent
            ? `
              linear-gradient(135deg, rgba(${accentA}, .034), transparent 36%),
              linear-gradient(315deg, rgba(${accentB}, .024), transparent 38%),
              radial-gradient(circle at 72% 0%, rgba(255,255,255,.024), transparent 34%)
            `
            : "linear-gradient(180deg, rgba(255,255,255,.008), transparent 38%)",
        }}
      />

      <div className="relative">{children}</div>
    </section>
  );
}

function toneColor(tone: Tone) {
  if (tone === "active") return "rgb(0,220,150)";
  if (tone === "warning") return "rgb(255,190,80)";
  if (tone === "danger") return "rgb(255,92,112)";
  return `rgb(${accentA})`;
}

function toneAlpha(tone: Tone, alpha: number) {
  if (tone === "active") return `rgba(0,220,150,${alpha})`;
  if (tone === "warning") return `rgba(255,190,80,${alpha})`;
  if (tone === "danger") return `rgba(255,92,112,${alpha})`;
  return `rgba(${accentA},${alpha})`;
}

export function SignalPill({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className="apex-pill inline-flex h-7 items-center gap-2 border px-2.5 text-[11px] font-black text-white/78"
      style={{
        borderColor: toneAlpha(tone, 0.24),
        background:
          tone === "neutral"
            ? `rgba(${accentA}, .055)`
            : toneAlpha(tone, 0.10),
      }}
    >
      <span
        className="apex-pill h-1.5 w-1.5"
        style={{
          background: toneColor(tone),
          boxShadow: `0 0 14px ${toneColor(tone)}`,
        }}
      />
      {children}
    </span>
  );
}

export function ExecutiveMetric({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint: string;
  tone?: Tone;
}) {
  return (
    <EnterpriseCard dense className="min-h-[150px]">
      <div className="flex items-start justify-between gap-3">
        <div
          className="apex-cut grid h-10 w-10 place-items-center border"
          style={{
            borderColor: toneAlpha(tone, 0.20),
            background: toneAlpha(tone, 0.08),
          }}
        >
          {icon}
        </div>
        <SignalPill tone={tone}>{tone === "active" ? "OK" : tone === "warning" ? "Focus" : tone === "danger" ? "Riesgo" : "Live"}</SignalPill>
      </div>

      <div className="mt-5 text-[2.4rem] font-black leading-none text-white">
        {value}
      </div>
      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-white/48">{hint}</p>
    </EnterpriseCard>
  );
}

type OverviewStats = {
  chats_total?: number;
  chats_unread?: number;
  chats_paused?: number;
  leads_total?: number;
  leads_new?: number;
  leads_qualified?: number;
  leads_won?: number;
  kb_published?: number;
  launch_percent?: number;
};

type ExecutiveCommandCenterProps = {
  stats?: OverviewStats;
  launchPercent: number;
  urgentCount: number;
};

export function ExecutiveCommandCenter({
  stats,
  launchPercent,
  urgentCount,
}: ExecutiveCommandCenterProps) {
  const healthTone: Tone =
    launchPercent >= 78 ? "active" : launchPercent >= 48 ? "warning" : "danger";

  return (
    <div className="grid gap-4">
      <EnterpriseCard accent className="lmn-wide-card min-h-[210px]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div>
            <h2 className="max-w-3xl text-2xl font-black leading-[1.02] text-white md:text-4xl">
              Estado operativo
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 md:text-[15px]">
              Resumen compacto de atención, ventas, knowledge y prioridades del sistema.
            </p>

            <div className="mt-5 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Health", `${launchPercent}%`],
                ["Urgentes", urgentCount],
                ["Chats", stats?.chats_total ?? 0],
                ["Leads", stats?.leads_total ?? 0],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="apex-cut border border-white/[0.065] bg-black/18 p-3"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    {label}
                  </div>
                  <div className="mt-3 text-2xl font-black leading-none text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <OrbitHealth percent={launchPercent} tone={healthTone} />
        </div>
      </EnterpriseCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ExecutiveMetric
          icon={<MessageCircle className="h-4 w-4 text-white" />}
          label="Chats no leidos"
          value={stats?.chats_unread ?? 0}
          hint="Conversaciones esperando respuesta."
          tone={(stats?.chats_unread ?? 0) > 0 ? "warning" : "active"}
        />
        <ExecutiveMetric
          icon={<Target className="h-4 w-4 text-white" />}
          label="Leads nuevos"
          value={stats?.leads_new ?? 0}
          hint="Oportunidades recien capturadas."
          tone={(stats?.leads_new ?? 0) > 0 ? "warning" : "active"}
        />
        <ExecutiveMetric
          icon={<BrainMini />}
          label="Knowledge"
          value={stats?.kb_published ?? 0}
          hint="Items publicados para responder mejor."
          tone={(stats?.kb_published ?? 0) > 0 ? "active" : "warning"}
        />
        <ExecutiveMetric
          icon={<TrendingUp className="h-4 w-4 text-white" />}
          label="Ganados"
          value={stats?.leads_won ?? 0}
          hint="Cierres atribuidos a la operacion."
          tone="neutral"
        />
      </div>
    </div>
  );
}

function BrainMini() {
  return (
    <span className="relative grid h-4 w-4 place-items-center">
      <Sparkles className="h-4 w-4 text-white" />
    </span>
  );
}

function OrbitHealth({ percent, tone }: { percent: number; tone: Tone }) {
  const safe = Math.max(0, Math.min(100, percent));
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="apex-orbit lmn-readiness-orbit relative mx-auto grid aspect-square w-full max-w-[330px] place-items-center">
      <div className="lmn-readiness-glow absolute inset-0 rounded-full" />
      <svg
        className="absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lumenReadinessGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={toneColor(tone)} />
            <stop offset="54%" stopColor={`rgb(${accentA})`} />
            <stop offset="100%" stopColor={`rgb(${accentB})`} />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,.075)"
          strokeWidth="9"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#lumenReadinessGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="9"
        />
      </svg>
      <div
        className="lmn-readiness-marker absolute inset-[18px] rounded-full"
        style={{ transform: `rotate(${safe * 3.6 - 90}deg)` }}
      >
        <span
          className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
          style={{
            background: toneColor(tone),
            boxShadow: `0 0 20px ${toneColor(tone)}`,
          }}
        />
      </div>
      <div className="absolute inset-[12px] rounded-full bg-[#060912]/86" />
      <div
        className="absolute inset-[28px] rounded-full border"
        style={{
          borderColor: `rgba(${accentA}, .14)`,
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,.06), transparent 44%)",
        }}
      />
      <div className="relative text-center">
        <Radar className="mx-auto h-7 w-7 text-white/52" />
        <div className="mt-4 text-6xl font-black leading-none text-white">
          {safe}
        </div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
          Sistema listo
        </div>
      </div>
    </div>
  );
}

export function EnterpriseCalendar({
  urgentCount,
  newLeads,
  unreadChats,
}: {
  urgentCount: number;
  newLeads: number;
  unreadChats: number;
}) {
  const [customEvents, setCustomEvents] = useState<
    Array<{ day: string; title: string; meta: string; tone: Tone }>
  >([]);

  const agenda = useMemo(() => [
    {
      day: "Hoy",
      title: "Revisar oportunidades calientes",
      meta: `${newLeads} lead(s) nuevos`,
      tone: newLeads > 0 ? "warning" : "active",
    },
    {
      day: "Hoy",
      title: "Cerrar conversaciones abiertas",
      meta: `${unreadChats} chat(s) sin leer`,
      tone: unreadChats > 0 ? "warning" : "active",
    },
    {
      day: "Semana",
      title: "Auditar Knowledge y Studio",
      meta: "Calidad de respuestas",
      tone: "neutral",
    },
    ...customEvents,
  ] satisfies Array<{
    day: string;
    title: string;
    meta: string;
    tone: Tone;
  }>, [customEvents, newLeads, unreadChats]);

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)]">
      <CalendarScheduler
        className="min-h-[520px]"
        title="Crear seguimiento"
        description="Agenda llamadas, revisiones de leads o auditorias de cuenta."
        onConfirm={({ date, time }) => {
          if (!date || !time) return;

          setCustomEvents((events) =>
            [
              {
                day: date.toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "2-digit",
                }),
                title: "Seguimiento comercial programado",
                meta: `Accion manual a las ${time}`,
                tone: "neutral" as Tone,
              },
              ...events,
            ].slice(0, 4)
          );
        }}
      />

      <EnterpriseCard accent className="min-h-[520px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-white/62" />
              <h3 className="text-base font-black text-white">
                Agenda <span className="apex-marker-text text-black">inteligente</span>
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/48">
              Prioridades operativas generadas desde el estado actual del negocio.
            </p>
          </div>
          <SignalPill tone={urgentCount > 0 ? "warning" : "active"}>
            {urgentCount > 0 ? `${urgentCount} foco(s)` : "Controlado"}
          </SignalPill>
        </div>

        <div className="mt-6 grid gap-3">
          {agenda.map((item) => (
            <div
              key={`${item.day}-${item.title}-${item.meta}`}
              className="apex-cut grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border border-white/[0.065] bg-black/16 p-3"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                {item.day}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-white">{item.title}</div>
                <div className="mt-1 text-xs text-white/42">{item.meta}</div>
              </div>
              {item.tone === "active" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              ) : item.tone === "warning" ? (
                <Clock3 className="h-4 w-4 text-amber-200" />
              ) : (
                <ArrowRight className="h-4 w-4 text-white/35" />
              )}
            </div>
          ))}
        </div>
      </EnterpriseCard>
    </div>
  );
}

export function PipelineIntelligence({
  total,
  qualified,
  won,
}: {
  total: number;
  qualified: number;
  won: number;
}) {
  const stages = [
    { label: "Capturados", value: total, icon: <Zap className="h-4 w-4" /> },
    { label: "Calificados", value: qualified, icon: <Target className="h-4 w-4" /> },
    { label: "Ganados", value: won, icon: <CheckCircle2 className="h-4 w-4" /> },
  ];
  const max = Math.max(1, total, qualified, won);

  return (
    <EnterpriseCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white/62" />
            <h3 className="text-base font-black text-white">
              Pipeline intelligence
            </h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Lectura compacta del embudo comercial generado por LumenAI.
          </p>
        </div>
        <SignalPill tone={total > 0 ? "active" : "warning"}>
          {total > 0 ? "Con datos" : "Sin datos"}
        </SignalPill>
      </div>

      <div className="mt-5 grid gap-4">
        {stages.map((stage) => {
          const width = Math.max(8, Math.round((stage.value / max) * 100));

          return (
            <div key={stage.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-white/78">
                  <span className="text-white/45">{stage.icon}</span>
                  {stage.label}
                </div>
                <div className="text-sm font-black text-white">{stage.value}</div>
              </div>
              <div className="apex-progress h-2 overflow-hidden bg-white/[0.055]">
                <div
                  className="h-full"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, rgba(${accentA}, .92), rgba(${accentB}, .76))`,
                    boxShadow: `0 0 22px rgba(${accentA}, .22)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </EnterpriseCard>
  );
}

export function RiskBrief({
  checks,
}: {
  checks: Array<{ label: string; ok: boolean; detail: string }>;
}) {
  const risks = checks.filter((check) => !check.ok);

  return (
    <EnterpriseCard dense accent={risks.length > 0}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 text-white/62" />
            <h3 className="text-sm font-black text-white">Risk brief</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/42">
            Lo minimo que conviene resolver para vender con seguridad.
          </p>
        </div>
        <SignalPill tone={risks.length ? "warning" : "active"}>
          {risks.length ? `${risks.length} pendiente(s)` : "Listo"}
        </SignalPill>
      </div>

      <div className="mt-4 grid gap-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="apex-cut flex items-start gap-3 border border-white/[0.055] bg-white/[0.016] p-3"
          >
            {check.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
            ) : (
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-black text-white/78">{check.label}</div>
              <div className="mt-1 text-xs leading-5 text-white/38">{check.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </EnterpriseCard>
  );
}
