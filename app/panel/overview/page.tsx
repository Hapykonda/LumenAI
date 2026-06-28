"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Clock3,
  GitBranch,
  HeartPulse,
  Megaphone,
  MessageCircle,
  Newspaper,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { GlassCard } from "../_components/ui/GlassCard";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { ActionButton } from "../_components/ui/ActionButton";
import {
  PipelineIntelligence,
  RiskBrief,
} from "../_components/enterprise/ObsidianSuite";
import {
  LumenInsightCarousel,
  LumenSearchDock,
} from "../_components/enterprise/Lumen21Suite";
import { COUNTRY_COORDS } from "@/lib/geo/countries";
import { BorderBeam } from "@/components/ui/border-beam";
import { PromptInputBox } from "@/components/ai-prompt-box";
import { LumenMagicFlow } from "../_components/LumenMagicFlow";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

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

type OverviewData = {
  ok?: boolean;
  error?: string;
  business?: {
    id: string;
    name: string;
    public_key: string | null;
  };
  widget?: {
    enabled: boolean;
    assistant_name: string;
    published_at: string | null;
    updated_at: string | null;
    has_contact: boolean;
    whatsapp: string | null;
    email: string | null;
  };
  checks?: Record<string, boolean>;
  stats?: {
    chats_total: number;
    chats_unread: number;
    chats_paused: number;
    chats_widget: number;

    leads_total: number;
    leads_new: number;
    leads_contacted: number;
    leads_qualified: number;
    leads_won: number;
    leads_lost: number;

    kb_total: number;
    kb_published: number;
    kb_services: number;
    kb_pricing: number;
    kb_faq: number;
    kb_policy: number;
    kb_contact: number;
    kb_payment?: number;

    launch_percent: number;
    launch_done: number;
    launch_total: number;
  };
  performance?: {
    leadFunnel: Array<{ key: string; label: string; value: number; percent: number }>;
    channels: Array<{ key: string; label: string; value: number; percent: number }>;
    knowledgeMix: Array<{ key: string; label: string; value: number; percent: number }>;
    hourlyActivity: Array<{
      hour: number;
      label: string;
      value: number;
      customers: number;
      assistant: number;
    }>;
    growthSeries: Array<{
      date: string;
      label: string;
      widgetUsers: number;
      leads: number;
      buyers: number;
    }>;
    geo: Array<{
      country: string;
      countryKey?: string;
      people: number;
      leads: number;
      hot: number;
      messages: number;
    }>;
  };
  recentLeads?: Array<{
    id: string;
    chat_id: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    status: string;
    score: number;
    intent: string | null;
    source: string;
    created_at: string;
  }>;
  recentMessages?: Array<{
    id: string;
    chat_id: string;
    sender_type: string;
    content: string;
    created_at: string;
  }>;
};

type RecentLead = NonNullable<OverviewData["recentLeads"]>[number];
type DemandPoint = NonNullable<OverviewData["performance"]>["growthSeries"][number];
type DemandKey = "widgetUsers" | "leads" | "buyers";
type AutopilotAction = {
  title: string;
  text: string;
  href: string;
  label: string;
  signal: string;
  tone: "urgent" | "setup" | "growth" | "insight";
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
  if (!value) return "â€”";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "â€”";
  }
}

function leadStatusLabel(status?: string | null) {
  if (status === "new") return "Nuevo";
  if (status === "contacted") return "Contactado";
  if (status === "qualified") return "Calificado";
  if (status === "won") return "Ganado";
  if (status === "lost") return "Perdido";
  return status || "Lead";
}

function leadName(lead: RecentLead) {
  return lead.name || lead.phone || lead.email || "Lead sin nombre";
}

function buildAutopilotActions(data: OverviewData | null, urgentCount: number): AutopilotAction[] {
  const stats = data?.stats;
  const geo = data?.performance?.geo ?? [];
  const topCountry = geo
    .filter((item) => item.country !== "unknown")
    .sort((a, b) => (b.leads + b.messages + b.hot) - (a.leads + a.messages + a.hot))[0];

  const actions: AutopilotAction[] = [];

  if ((stats?.chats_unread ?? 0) > 0) {
    actions.push({
      title: "Responder chats pendientes",
      text: "Hay conversaciones esperando respuesta. Resolverlas ahora evita perder oportunidades calientes.",
      href: "/panel/chat",
      label: "Abrir chat",
      signal: `${stats?.chats_unread ?? 0} sin leer`,
      tone: "urgent",
    });
  }

  if ((stats?.leads_new ?? 0) > 0) {
    actions.push({
      title: "Priorizar leads nuevos",
      text: "Conviene revisar contacto, intencion y siguiente paso antes de que se enfrien.",
      href: "/panel/leads",
      label: "Ver leads",
      signal: `${stats?.leads_new ?? 0} nuevo(s)`,
      tone: "growth",
    });
  }

  if (!data?.widget?.enabled) {
    actions.push({
      title: "Publicar el widget",
      text: "El canal publico todavia no esta activo. Sin widget no hay captacion continua desde la web.",
      href: "/panel/widget",
      label: "Configurar widget",
      signal: "pendiente",
      tone: "setup",
    });
  }

  if ((stats?.kb_services ?? 0) === 0 || (stats?.kb_pricing ?? 0) === 0) {
    actions.push({
      title: "Completar servicios y precios",
      text: "La IA necesita saber que vende el negocio y cuanto cuesta para responder con precision comercial.",
      href: "/panel/knowledge",
      label: "Completar Knowledge",
      signal: "base critica",
      tone: "setup",
    });
  }

  if ((stats?.kb_payment ?? 0) === 0) {
    actions.push({
      title: "Agregar datos de pago",
      text: "Cuando un cliente quiera pagar, LumenAI debe poder entregar instrucciones claras y ordenadas.",
      href: "/panel/knowledge",
      label: "Agregar pagos",
      signal: "cierre",
      tone: "growth",
    });
  }

  if (topCountry) {
    actions.push({
      title: `Analizar demanda en ${topCountry.country}`,
      text: "Ese mercado concentra actividad reciente. Usalo para decidir campanas, contenido o seguimiento comercial.",
      href: "/panel/leads",
      label: "Ver geo insights",
      signal: `${topCountry.messages} mensajes`,
      tone: "insight",
    });
  }

  if ((stats?.leads_total ?? 0) > 0 && (stats?.leads_won ?? 0) === 0) {
    actions.push({
      title: "Crear rutina de cierre",
      text: "Ya hay leads, pero todavia no hay ganados. Define seguimiento y respuestas de objeciones.",
      href: "/panel/calibration",
      label: "Calibrar ventas",
      signal: "sin ganados",
      tone: "growth",
    });
  }

  if (actions.length === 0 && urgentCount === 0) {
    actions.push({
      title: "Optimizar conversion",
      text: "El sistema esta estable. El siguiente salto es simular objeciones, mejorar cierres y activar follow-ups.",
      href: "/panel/calibration",
      label: "Abrir Studio",
      signal: "estable",
      tone: "insight",
    });
  }

  return actions.slice(0, 4);
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);

  const stats = data?.stats;

  const launchPercent = stats?.launch_percent ?? 0;

  const urgentCount =
    (stats?.chats_unread ?? 0) +
    (stats?.chats_paused ?? 0) +
    (stats?.leads_new ?? 0);

  const quickPriority = useMemo(() => {
    if ((stats?.chats_unread ?? 0) > 0) {
      return {
        title: "Responder chats no leÃ­dos",
        text: "Hay conversaciones nuevas esperando revisiÃ³n.",
        href: "/panel/chat",
        label: "Abrir inbox",
      };
    }

    if ((stats?.leads_new ?? 0) > 0) {
      return {
        title: "Revisar nuevos leads",
        text: "Hay oportunidades comerciales reciÃ©n capturadas.",
        href: "/panel/leads",
        label: "Ver leads",
      };
    }

    if ((stats?.kb_published ?? 0) === 0) {
      return {
        title: "Cargar Knowledge",
        text: "Sin base publicada, LumenAI no puede vender con precisiÃ³n.",
        href: "/panel/knowledge",
        label: "Completar Knowledge",
      };
    }

    if (!data?.widget?.enabled) {
      return {
        title: "Activar widget",
        text: "Publica el widget para empezar a recibir conversaciones reales.",
        href: "/panel/widget",
        label: "Abrir Widget",
      };
    }

    return {
      title: "Optimizar calibraciÃ³n",
      text: "Ajusta personalidad, tono y cierre para mejorar conversiÃ³n.",
      href: "/panel/calibration",
      label: "Abrir Studio",
    };
  }, [stats, data?.widget?.enabled]);

  const autopilotActions = useMemo(
    () => buildAutopilotActions(data, urgentCount),
    [data, urgentCount]
  );

  async function loadOverview(opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? false;

    if (!silent) {
      setLoading(true);
      setErr(null);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await apiFetch("/api/panel/overview", {
        method: "GET",
      });

      const json = (await res.json().catch(() => ({}))) as OverviewData;

      if (!res.ok || json.ok === false) {
        setErr(json.error || "No se pudo cargar Overview.");
        setData(null);
        return;
      }

      setData(json);
      setErr(null);
    } catch {
      setErr("No se pudo conectar con /api/panel/overview.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    let visible = document.visibilityState !== "hidden";

    const interval = window.setInterval(() => {
      if (!visible) return;
      void loadOverview({ silent: true });
    }, 30000);

    const handleVisibility = () => {
      visible = document.visibilityState !== "hidden";

      if (visible) {
        void loadOverview({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="lmn-overview-minimal-page flex flex-col gap-5">
      <MinimalOverviewHero
        businessName={data?.business?.name || "LumenAI"}
        launchPercent={launchPercent}
        urgentCount={urgentCount}
        chatsTotal={stats?.chats_total ?? 0}
        leadsTotal={stats?.leads_total ?? 0}
        widgetReady={Boolean(data?.checks?.widget)}
        knowledgeReady={Boolean(data?.checks?.knowledge)}
      />

      <PanelSectionHeader
        title="Centro ejecutivo"
        description="Metricas reales de leads, chats, Knowledge, widget y conversaciones que necesitan atencion."
      />

      {err ? (
        <div className="apex-cut border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-100">
          {err}
        </div>
      ) : null}

      <VisionCommandDeck
        launchPercent={launchPercent}
        widgetReady={Boolean(data?.checks?.widget)}
        knowledgeReady={Boolean(data?.checks?.knowledge)}
        leadsTotal={stats?.leads_total ?? 0}
        chatsTotal={stats?.chats_total ?? 0}
      />

      <ConfigIaOverviewOption
        launchPercent={launchPercent}
        urgentCount={urgentCount}
        widgetReady={Boolean(data?.checks?.widget)}
        knowledgeReady={Boolean(data?.checks?.knowledge)}
        quickPriority={quickPriority}
      />

      <SystemModules
        widgetReady={Boolean(data?.checks?.widget)}
        knowledgeReady={Boolean(data?.checks?.knowledge)}
        chatsTotal={stats?.chats_total ?? 0}
        leadsTotal={stats?.leads_total ?? 0}
      />

      <LumenSearchDock />

      <LumenInsightCarousel stats={stats} />

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border border-white/[0.055] bg-white/[0.014] px-4 py-3 text-sm font-semibold text-white/62 transition hover:bg-white/[0.030]">
          Analitica avanzada
          <span className="text-xs text-white/34 group-open:hidden">Mostrar</span>
          <span className="hidden text-xs text-white/34 group-open:inline">Ocultar</span>
        </summary>
        <div className="mt-4 grid gap-4">
          <OverviewGeoGlobe
            leadsTotal={stats?.leads_total ?? 0}
            geo={data?.performance?.geo ?? []}
          />

          <PerformanceCharts
            performance={data?.performance}
            stats={stats}
            loading={loading}
          />
        </div>
      </details>

      <BusinessAutopilot
        actions={autopilotActions}
        launchPercent={launchPercent}
        urgentCount={urgentCount}
        loading={loading}
        stats={stats}
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <PipelineIntelligence
          total={stats?.leads_total ?? 0}
          qualified={stats?.leads_qualified ?? 0}
          won={stats?.leads_won ?? 0}
        />

        <RiskBrief
          checks={[
            {
              label: "Knowledge publicada",
              ok: Boolean(data?.checks?.knowledge),
              detail: "Sin knowledge, la IA pierde precision comercial.",
            },
            {
              label: "Contacto configurado",
              ok: Boolean(data?.checks?.contact),
              detail: "Necesario para derivar leads hacia cierre humano.",
            },
            {
              label: "Canal publico activo",
              ok: Boolean(data?.checks?.widget),
              detail: "El canal publico debe estar activo para captar conversaciones.",
            },
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
        <GlassCard variant="soft" className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-white/58" />
                <h3 className="text-base font-semibold text-white">
                  Actividad reciente
                </h3>
              </div>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Ãšltimos mensajes registrados por widget o panel.
              </p>
            </div>

            <ActionButton href="/panel/chat" variant="secondary">
              Ver chats
              <ArrowRight className="h-3.5 w-3.5" />
            </ActionButton>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? (
              <EmptyLine text="Cargando actividadâ€¦" />
            ) : (data?.recentMessages ?? []).length === 0 ? (
              <EmptyLine text="TodavÃ­a no hay mensajes." />
            ) : (
              (data?.recentMessages ?? []).map((message) => (
                <Link
                  key={message.id}
                  href={`/panel/chat/${message.chat_id}`}
                  className="apex-cut border border-white/[0.065] bg-white/[0.018] p-3 transition hover:bg-white/[0.035]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-white/70">
                      {message.sender_type === "assistant" ? "Equipo/LumenAI" : "Cliente"}
                    </span>

                    <span className="text-[11px] text-white/35">
                      {formatDate(message.created_at)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/52">
                    {message.content || "Mensaje vacÃ­o"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard variant="soft" className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Leads recientes</h3>
              <p className="mt-1 text-xs text-white/42">
                Ãšltimas oportunidades detectadas.
              </p>
            </div>

            <StatusBadge tone={(stats?.leads_new ?? 0) > 0 ? "warning" : "muted"}>
              {stats?.leads_new ?? 0} nuevo(s)
            </StatusBadge>
          </div>

          <div className="mt-4 grid gap-2">
            {loading ? (
              <EmptyLine text="Cargando leadsâ€¦" />
            ) : (data?.recentLeads ?? []).length === 0 ? (
              <EmptyLine text="TodavÃ­a no hay leads." />
            ) : (
              (data?.recentLeads ?? []).map((lead) => (
                <Link
                  key={lead.id}
                  href={lead.chat_id ? `/panel/chat/${lead.chat_id}` : "/panel/leads"}
                  className="apex-cut border border-white/[0.065] bg-white/[0.018] p-3 transition hover:bg-white/[0.035]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-white/82">
                      {leadName(lead)}
                    </span>

                    <span className="apex-pill shrink-0 border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-white/65">
                      {lead.score ?? 0}%
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/42">
                    <span>{leadStatusLabel(lead.status)}</span>
                    <span>â€¢</span>
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </GlassCard>
      </section>

    </div>
  );
}

function MinimalOverviewHero({
  businessName,
  launchPercent,
  urgentCount,
  chatsTotal,
  leadsTotal,
  widgetReady,
  knowledgeReady,
}: {
  businessName: string;
  launchPercent: number;
  urgentCount: number;
  chatsTotal: number;
  leadsTotal: number;
  widgetReady: boolean;
  knowledgeReady: boolean;
}) {
  const readyTone = launchPercent >= 80 ? "active" : launchPercent >= 55 ? "warning" : "danger";

  return (
    <section className="lmn-minimal-overview-hero">
      <div className="lmn-minimal-overview-copy">
        <div className="lmn-minimal-overview-kicker">
          <Sparkles className="h-3.5 w-3.5" />
          LumenAI Command Center
        </div>
        <h1>{businessName} esta listo para operar con inteligencia comercial.</h1>
        <p>
          Revisa salud del sistema, conversaciones, oportunidades, Knowledge y
          cambios recomendados por Lumenite desde un centro de mando mas claro.
        </p>

        <div className="lmn-minimal-overview-actions">
          <ActionButton href="/panel/autoconfig" variant="primary">
            Configurar con IA
            <ArrowRight className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton href="/panel/widget" variant="secondary">
            Revisar widget
            <Bot className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      </div>

      <div className="lmn-minimal-overview-board">
        <div className="lmn-minimal-overview-score">
          <span>Readiness</span>
          <strong>{launchPercent}%</strong>
          <StatusBadge tone={readyTone}>
            {launchPercent >= 80 ? "Sistema listo" : "Requiere ajuste"}
          </StatusBadge>
        </div>

        <div className="lmn-minimal-overview-grid">
          {[
            ["Urgentes", urgentCount, urgentCount > 0 ? "warning" : "active"],
            ["Chats", chatsTotal, chatsTotal > 0 ? "active" : "muted"],
            ["Leads", leadsTotal, leadsTotal > 0 ? "active" : "muted"],
            ["Widget", widgetReady ? "Activo" : "Pendiente", widgetReady ? "active" : "warning"],
            ["Knowledge", knowledgeReady ? "Lista" : "Pendiente", knowledgeReady ? "active" : "warning"],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="lmn-minimal-overview-tile">
              <span>{label}</span>
              <strong>{value}</strong>
              <i data-tone={tone} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisionCommandDeck({
  launchPercent,
  widgetReady,
  knowledgeReady,
  leadsTotal,
  chatsTotal,
}: {
  launchPercent: number;
  widgetReady: boolean;
  knowledgeReady: boolean;
  leadsTotal: number;
  chatsTotal: number;
}) {
  const sections = [
    {
      href: "/panel/overview",
      eyebrow: "Sistema completo",
      title: "Centro operativo",
      text: "Resumen ejecutivo de salud, actividad, leads, widget y riesgos del negocio.",
      icon: <Bot className="h-5 w-5" />,
      status: `${launchPercent}% listo`,
      meta: [`${chatsTotal} chats`, `${leadsTotal} leads`],
    },
    {
      href: "/panel/calibration",
      eyebrow: "Calibration",
      title: "Cerebro comercial",
      text: "Identidad, personalidad, ventas, guardrails, audio, preview y publicacion real.",
      icon: <SlidersHorizontal className="h-5 w-5" />,
      status: knowledgeReady ? "Base conectada" : "Knowledge pendiente",
      meta: ["IA", "Ventas", "Guardrails"],
    },
    {
      href: "/panel/settings",
      eyebrow: "Colorimetria",
      title: "Visual system",
      text: "Colores, posicion, mensaje inicial, tipografia, preview desktop/mobile e instalacion.",
      icon: <Sparkles className="h-5 w-5" />,
      status: widgetReady ? "Widget activo" : "Widget oculto",
      meta: ["Glass", "Widget", "Marca"],
    },
  ];

  return (
    <section className="lmn-vision-command-deck">
      {sections.map((section) => (
        <Link key={section.href} href={section.href} className="group no-underline">
          <GlassCard hover variant="strong" accent className="lmn-vision-command-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center border border-white/[0.08] bg-white/[0.035] text-white">
                {section.icon}
              </div>
              <StatusBadge tone="muted">{section.status}</StatusBadge>
            </div>

            <div className="mt-7">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                {section.eyebrow}
              </div>
              <h3 className="mt-2 text-3xl font-black leading-[0.96] tracking-[-0.055em] text-white">
                {section.title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-white/56">{section.text}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {section.meta.slice(0, 3).map((item) => (
                  <span
                    key={item}
                    className="border border-white/[0.065] bg-white/[0.025] px-3 py-1.5 text-[11px] font-black text-white/52"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-black text-white/58 transition group-hover:text-white">
                Abrir
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </GlassCard>
        </Link>
      ))}
    </section>
  );
}

function ConfigIaOverviewOption({
  launchPercent,
  urgentCount,
  widgetReady,
  knowledgeReady,
  quickPriority,
}: {
  launchPercent: number;
  urgentCount: number;
  widgetReady: boolean;
  knowledgeReady: boolean;
  quickPriority: { title: string; text: string; href: string; label: string };
}) {
  const systemState = widgetReady && knowledgeReady ? "Base lista" : "Puede completarlo";
  const priorityText =
    urgentCount > 0 ? `${urgentCount} pendiente(s)` : `${launchPercent}% listo`;

  return (
    <GlassCard
      hover
      variant="strong"
      accent
      className="lmn-overview-config-ia group relative overflow-hidden p-0"
    >
      <BorderBeam
        size={180}
        duration={13}
        colorFrom="#00E5FF"
        colorTo="#6C3BFF"
        borderWidth={1}
      />
      <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 border border-white/[0.080] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Centro principal
          </div>

          <h3 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-4xl">
            Config IA convierte instrucciones en calibracion publicable.
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/52 md:text-base">
            El suscriptor puede pedir cambios en lenguaje natural y LumenAI
            prepara un borrador real para identidad, ventas, guardrails,
            Knowledge, automatizaciones y widget.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 border border-white/[0.070] bg-white/[0.030] px-3 py-2 text-xs font-semibold text-white/58">
              <Sparkles className="h-3.5 w-3.5" />
              {systemState}
            </span>
            <span className="inline-flex items-center gap-2 border border-white/[0.070] bg-white/[0.030] px-3 py-2 text-xs font-semibold text-white/58">
              <Target className="h-3.5 w-3.5" />
              {priorityText}
            </span>
            <span className="inline-flex items-center gap-2 border border-white/[0.070] bg-white/[0.030] px-3 py-2 text-xs font-semibold text-white/58">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              readiness operativo
            </span>
          </div>

          <Link
            href="/panel/autoconfig"
            className="mt-6 inline-flex items-center gap-2 border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Abrir Config IA
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <LumenAIPromptConsole
          quickPriority={quickPriority}
          systemState={systemState}
          widgetReady={widgetReady}
          knowledgeReady={knowledgeReady}
        />
      </div>
    </GlassCard>
  );
}

function LumenAIPromptConsole({
  quickPriority,
  systemState,
  widgetReady,
  knowledgeReady,
}: {
  quickPriority: { title: string; text: string; href: string; label: string };
  systemState: string;
  widgetReady: boolean;
  knowledgeReady: boolean;
}) {
  const [reply, setReply] = useState({
    title: "Comando listo",
    text: `Pide una configuracion y la abrire en Config IA. Siguiente foco: ${quickPriority.title}.`,
  });

  function handlePrompt(message: string) {
    setReply({
      title: "Abriendo Config IA",
      text: "La indicacion pasara al motor real de configuracion para generar una propuesta aplicable.",
    });

    window.setTimeout(() => {
      window.location.href = `/panel/autoconfig?prompt=${encodeURIComponent(message)}`;
    }, 260);
  }

  return (
    <div className="lmn-ai-prompt-console">
      <div className="lmn-ai-prompt-head">
        <div className="flex items-center gap-2">
          <span className="lmn-ai-prompt-mark">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">LumenAI Config</div>
            <div className="text-xs text-white/42">Entrada rapida hacia Config IA</div>
          </div>
        </div>
        <StatusBadge tone={widgetReady && knowledgeReady ? "active" : "warning"}>
          {systemState}
        </StatusBadge>
      </div>

      <div className="lmn-ai-prompt-response">
        <div className="lmn-ai-prompt-response-title">{reply.title}</div>
        <div className="lmn-ai-prompt-response-text">{reply.text}</div>
      </div>

      <PromptInputBox
        className="lmn-ai-prompt-input"
        placeholder="Ej: deja LumenAI listo para una demo premium"
        onSend={handlePrompt}
      />

      <div className="lmn-ai-prompt-footer">
        <span>{quickPriority.text}</span>
        <Link href="/panel/autoconfig">Abrir Config IA</Link>
      </div>

      <div className="lmn-ai-prompt-orbit">
        <LumenMagicFlow />
      </div>
    </div>
  );
}

function SystemModules({
  widgetReady,
  knowledgeReady,
  chatsTotal,
  leadsTotal,
}: {
  widgetReady: boolean;
  knowledgeReady: boolean;
  chatsTotal: number;
  leadsTotal: number;
}) {
  const modules = [
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      title: "Calibration",
      cardClass: "lmn-module-autopilot",
      text: "Identidad, tono, venta, reglas y preview antes de publicar.",
      value: "Launch score",
      ok: widgetReady && knowledgeReady,
      href: "/panel/calibration",
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      title: "Knowledge",
      cardClass: "lmn-module-knowledge",
      text: "Servicios, precios, polÃ­ticas y reglas que entrenan la IA.",
      value: knowledgeReady ? "Publicado" : "Incompleto",
      ok: knowledgeReady,
      href: "/panel/knowledge",
    },
    {
      icon: <Newspaper className="h-4 w-4" />,
      title: "Radar",
      cardClass: "lmn-module-autopilot",
      text: "Senales internas, mercado y acciones ejecutivas del negocio.",
      value: "Insights",
      ok: true,
      href: "/panel/radar",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Growth",
      cardClass: "lmn-module-leads",
      text: "Detecta oportunidades desde leads, chats y mensajes reales.",
      value: "Revenue",
      ok: leadsTotal > 0 || chatsTotal > 0,
      href: "/panel/growth",
    },
    {
      icon: <GitBranch className="h-4 w-4" />,
      title: "Twin",
      cardClass: "lmn-module-autopilot",
      text: "Simula decisiones comerciales antes de aplicarlas.",
      value: "Strategy",
      ok: knowledgeReady || leadsTotal > 0,
      href: "/panel/twin",
    },
    {
      icon: <Megaphone className="h-4 w-4" />,
      title: "Campaigns",
      cardClass: "lmn-module-card",
      text: "Crea campanas, mensajes, tareas y experimentos listos.",
      value: "Studio",
      ok: knowledgeReady,
      href: "/panel/campaigns",
    },
    {
      icon: <Bot className="h-4 w-4" />,
      title: "Widget",
      cardClass: "lmn-module-widget",
      text: "Canal pÃºblico instalado para convertir visitas en chats.",
      value: widgetReady ? "Activo" : "Pendiente",
      ok: widgetReady,
      href: "/panel/widget",
    },
    {
      icon: <MessageCircle className="h-4 w-4" />,
      title: "Chat",
      cardClass: "lmn-module-chat",
      text: "Inbox operativo con mensajes, estados y atenciÃ³n humana.",
      value: `${chatsTotal} chat(s)`,
      ok: chatsTotal > 0,
      href: "/panel/chat",
    },
    {
      icon: <Target className="h-4 w-4" />,
      title: "Leads",
      cardClass: "lmn-module-leads",
      text: "Oportunidades comerciales listas para seguimiento y cierre.",
      value: `${leadsTotal} lead(s)`,
      ok: leadsTotal > 0,
      href: "/panel/leads",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      title: "Settings",
      cardClass: "lmn-module-autopilot",
      text: "Ajustes visuales del sistema, widget y comportamiento general.",
      value: "iOS style",
      ok: true,
      href: "/panel/settings",
    },
    {
      icon: <HeartPulse className="h-4 w-4" />,
      title: "Health",
      cardClass: "lmn-module-autopilot",
      text: "Checklist de auth, Supabase, widget, keys y action runs.",
      value: "QA",
      ok: true,
      href: "/panel/system-health",
    },
  ];

  return (
    <GlassCard variant="base" className="lmn-modules-panel p-4 md:p-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
              Modulos principales
            </div>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] text-white md:text-3xl">
              LumenAI Enterprise Intelligence OS
            </h3>
            <p className="mt-3 max-w-[760px] text-sm leading-7 text-white/50">
              Un mapa claro de las areas que sostienen el servicio: configuracion,
              Knowledge, widget publico, atencion, oportunidades, simulacion,
              campanas y salud operativa.
            </p>
          </div>

          <div className="hidden border border-white/[0.06] bg-black/35 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/44 md:block">
            Sistema operativo
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className={`lmn-module-card ${module.cardClass} group flex min-h-[220px] flex-col justify-between border p-5 no-underline transition`}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className="lmn-module-icon grid h-10 w-10 place-items-center border"
                  style={{
                    borderColor: module.ok
                      ? `rgba(${accentA}, .22)`
                      : "rgba(255,255,255,.070)",
                    background: module.ok
                      ? `linear-gradient(135deg, rgba(${accentA}, .10), rgba(${accentB}, .060))`
                      : "rgba(255,255,255,.018)",
                  }}
                >
                  {module.icon}
                </div>
                <span
                  className="h-2 w-2"
                  style={{
                    background: module.ok
                      ? `rgb(${accentB})`
                      : "rgba(255,255,255,.22)",
                    boxShadow: module.ok
                      ? `0 0 16px rgba(${accentB}, .34)`
                      : "none",
                  }}
                />
              </div>

              <div>
                <div className="text-xl font-black tracking-[-0.04em] text-white">
                  {module.title}
                </div>
                <p className="mt-2 min-h-[66px] text-sm leading-6 text-white/50">
                  {module.text}
                </p>
              </div>

              <div className="inline-flex w-fit border border-white/[0.06] bg-black/30 px-2.5 py-1 text-[11px] font-black text-white/58">
                {module.value}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function OverviewGeoGlobe({
  leadsTotal,
  geo,
}: {
  leadsTotal: number;
  geo: NonNullable<OverviewData["performance"]>["geo"];
}) {
  const markers = geo
    .map((item) => ({
      id: (item.countryKey ?? item.country).replace(/\s+/g, "-"),
      label: item.country,
      location: COUNTRY_COORDS[item.countryKey ?? item.country],
      count: item.people + item.leads + item.messages,
    }))
    .filter(
      (item): item is {
        id: string;
        label: string;
        location: [number, number];
        count: number;
      } => Boolean(item.location)
    )
    .slice(0, 8);

  const top = geo[0];
  const totalPeople = geo.reduce((acc, item) => acc + item.people, 0);
  const totalMessages = geo.reduce((acc, item) => acc + item.messages, 0);

  return (
    <GlassCard variant="base" accent className="p-5 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-center">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
            Geo insights
          </div>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white md:text-3xl">
            Radar geogrÃ¡fico comercial
          </h3>
          <p className="mt-3 max-w-[720px] text-sm leading-7 text-white/52">
            Lee pais, personas, leads y mensajes detectados por el widget para saber donde hay mas demanda real.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="apex-cut border border-white/[0.065] bg-white/[0.018] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                Personas geo
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {totalPeople}
              </div>
            </div>

            <div className="apex-cut border border-white/[0.065] bg-white/[0.018] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                Pais lider
              </div>
              <div className="mt-2 truncate text-lg font-black capitalize text-white">
                {top?.country || "Sin datos"}
              </div>
            </div>

            <div className="apex-cut border border-white/[0.065] bg-white/[0.018] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                Mensajes geo
              </div>
              <div className="mt-2 text-lg font-black text-white">
                {totalMessages}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {geo.length ? (
              geo.slice(0, 4).map((item) => {
                const total = Math.max(totalPeople + leadsTotal + totalMessages, 1);
                const score = item.people + item.leads + item.messages;
                const percent = Math.round((score / total) * 100);

                return (
                  <div
                    key={item.country}
                    className="apex-cut border border-white/[0.060] bg-white/[0.016] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black capitalize text-white">
                        {item.country}
                      </span>
                      <span className="text-xs font-bold text-white/46">
                        {item.people} persona(s) / {item.messages} mensaje(s)
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(percent, 4)}%`,
                          background:
                            "linear-gradient(90deg, rgb(var(--lmn-accent-rgb,0,140,255)), rgb(var(--lmn-accent-2-rgb,108,59,255)))",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="apex-cut border border-white/[0.060] bg-white/[0.016] p-4 text-sm leading-6 text-white/48">
                Sin ubicacion suficiente todavia. Los nuevos chats del widget guardaran pais cuando el hosting entregue headers geo.
              </div>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[320px]">
          <div
            aria-hidden="true"
            className="absolute inset-8 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(var(--lmn-accent-rgb,0,140,255),.18), transparent 66%)",
            }}
          />
          <Globe
            markers={markers}
            arcs={[]}
            className="relative"
            dark={1}
            mapBrightness={4}
            diffuse={1.1}
            mapSamples={9000}
            speed={0.0016}
            emptyLabel="Esperando trafico real"
          />
        </div>
      </div>
    </GlassCard>
  );
}

function PerformanceCharts({
  performance,
  stats,
  loading,
}: {
  performance?: OverviewData["performance"];
  stats?: OverviewData["stats"];
  loading: boolean;
}) {
  const activity = performance?.hourlyActivity ?? [];
  const maxActivity = Math.max(...activity.map((item) => item.value), 1);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
      <GlassCard variant="base" accent className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
              Rendimiento
            </div>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">
              Conversion y demanda de LumenAI
            </h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-white/50">
              Demanda, canales y ventas con colores del cliente.
            </p>
          </div>

          <StatusBadge tone={(stats?.leads_won ?? 0) > 0 ? "active" : "muted"}>
            {loading ? "Cargando" : `${stats?.leads_total ?? 0} leads`}
          </StatusBadge>
        </div>

        <DemandLineChart data={performance?.growthSeries ?? []} />

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ChartStack
            title="Embudo comercial"
            items={performance?.leadFunnel ?? []}
            empty="Sin leads suficientes."
          />

          <ChartStack
            title="Canales de entrada"
            items={performance?.channels ?? []}
            empty="Sin conversaciones todavia."
          />
        </div>
      </GlassCard>

      <GlassCard variant="soft" accent className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
              Actividad por hora
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/48">
              Horarios donde clientes y asistente generaron mas mensajes.
            </p>
          </div>
          <StatusBadge tone="muted">{activity.length} punto(s)</StatusBadge>
        </div>

        <div className="mt-5 flex h-44 items-end gap-2 rounded-[16px] border border-white/[0.060] bg-black/15 p-3">
          {activity.length ? (
            activity.map((item) => {
              const height = Math.max(8, Math.round((item.value / maxActivity) * 100));

              return (
                <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-[8px]"
                    style={{
                      height: `${height}%`,
                      background:
                        "linear-gradient(180deg, rgb(var(--lmn-accent-rgb,0,140,255)), rgb(var(--lmn-accent-2-rgb,108,59,255)))",
                      boxShadow:
                        "0 0 18px rgba(var(--lmn-accent-rgb,0,140,255),.18)",
                    }}
                    title={`${item.label}: ${item.value} mensajes`}
                  />
                  <span className="truncate text-[10px] font-bold text-white/35">
                    {item.label.replace(":00", "")}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-semibold text-white/38">
              Sin actividad suficiente.
            </div>
          )}
        </div>

        <div className="mt-4">
          <ChartStack
            title="Knowledge publicado"
            items={(performance?.knowledgeMix ?? []).filter((item) => item.value > 0)}
            empty="Knowledge pendiente."
            compact
          />
        </div>
      </GlassCard>
    </section>
  );
}

function BusinessAutopilot({
  actions,
  launchPercent,
  urgentCount,
  loading,
  stats,
}: {
  actions: AutopilotAction[];
  launchPercent: number;
  urgentCount: number;
  loading: boolean;
  stats?: OverviewData["stats"];
}) {
  const setupScore = `${stats?.launch_done ?? 0}/${stats?.launch_total ?? 0}`;
  const conversionBase = Math.max(stats?.leads_total ?? 0, 1);
  const conversionRate = Math.round(((stats?.leads_won ?? 0) / conversionBase) * 100);

  return (
    <GlassCard variant="base" accent className="p-5 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(260px,.78fr)_minmax(0,1.22fr)] xl:items-stretch">
        <div className="flex min-h-[260px] flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
              <Sparkles className="h-3.5 w-3.5" />
              Prioridades inteligentes
            </div>

            <h3 className="mt-3 max-w-[620px] text-3xl font-black tracking-[-0.055em] text-white md:text-4xl">
              Proximas acciones del sistema
            </h3>

            <p className="mt-3 max-w-[620px] text-sm leading-7 text-white/52">
              LumenAI lee el estado comercial y ordena lo que conviene hacer ahora: atencion,
              ventas, Knowledge, widget y expansion.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <AutopilotSignal label="Prioridad" value={loading ? "..." : urgentCount} tone={urgentCount ? "urgent" : "insight"} />
            <AutopilotSignal label="Setup" value={loading ? "..." : setupScore} tone={launchPercent >= 75 ? "insight" : "setup"} />
            <AutopilotSignal label="Cierre" value={loading ? "..." : `${conversionRate}%`} tone={conversionRate > 0 ? "growth" : "setup"} />
          </div>
        </div>

        <div className="flex flex-col overflow-hidden border border-white/[0.055] bg-black/[0.16]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.055] px-4 py-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
              Recomendaciones activas
            </div>
            <StatusBadge tone={urgentCount > 0 ? "warning" : "active"}>
              {urgentCount > 0 ? `${urgentCount} pendiente(s)` : "Estable"}
            </StatusBadge>
          </div>

          <div className="divide-y divide-white/[0.055]">
            {actions.map((action, index) => (
              <Link
                key={`${action.title}-${index}`}
                href={action.href}
                className="group grid gap-3 px-4 py-4 transition hover:bg-white/[0.028] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0"
                    style={{
                      background: action.tone === "urgent"
                        ? "rgb(255,93,108)"
                        : action.tone === "growth"
                          ? "rgb(var(--lmn-accent-rgb,0,140,255))"
                          : action.tone === "setup"
                            ? "rgb(229,190,99)"
                            : "rgb(var(--lmn-accent-2-rgb,108,59,255))",
                      boxShadow: "0 0 18px currentColor",
                    }}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black tracking-[-0.02em] text-white">
                        {action.title}
                      </h4>
                      <span className="border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/42">
                        {action.signal}
                      </span>
                    </div>
                    <p className="mt-1 max-w-[760px] text-sm leading-6 text-white/50">
                      {action.text}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 text-xs font-black text-white/58 transition group-hover:text-white">
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function AutopilotSignal({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: AutopilotAction["tone"];
}) {
  return (
    <div
      className="border border-white/[0.06] bg-white/[0.018] p-3"
      style={{
        boxShadow:
          tone === "urgent"
            ? "inset 0 1px 0 rgba(255,255,255,.055), 0 0 24px rgba(255,93,108,.08)"
            : "inset 0 1px 0 rgba(255,255,255,.055)",
      }}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-white">
        {value}
      </div>
    </div>
  );
}

function DemandLineChart({
  data,
}: {
  data: NonNullable<OverviewData["performance"]>["growthSeries"];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const series = [
    {
      key: "widgetUsers",
      label: "Usuarios widget",
      color: "rgb(var(--lmn-accent-rgb,0,140,255))",
      fill: "rgba(var(--lmn-accent-rgb,0,140,255),.12)",
    },
    {
      key: "leads",
      label: "Leads captados",
      color: "rgb(var(--lmn-accent-2-rgb,108,59,255))",
      fill: "rgba(var(--lmn-accent-2-rgb,108,59,255),.10)",
    },
    {
      key: "buyers",
      label: "Compradores reales",
      color: "rgba(255,255,255,.82)",
      fill: "rgba(255,255,255,.06)",
    },
  ] as const;
  const width = 720;
  const height = 240;
  const padX = 34;
  const padTop = 20;
  const padBottom = 34;
  const chartH = height - padTop - padBottom;
  const usableW = width - padX * 2;
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [
      point.widgetUsers,
      point.leads,
      point.buyers,
    ])
  );
  const hasData = data.some((point) => point.widgetUsers || point.leads || point.buyers);
  const hoveredPoint =
    hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;
  const hoveredX =
    hoveredPoint && hoveredIndex !== null
      ? coords(hoveredPoint, hoveredIndex, "widgetUsers")[0]
      : null;
  const hoveredY =
    hoveredPoint && hoveredIndex !== null
      ? Math.min(...series.map((item) => coords(hoveredPoint, hoveredIndex, item.key)[1]))
      : null;

  function coords(point: DemandPoint, index: number, key: DemandKey) {
    const x = padX + (data.length <= 1 ? usableW : (index / (data.length - 1)) * usableW);
    const y = padTop + chartH - (Number(point[key]) / maxValue) * chartH;
    return [x, y] as const;
  }

  function pathFor(key: DemandKey) {
    if (!data.length) return "";
    return data
      .map((point, index) => {
        const [x, y] = coords(point, index, key);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }

  function areaFor(key: DemandKey) {
    if (!data.length) return "";
    const line = pathFor(key);
    const firstX = padX;
    const lastX = padX + usableW;
    const baseY = padTop + chartH;
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-[18px] border border-white/[0.060] bg-white/[0.016] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-sm font-black text-white">
            Demanda, leads y compradores
          </h4>
          <p className="mt-1 text-xs leading-5 text-white/42">
            Pasa el mouse por la linea para ver cada valor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {series.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.075] bg-black/20 px-2.5 py-1 text-[11px] font-bold text-white/58"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative mt-4 h-[260px] rounded-[16px] border border-white/[0.055] bg-black/18 p-2"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          role="img"
          aria-label="Grafica de usuarios widget, leads y compradores"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lmn-chart-grid" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="rgba(255,255,255,.06)" />
              <stop offset="1" stopColor="rgba(255,255,255,.015)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#lmn-chart-grid)" />
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padTop + chartH * tick;
            const value = Math.round(maxValue * (1 - tick));
            return (
              <g key={tick}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,.07)"
                  strokeWidth="1"
                />
                <text
                  x="6"
                  y={y + 4}
                  fill="rgba(255,255,255,.34)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {series.map((item) => (
            <path key={`${item.key}-area`} d={areaFor(item.key)} fill={item.fill} />
          ))}
          {series.map((item) => (
            <path
              key={item.key}
              d={pathFor(item.key)}
              fill="none"
              stroke={item.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={item.key === "buyers" ? 3.2 : 3.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {data.map((point, index) =>
            series.map((item) => {
              const [x, y] = coords(point, index, item.key);
              const value = Number(point[item.key]);
              return value ? (
                <circle
                  key={`${point.date}-${item.key}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={item.color}
                  stroke="rgba(0,0,0,.55)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null;
            })
          )}
          {data.map((point, index) =>
            index % 3 === 0 || index === data.length - 1 ? (
              <text
                key={point.date}
                x={coords(point, index, "widgetUsers")[0]}
                y={height - 10}
                textAnchor="middle"
                fill="rgba(255,255,255,.34)"
                fontSize="11"
                fontWeight="700"
              >
                {point.label.replace(".", "")}
              </text>
            ) : null
          )}

          {hoveredPoint && hoveredX !== null ? (
            <g>
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={padTop}
                y2={padTop + chartH}
                stroke="rgba(255,255,255,.26)"
                strokeDasharray="4 5"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {series.map((item) => {
                const [x, y] = coords(hoveredPoint, hoveredIndex ?? 0, item.key);
                return (
                  <circle
                    key={`hover-${item.key}`}
                    cx={x}
                    cy={y}
                    r="5.5"
                    fill={item.color}
                    stroke="rgba(255,255,255,.70)"
                    strokeWidth="1.6"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          ) : null}

          {data.map((point, index) => {
            const [x] = coords(point, index, "widgetUsers");
            const hitWidth = Math.max(28, usableW / Math.max(data.length - 1, 1));

            return (
              <rect
                key={`${point.date}-hit`}
                x={x - hitWidth / 2}
                y={padTop}
                width={hitWidth}
                height={chartH}
                fill="transparent"
                cursor="crosshair"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseMove={() => setHoveredIndex(index)}
              />
            );
          })}
        </svg>

        {hoveredPoint && hoveredX !== null && hoveredY !== null ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[174px] rounded-[12px] border border-white/[0.10] bg-black/70 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur-md"
            style={{
              left: `${(hoveredX / width) * 100}%`,
              top: 12,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-black text-white">{hoveredPoint.label}</div>
            <div className="mt-2 grid gap-1.5">
              {series.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-white/62">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="font-black text-white">
                    {Number(hoveredPoint[item.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!hasData ? (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="rounded-[14px] border border-white/[0.075] bg-black/45 px-4 py-3 text-sm font-bold text-white/52">
              Todavia no hay datos reales. Cuando el widget reciba chats, esta grafica se llena sola.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChartStack({
  title,
  items,
  empty,
  compact,
}: {
  title: string;
  items: Array<{ key: string; label: string; value: number; percent: number }>;
  empty: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.060] bg-white/[0.016] p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-black text-white">{title}</h4>
        <span className="text-[11px] font-bold text-white/38">
          {items.reduce((acc, item) => acc + item.value, 0)}
        </span>
      </div>

      <div className={compact ? "mt-3 grid gap-2" : "mt-4 grid gap-3"}>
        {items.length ? (
          items.map((item) => (
            <div key={item.key}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-xs font-bold text-white/72">
                  {item.label}
                </span>
                <span className="text-xs font-black text-white">
                  {item.value}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(item.percent, item.value > 0 ? 4 : 0)}%`,
                    background:
                      "linear-gradient(90deg, rgb(var(--lmn-accent-rgb,0,140,255)), rgb(var(--lmn-accent-2-rgb,108,59,255)))",
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[12px] border border-white/[0.055] bg-black/15 p-3 text-sm text-white/42">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="apex-cut border border-white/[0.065] bg-white/[0.018] p-3 text-sm text-white/42">
      {text}
    </div>
  );
}
