"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Activity,
  Maximize2,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Star,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import SearchComponent from "@/components/animated-glowing-search-bar";
import { BorderBeam } from "@/components/ui/border-beam";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import {
  COUNTRY_COORDS,
  resolveCountryDisplay,
  resolveCountryKey,
} from "@/lib/geo/countries";
import { panelFetch } from "@/lib/panel-fetch";
import { usePanel } from "../_components/panel-context";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { ActionButton } from "../_components/ui/ActionButton";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { GlassCard } from "../_components/ui/GlassCard";

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

const Globe = dynamic(
  () => import("@/components/ui/cobe-globe").then((mod) => mod.Globe),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-square place-items-center rounded-full border border-white/[0.055] bg-white/[0.018] text-xs font-black uppercase tracking-[0.16em] text-white/38">
        Geo
      </div>
    ),
  }
);

type Lead = {
  id: string;
  business_id: string;
  chat_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  intent: string | null;
  summary: string | null;
  status: LeadStatus;
  score: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  chat?: {
    id: string;
    title?: string | null;
    channel?: string | null;
    unread_owner?: boolean | null;
    human_takeover?: boolean | null;
    last_message?: string | null;
    last_message_at?: string | null;
    last_sender_type?: string | null;
    lead_count?: number | null;
    updated_at?: string | null;
  } | null;
};

type ApiResponse = {
  ok?: boolean;
  leads?: Lead[];
  lead?: Lead;
  stats?: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    won: number;
    lost: number;
    avgScore: number;
    hot: number;
  };
  error?: string;
};

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  won: "Ganado",
  lost: "Perdido",
};

const STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Nuevos" },
  { value: "contacted", label: "Contactados" },
  { value: "qualified", label: "Calificados" },
  { value: "won", label: "Ganados" },
  { value: "lost", label: "Perdidos" },
];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function statusTone(status: LeadStatus): "active" | "warning" | "muted" | "danger" {
  if (status === "won") return "active";
  if (status === "lost") return "danger";
  if (status === "new") return "warning";
  return "muted";
}

function waLink(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  return `https://wa.me/${digits}`;
}

function leadTitle(lead: Lead) {
  return lead.name || lead.chat?.title || lead.phone || lead.email || "Lead sin nombre";
}

function scoreLabel(score: number) {
  if (score >= 75) return "Alta intención";
  if (score >= 45) return "Interés medio";
  return "Interés bajo";
}

function readLeadCountry(lead: Lead) {
  const meta =
    lead.metadata && typeof lead.metadata === "object"
      ? (lead.metadata as Record<string, unknown>)
      : {};

  const nestedGeo =
    meta.geo && typeof meta.geo === "object"
      ? (meta.geo as Record<string, unknown>)
      : {};

  const value =
    meta.country ??
    meta.country_name ??
    meta.geo_country ??
    meta.location_country ??
    nestedGeo.country;
  const code =
    meta.countryCode ??
    meta.country_code ??
    nestedGeo.countryCode ??
    nestedGeo.country_code;

  const key = resolveCountryKey(value, code);
  if (!key || key === "sin datos" || key === "unknown") return null;

  return {
    key,
    name: resolveCountryDisplay(value, code) || clean(value) || key,
  };
}

function readLeadSignals(lead: Lead) {
  const meta =
    lead.metadata && typeof lead.metadata === "object"
      ? (lead.metadata as Record<string, unknown>)
      : {};
  const last =
    meta.lastDetection && typeof meta.lastDetection === "object"
      ? (meta.lastDetection as Record<string, unknown>)
      : {};
  const signals =
    meta.signals && typeof meta.signals === "object"
      ? (meta.signals as Record<string, unknown>)
      : last.signals && typeof last.signals === "object"
      ? (last.signals as Record<string, unknown>)
      : {};

  const urgency = String(meta.urgency ?? last.urgency ?? signals.urgency ?? "").trim();
  const sentiment = String(meta.sentiment ?? last.sentiment ?? signals.sentiment ?? "").trim();
  const nextBestAction = String(
    meta.nextBestAction ?? last.nextBestAction ?? signals.nextBestAction ?? ""
  ).trim();
  const rawObjections = meta.objections ?? last.objections ?? signals.objections;
  const objections = Array.isArray(rawObjections)
    ? rawObjections.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return { urgency, sentiment, objections, nextBestAction };
}

function compactText(value?: string | null, max = 132) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function leadsSignature(leads: Lead[]) {
  return leads
    .map((lead) =>
      [
        lead.id,
        lead.status,
        lead.score,
        lead.updated_at,
        lead.chat?.unread_owner ? 1 : 0,
        lead.chat?.human_takeover ? 1 : 0,
      ].join(":")
    )
    .join("|");
}

export default function LeadsPage() {
  const { loading } = usePanel();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [fetching, setFetching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const total = leads.length;

    return {
      total,
      new: leads.filter((lead) => lead.status === "new").length,
      contacted: leads.filter((lead) => lead.status === "contacted").length,
      qualified: leads.filter((lead) => lead.status === "qualified").length,
      won: leads.filter((lead) => lead.status === "won").length,
      lost: leads.filter((lead) => lead.status === "lost").length,
      hot: leads.filter((lead) => Number(lead.score || 0) >= 70).length,
      avgScore:
        total > 0
          ? Math.round(
              leads.reduce((acc, lead) => acc + Number(lead.score || 0), 0) /
                total
            )
          : 0,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();

    return leads.filter((lead) => {
      const okStatus = status === "all" ? true : lead.status === status;

      const content = [
        lead.name,
        lead.email,
        lead.phone,
        lead.intent,
        lead.summary,
        lead.source,
        lead.status,
        lead.chat?.channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okQuery = !needle || content.includes(needle);

      return okStatus && okQuery;
    });
  }, [leads, query, status]);

  const priorityLead = useMemo(() => {
    return [...leads]
      .filter((lead) => lead.status !== "won" && lead.status !== "lost")
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  }, [leads]);

  async function loadLeads() {
    setErr(null);
    setFetching(true);

    try {
      const queryString = status !== "all" ? `?status=${status}` : "";
      const res = await panelFetch(`/api/panel/leads${queryString}`, {
        method: "GET",
      });

      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || json.ok === false) {
        setErr(json.error || "No se pudieron cargar los leads.");
        setLeads([]);
        return;
      }

      const nextLeads = Array.isArray(json.leads) ? json.leads : [];

      setLeads((prev) =>
        leadsSignature(prev) === leadsSignature(nextLeads) ? prev : nextLeads
      );
    } catch {
      setErr("No se pudo conectar con /api/panel/leads.");
      setLeads([]);
    } finally {
      setFetching(false);
    }
  }

  async function updateLeadStatus(id: string, nextStatus: LeadStatus) {
    const previous = leads;

    setUpdatingId(id);
    setErr(null);

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              status: nextStatus,
              updated_at: new Date().toISOString(),
            }
          : lead
      )
    );

    try {
      const res = await panelFetch("/api/panel/leads", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          status: nextStatus,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || json.ok === false) {
        setLeads(previous);
        setErr(json.error || "No se pudo actualizar el lead.");
        return;
      }

      if (json.lead) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === json.lead?.id ? json.lead : lead))
        );
      }
    } catch {
      setLeads(previous);
      setErr("No se pudo conectar con /api/panel/leads.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function createLead() {
    if (creating) return;

    const name = window.prompt("Nombre del lead:");
    if (name === null) return;

    const phone = window.prompt("WhatsApp o teléfono:");
    if (phone === null) return;

    const intent = window.prompt("Interés del cliente:");
    if (intent === null) return;

    setCreating(true);
    setErr(null);

    try {
      const res = await panelFetch("/api/panel/leads", {
        method: "POST",
        body: JSON.stringify({
          name: clean(name),
          phone: clean(phone),
          intent: clean(intent),
          summary: clean(intent),
          source: "panel",
          status: "new",
          score: 50,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || json.ok === false) {
        setErr(json.error || "No se pudo crear el lead.");
        return;
      }

      await loadLeads();
    } catch {
      setErr("No se pudo conectar con /api/panel/leads.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (!loading) {
      void loadLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, status]);

  useEffect(() => {
    if (loading) return;

    let visible = document.visibilityState !== "hidden";

    const interval = window.setInterval(() => {
      if (!visible) return;
      void loadLeads();
    }, 30000);

    const handleVisibility = () => {
      visible = document.visibilityState !== "hidden";

      if (visible) {
        void loadLeads();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, status]);

  return (
    <main className="grid gap-5 pb-10">
      <PanelSectionHeader
        variant="hero"
        eyebrow="CRM comercial"
        title="Pipeline comercial"
        description="Gestiona oportunidades detectadas por LumenAI: contacto, intención, score, conversación y estado de cierre."
        status={`${stats.total} lead(s)`}
        statusTone={stats.new > 0 ? "warning" : "muted"}
        secondary={
          <div className="flex flex-wrap gap-2">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => void loadLeads()}
              disabled={loading || fetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
              {fetching ? "Actualizando…" : "Actualizar"}
            </ActionButton>

            <ActionButton
              type="button"
              variant="primary"
              onClick={() => void createLead()}
              disabled={creating}
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? "Creando…" : "Nuevo lead"}
            </ActionButton>
          </div>
        }
      />

      {err ? (
        <div className="rounded-[16px] border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-100" role="alert">
          {err}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Total"
          value={stats.total}
          text="Leads registrados."
        />

        <MetricCard
          icon={<Target className="h-4 w-4" />}
          label="Nuevos"
          value={stats.new}
          text="Pendientes de contactar."
          hot={stats.new > 0}
        />

        <MetricCard
          icon={<Star className="h-4 w-4" />}
          label="Hot leads"
          value={stats.hot}
          text="Score sobre 70%."
          hot={stats.hot > 0}
        />

        <MetricCard
          icon={<Trophy className="h-4 w-4" />}
          label="Ganados"
          value={stats.won}
          text={`Score medio ${stats.avgScore}%.`}
        />
      </section>

      <GlassCard variant="soft" className="lmn-leads-intel-bridge p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-10 w-10 place-items-center border border-white/[0.055] bg-white/[0.018]">
              <Activity className="h-4 w-4 text-white/62" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                Inteligencia conectada
              </div>
              <h3 className="mt-1 text-lg font-black tracking-[-0.035em] text-white">
                Pulse Radar y Lumen Eye detectaron señales relacionadas.
              </h3>
              <p className="mt-1 text-sm leading-6 text-white/46">
                Usa Lumen Eye para ver zonas y señales; usa Pulse Radar para decidir la siguiente mejor accion.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ActionButton href="/panel/lumen-eye" variant="secondary">
              Abrir Lumen Eye
              <ArrowRight className="h-3.5 w-3.5" />
            </ActionButton>
            <ActionButton href="/panel/radar" variant="primary">
              Abrir Pulse Radar
              <ArrowRight className="h-3.5 w-3.5" />
            </ActionButton>
          </div>
        </div>
      </GlassCard>

      <LeadCommandCenter stats={stats} priorityLead={priorityLead} />

      <LeadGeoInsights leads={leads} />

      <section className="rounded-[20px] border border-white/[0.06] bg-white/[0.018] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <SearchComponent
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre, contacto, interes, resumen u origen..."
          />

          <select
            aria-label="Filtrar leads por estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}
            className="h-12 rounded-[14px] border border-white/[0.07] bg-black/20 px-3 text-sm text-white outline-none"
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value} className="bg-[#080b12]">
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((item) => {
            const active = status === item.value;
            const count =
              item.value === "all"
                ? stats.total
                : stats[item.value as LeadStatus] ?? 0;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                  active
                    ? "border-white/18 bg-white/[0.07] text-white"
                    : "border-white/[0.07] bg-white/[0.02] text-white/55 hover:bg-white/[0.04]"
                }`}
              >
                {item.label} · {count}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3">
          {loading || fetching ? (
            <LeadEmpty
              title="Cargando leads…"
              text="Estamos leyendo las oportunidades comerciales."
            />
          ) : filtered.length === 0 ? (
            <LeadEmpty
              title="No hay leads en esta vista"
              text="Prueba cambiando el filtro o limpiando la búsqueda. Cuando el widget detecte intención de compra, aparecerán aquí."
            />
          ) : (
            filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                updating={updatingId === lead.id}
                onStatus={(nextStatus) =>
                  void updateLeadStatus(lead.id, nextStatus)
                }
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function LeadCommandCenter({
  stats,
  priorityLead,
}: {
  stats: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    won: number;
    lost: number;
    hot: number;
    avgScore: number;
  };
  priorityLead?: Lead;
}) {
  const activePipeline = stats.new + stats.contacted + stats.qualified;
  const closeRate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
  const priorityScore = Number(priorityLead?.score || 0);
  const stages = [
    { label: "Nuevo", value: stats.new, tone: "rgba(0,229,255,.78)" },
    { label: "Contactado", value: stats.contacted, tone: "rgba(0,140,255,.72)" },
    { label: "Calificado", value: stats.qualified, tone: "rgba(27,67,255,.72)" },
    { label: "Ganado", value: stats.won, tone: "rgba(70,220,160,.72)" },
  ];

  return (
    <GlassCard variant="strong" accent className="relative overflow-hidden p-0">
      <BorderBeam
        size={220}
        duration={15}
        colorFrom="#00E5FF"
        colorTo="#6C3BFF"
        borderWidth={1}
      />
      <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.032] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/46">
            <Target className="h-3.5 w-3.5" />
            Revenue command
          </div>

          <h3 className="mt-4 max-w-3xl text-3xl font-black leading-[0.96] tracking-[-0.06em] text-white md:text-4xl">
            Prioriza el lead correcto y convierte sin perder contexto.
          </h3>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/54">
            LumenAI debe actuar como copiloto comercial: detecta intencion,
            ordena el pipeline y deja claro el siguiente movimiento.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CommandStat label="Pipeline activo" value={activePipeline} />
            <CommandStat label="Hot leads" value={stats.hot} />
            <CommandStat label="Win rate" value={`${closeRate}%`} />
          </div>
        </div>

        <div className="rounded-[24px] border border-white/[0.070] bg-black/30 p-4">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.060] pb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                Siguiente accion
              </div>
              <div className="mt-2 text-xl font-black tracking-[-0.05em] text-white">
                {priorityLead ? leadTitle(priorityLead) : "Esperando primer lead"}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {priorityLead
                  ? `Score ${priorityScore}%. Revisa la conversacion y cierra por el canal mas directo.`
                  : "Cuando el widget detecte intencion comercial, aparecera aqui el proximo lead prioritario."}
              </p>
            </div>
            <StatusBadge tone={priorityLead ? "active" : "muted"}>
              {priorityLead ? scoreLabel(priorityScore) : "Standby"}
            </StatusBadge>
          </div>

          <div className="mt-4 grid gap-2">
            {stages.map((stage) => {
              const width =
                stats.total > 0
                  ? Math.max(8, Math.round((stage.value / stats.total) * 100))
                  : 8;

              return (
                <div
                  key={stage.label}
                  className="rounded-[14px] border border-white/[0.055] bg-white/[0.020] p-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs font-black text-white/68">
                    <span>{stage.label}</span>
                    <span>{stage.value}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${stage.tone}, rgba(108,59,255,.58))`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {priorityLead ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {priorityLead.chat_id ? (
                <ActionButton href={`/panel/chat/${priorityLead.chat_id}`} variant="primary">
                  Abrir conversacion
                  <ArrowRight className="h-3.5 w-3.5" />
                </ActionButton>
              ) : null}

              {waLink(priorityLead.phone) ? (
                <a
                  href={waLink(priorityLead.phone) || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white no-underline transition hover:bg-white/[0.06]"
                >
                  <Phone className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}

function CommandStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[18px] border border-white/[0.065] bg-white/[0.024] p-4">
      <div className="text-2xl font-black tracking-[-0.06em] text-white">{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
        {label}
      </div>
    </div>
  );
}

function LeadGeoInsights({ leads }: { leads: Lead[] }) {
  const [expanded, setExpanded] = useState(false);
  const expandedDialogRef = useModalAccessibility<HTMLDivElement>({
    active: expanded,
    onClose: () => setExpanded(false),
  });
  const countries = useMemo(() => {
    const map = new Map<
      string,
      { country: string; countryKey: string; count: number; hot: number }
    >();

    leads.forEach((lead) => {
      const country = readLeadCountry(lead);
      if (!country) return;

      const current =
        map.get(country.key) ?? {
          country: country.name,
          countryKey: country.key,
          count: 0,
          hot: 0,
        };
      current.count += 1;
      current.hot += Number(lead.score || 0) >= 70 ? 1 : 0;
      map.set(country.key, current);
    });

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [leads]);

  const markers = countries
    .map((item) => ({
      id: item.countryKey.replace(/\s+/g, "-"),
      label: item.country,
      location: COUNTRY_COORDS[item.countryKey],
      count: item.count,
      hot: item.hot,
    }))
    .filter((item): item is {
      id: string;
      label: string;
      location: [number, number];
      count: number;
      hot: number;
    } => Boolean(item.location))
    .slice(0, 6);

  const topCountry = countries[0];
  const hasGeoData = countries.length > 0;
  const totalGeoLeads = countries.reduce((acc, item) => acc + item.count, 0);
  const hotTotal = countries.reduce((acc, item) => acc + item.hot, 0);
  const hotRate = totalGeoLeads ? Math.round((hotTotal / totalGeoLeads) * 100) : 0;
  const plottedCount = markers.length;
  const leadArcs =
    markers.length > 1
      ? markers.slice(1, 6).map((item) => ({
          id: `lead-route-${markers[0].id}-${item.id}`,
          from: markers[0].location,
          to: item.location,
          label: item.label,
        }))
      : [];

  return (
    <>
    <section className="lmn-leads-globe-shell relative overflow-hidden">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 28% 42%, rgba(var(--lmn-accent-rgb,0,140,255),.22), transparent 34%), radial-gradient(circle at 68% 26%, rgba(var(--lmn-accent-2-rgb,108,59,255),.15), transparent 30%)",
          }}
        />

        <div className="relative grid xl:grid-cols-[minmax(430px,0.95fr)_minmax(0,1.05fr)]">
          <div
            role="button"
            tabIndex={0}
            className="lmn-leads-globe-stage group relative min-h-[560px] cursor-pointer overflow-hidden p-5 outline-none md:min-h-[680px] md:p-7"
            onClick={() => setExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setExpanded(true);
              }
            }}
            aria-label="Expandir planeta de leads"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-10 h-44 rounded-full blur-3xl"
              style={{
                background:
                  "linear-gradient(90deg, rgba(var(--lmn-accent-rgb,0,140,255),.20), rgba(var(--lmn-accent-2-rgb,108,59,255),.14))",
              }}
            />

            <div className="relative mx-auto flex min-h-[520px] max-w-[780px] items-center justify-center xl:min-h-[640px]">
              <div className="pointer-events-none absolute inset-[6%] rounded-full border border-white/[0.018]" />
              <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/[0.014]" />
              <div className="pointer-events-none absolute inset-[30%] rounded-full border border-white/[0.012]" />

              <div className="absolute left-0 top-0 z-20 lmn-geo-value-tile px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  Market globe
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  {topCountry?.country || "Sin datos geo"}
                </div>
              </div>

              <div className="absolute bottom-0 right-0 z-20 lmn-geo-value-tile px-4 py-3 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  Leads rastreados
                </div>
                <div className="mt-1 text-4xl font-black text-white">
                  {totalGeoLeads}
                </div>
              </div>

              <div className="absolute right-0 top-0 z-20 hidden lmn-geo-value-tile px-4 py-3 text-right md:block">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  Hot intent
                </div>
                <div className="mt-1 text-3xl font-black text-white">
                  {hotRate}%
                </div>
              </div>

              <div className="absolute bottom-0 left-0 z-20 hidden lmn-geo-value-tile px-4 py-3 md:block">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                  Paises visibles
                </div>
                <div className="mt-1 text-3xl font-black text-white">
                  {plottedCount}
                </div>
              </div>

              <Globe
                markers={markers}
                arcs={leadArcs}
                className="lmn-leads-globe-canvas relative w-full max-w-[760px] drop-shadow-[0_40px_110px_rgba(0,0,0,.62)]"
                dark={1}
                mapBrightness={5.4}
                diffuse={1.18}
                mapSamples={18000}
                markerSize={0.044}
                markerElevation={0.03}
                arcWidth={0.72}
                arcHeight={0.34}
                speed={0.0024}
                emptyLabel="Sin paises aun"
              />

              <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/22 px-3 py-2 text-[11px] font-black text-white/58 backdrop-blur-xl transition group-hover:text-white">
                <Maximize2 className="size-3.5" />
                Click para expandir mapa
              </div>
            </div>
          </div>

          <div className="relative p-5 md:p-7 xl:p-8">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
              Inteligencia comercial
            </div>
            <h3 className="mt-3 max-w-[680px] text-3xl font-black tracking-[-0.055em] text-white md:text-5xl">
              Mapa de demanda global
            </h3>
            <p className="mt-4 max-w-[680px] text-sm leading-7 text-white/54">
              El planeta muestra de que paises llegan oportunidades reales del widget. Usa esta lectura para decidir donde invertir campanas, ventas y soporte.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <GeoValueTile icon={<Target className="size-3" />} label="Paises" value={hasGeoData ? countries.length : 0} />
              <GeoValueTile icon={<Users className="size-3" />} label="Leads geo" value={totalGeoLeads} />
              <GeoValueTile icon={<Star className="size-3" />} label="Calientes" value={hotTotal} />
            </div>

            <div className="mt-6 apex-cut border border-white/[0.065] bg-black/18 p-4 md:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-white">
                    Ranking de demanda
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-white/42">
                    Paises con mas leads registrados.
                  </p>
                </div>
                <div className="apex-cut border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-black text-white/70">
                  {markers.length ? `${markers.length} visibles` : "Sin mapa"}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {hasGeoData ? (
                  countries.slice(0, 6).map((item, index) => {
                    const percent = totalGeoLeads
                      ? Math.round((item.count / totalGeoLeads) * 100)
                      : 0;
                    const canPlot = Boolean(COUNTRY_COORDS[item.countryKey]);

                    return (
                      <div
                        key={item.countryKey}
                        className="lmn-geo-country-card p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="lmn-geo-rank grid size-7 shrink-0 place-items-center text-[11px] font-black text-white/66">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black capitalize text-white">
                                {item.country}
                              </div>
                              <div className="mt-0.5 text-[11px] font-bold text-white/34">
                                {item.hot} lead(s) calientes
                                {canPlot ? " · en planeta" : " · sin coordenada"}
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-black text-white/56">
                            {item.count} · {percent}%
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percent}%`,
                              background:
                                "linear-gradient(90deg, rgb(var(--lmn-accent-rgb,0,140,255)), rgb(var(--lmn-accent-2-rgb,108,59,255)))",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="lmn-geo-country-card p-4 text-sm leading-6 text-white/48">
                    Aun no hay paises asociados a leads reales. Cuando el widget registre ubicacion por headers del hosting, este mapa mostrara donde hay mas intencion comercial.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {expanded ? (
      <div
        ref={expandedDialogRef}
        className="lmn-leads-globe-expanded fixed inset-0 z-[200] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Mapa global de leads"
        tabIndex={-1}
      >
        <div
          className="lmn-globe-expanded-backdrop absolute inset-0 bg-black/78 backdrop-blur-2xl"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(780px 420px at 22% 14%, rgba(var(--lmn-accent-rgb,0,140,255),.18), transparent 66%), radial-gradient(720px 420px at 80% 76%, rgba(var(--lmn-accent-2-rgb,108,59,255),.16), transparent 68%)",
          }}
        />

        <Globe
          markers={markers}
          arcs={leadArcs}
          className="lmn-expanded-globe-canvas pointer-events-auto absolute left-1/2 top-1/2 z-[1] w-[min(1120px,104vw)] -translate-x-1/2 -translate-y-1/2 opacity-95 drop-shadow-[0_60px_160px_rgba(0,0,0,.78)]"
          dark={1}
          mapBrightness={6.2}
          diffuse={1.12}
          mapSamples={22000}
          markerSize={0.052}
          markerElevation={0.04}
          arcWidth={0.92}
          arcHeight={0.42}
          speed={0.003}
          emptyLabel="Sin paises aun"
        />

        <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_center,transparent_0%,transparent_42%,rgba(0,0,0,.42)_78%,rgba(0,0,0,.82)_100%)]" />

        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="lmn-geo-close absolute right-5 top-5 z-20 inline-flex size-11 items-center justify-center text-white"
          aria-label="Cerrar mapa global"
        >
          <X className="size-5" />
        </button>

        <div className="relative z-10 flex min-h-full flex-col justify-between gap-8 p-5 md:p-8">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="max-w-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
                Global lead intelligence
              </div>
              <h3 className="mt-3 text-4xl font-black leading-none tracking-[-0.06em] text-white md:text-6xl">
                Planeta de demanda
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/58">
                Leads, mercados calientes y rutas de interes flotando sobre el planeta en tiempo real.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:min-w-[520px]">
              <GeoValueTile icon={<Target className="size-3" />} label="Paises" value={hasGeoData ? countries.length : 0} />
              <GeoValueTile icon={<Users className="size-3" />} label="Leads" value={totalGeoLeads} />
              <GeoValueTile icon={<Star className="size-3" />} label="Hot" value={`${hotRate}%`} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr_minmax(280px,380px)] lg:items-end">
            <div className="grid gap-3">
              {countries.slice(0, 3).map((item, index) => {
                const percent = totalGeoLeads
                  ? Math.round((item.count / totalGeoLeads) * 100)
                  : 0;

                return (
                  <GeoCountryRow
                    key={`expanded-left-${item.countryKey}`}
                    index={index}
                    country={item.country}
                    count={item.count}
                    hot={item.hot}
                    percent={percent}
                    canPlot={Boolean(COUNTRY_COORDS[item.countryKey])}
                  />
                );
              })}
            </div>

            <div className="hidden min-h-[360px] lg:block" />

            <div className="grid gap-3">
              <GeoValueTile icon={<Maximize2 className="size-3" />} label="Top market" value={topCountry?.country || "Sin datos"} />
              <GeoValueTile icon={<Trophy className="size-3" />} label="Rutas visibles" value={leadArcs.length} />
              <GeoValueTile icon={<MessageCircle className="size-3" />} label="Accion" value="Priorizar" />
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function GeoValueTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="lmn-geo-value-tile p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
        {icon}
        {label}
      </div>
      <div className="mt-3 truncate text-3xl font-black tracking-[-0.06em] text-white md:text-4xl">
        {value}
      </div>
    </div>
  );
}

function GeoCountryRow({
  index,
  country,
  count,
  hot,
  percent,
  canPlot,
}: {
  index: number;
  country: string;
  count: number;
  hot: number;
  percent: number;
  canPlot: boolean;
}) {
  return (
    <div className="lmn-geo-country-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="lmn-geo-rank grid size-7 shrink-0 place-items-center text-[11px] font-black text-white/66">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-black capitalize text-white">
              {country}
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-white/38">
              {hot} lead(s) calientes
              {canPlot ? " - en planeta" : " - sin coordenada"}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-xs font-black text-white/58">
          {count} - {percent}%
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.042]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background:
              "linear-gradient(90deg, rgb(var(--lmn-accent-rgb,0,140,255)), rgb(var(--lmn-accent-2-rgb,108,59,255)))",
          }}
        />
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  updating,
  onStatus,
}: {
  lead: Lead;
  updating: boolean;
  onStatus(status: LeadStatus): void;
}) {
  const whatsapp = waLink(lead.phone);
  const hot = Number(lead.score || 0) >= 70;
  const leadCount = Math.max(1, Number(lead.chat?.lead_count ?? 1));
  const lastMessage = compactText(
    lead.chat?.last_message || lead.summary || lead.intent,
    150
  );
  const chatTitle = lead.chat?.title || leadTitle(lead);
  const country = readLeadCountry(lead);
  const senderLabel =
    lead.chat?.last_sender_type === "assistant"
      ? "LumenAI"
      : lead.chat?.last_sender_type === "owner"
      ? "Equipo"
      : lead.chat?.last_sender_type
      ? "Cliente"
      : "Ultimo mensaje";
  const signals = readLeadSignals(lead);

  return (
    <article
      className="apex-cut border p-4 transition hover:border-white/14 hover:bg-white/[0.024]"
      style={{
        borderColor: hot
          ? "rgba(var(--lmn-accent-rgb,0,140,255),.22)"
          : "rgba(255,255,255,.065)",
        background: hot
          ? "radial-gradient(520px 220px at 0% 0%, rgba(var(--lmn-accent-rgb,0,140,255),.11), transparent 58%), linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.014))"
          : "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012))",
      }}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {lead.chat_id ? (
              <Link
                href={`/panel/chat/${lead.chat_id}`}
                className="min-w-0 max-w-full truncate text-xl font-black tracking-[-0.035em] text-white no-underline hover:text-white/84"
              >
                {chatTitle}
              </Link>
            ) : (
              <h3 className="m-0 min-w-0 max-w-full truncate text-xl font-black tracking-[-0.035em] text-white">
                {chatTitle}
              </h3>
            )}

            <StatusBadge tone={statusTone(lead.status)}>
              {STATUS_LABELS[lead.status] || lead.status}
            </StatusBadge>

            <StatusBadge tone={hot ? "active" : "muted"}>
              {scoreLabel(lead.score)} · {lead.score ?? 0}%
            </StatusBadge>

            <StatusBadge tone="muted">
              {leadCount} lead{leadCount === 1 ? "" : "s"} en este chat
            </StatusBadge>

            {lead.chat?.unread_owner ? (
              <StatusBadge tone="warning">Chat nuevo</StatusBadge>
            ) : null}

            {lead.chat?.human_takeover ? (
              <StatusBadge tone="warning">IA pausada</StatusBadge>
            ) : null}

            {signals.urgency === "alta" ? (
              <StatusBadge tone="warning">Urgente</StatusBadge>
            ) : null}

            {signals.sentiment === "riesgo" ? (
              <StatusBadge tone="warning">Riesgo</StatusBadge>
            ) : null}

            {signals.objections.slice(0, 1).map((objection) => (
              <StatusBadge key={objection} tone="muted">
                Objecion: {objection}
              </StatusBadge>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-white/44">
            {lead.phone ? <span>{lead.phone}</span> : null}
            {lead.email ? <span>{lead.email}</span> : null}
            <span>{lead.chat?.channel || lead.source || "widget"}</span>
            <span>Actualizado: {formatDate(lead.chat?.last_message_at || lead.updated_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          <select
            aria-label={`Estado de ${lead.name || "lead"}`}
            value={lead.status}
            disabled={updating}
            onChange={(e) => onStatus(e.target.value as LeadStatus)}
              className="h-10 rounded-[8px] border border-white/[0.075] bg-black/25 px-3 text-xs font-bold text-white outline-none disabled:opacity-50"
          >
            {VALID_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-[#080b12]">
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          {lead.chat_id ? (
            <Link
              href={`/panel/chat/${lead.chat_id}`}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white no-underline transition hover:bg-white/[0.06]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Abrir chat
            </Link>
          ) : null}

          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-white no-underline transition hover:bg-white/[0.06]"
            >
              <Phone className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      <Link
        href={lead.chat_id ? `/panel/chat/${lead.chat_id}` : "/panel/leads"}
        className="apex-cut mt-3 grid gap-2 border border-white/[0.055] bg-black/16 p-3 no-underline transition hover:bg-white/[0.035]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            {senderLabel}
          </span>
          {lead.intent ? (
            <span className="max-w-[320px] truncate text-xs font-bold text-white/44">
              {compactText(lead.intent, 68)}
            </span>
          ) : null}
        </div>
        <p className="m-0 line-clamp-2 text-sm font-semibold leading-6 text-white/66">
          {lastMessage || "Sin mensajes todavia. Abre el chat para revisar el contexto completo."}
        </p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/34">
        <span>Creado: {formatDate(lead.created_at)}</span>
        {country ? <span>Pais: {country.name}</span> : null}
        {signals.nextBestAction ? (
          <span className="text-white/48">Siguiente accion: {signals.nextBestAction}</span>
        ) : null}
      </div>
    </article>
  );
}

function MetricCard({
  icon,
  label,
  value,
  text,
  hot,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  text: string;
  hot?: boolean;
}) {
  return (
    <GlassCard hover variant="soft" accent={hot} className="lmn-kpi-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className="lmn-kpi-icon flex h-10 w-10 items-center justify-center"
          style={{
            borderColor: hot
              ? "rgba(var(--lmn-accent-rgb,0,140,255),.22)"
              : "rgba(255,255,255,.08)",
            background: hot
              ? "linear-gradient(135deg, rgba(var(--lmn-accent-rgb,0,140,255),.12), rgba(var(--lmn-accent-2-rgb,108,59,255),.08))"
              : "rgba(255,255,255,.035)",
          }}
        >
          {icon}
        </div>

        {hot ? <StatusBadge tone="warning">Atención</StatusBadge> : null}
      </div>

      <div className="lmn-kpi-value mt-5 font-black">
        {value}
      </div>

      <div className="lmn-kpi-label mt-3 text-xs font-black uppercase">
        {label}
      </div>

      <p className="mt-2 text-sm leading-6 text-white/48">{text}</p>

      <div className="lmn-kpi-rail mt-4">
        <span style={{ width: hot ? "74%" : "46%" }} />
      </div>
    </GlassCard>
  );
}

function LeadEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[190px] place-items-center rounded-[18px] border border-white/[0.065] bg-white/[0.018] p-6 text-center">
      <div>
        <div className="text-[22px] font-black tracking-[-0.05em] text-white">
          {title}
        </div>

        <p className="mx-auto mt-2 max-w-[540px] text-sm leading-6 text-white/48">
          {text}
        </p>
      </div>
    </div>
  );
}
