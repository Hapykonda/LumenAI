"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Bot,
  BrainCircuit,
  ChevronRight,
  CircleAlert,
  Clock3,
  HeartPulse,
  MessageCircleMore,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { panelFetch } from "@/lib/panel-fetch";
import { usePanel } from "../_components/panel-context";

type OverviewData = {
  ok?: boolean;
  error?: string;
  business?: { id: string; name: string; public_key: string | null };
  widget?: { enabled: boolean; assistant_name: string; published_at: string | null };
  checks?: Record<string, boolean>;
  stats?: {
    chats_total: number;
    chats_unread: number;
    chats_paused: number;
    leads_total: number;
    leads_new: number;
    leads_qualified: number;
    leads_won: number;
    kb_total: number;
    kb_published: number;
    kb_services: number;
    kb_pricing: number;
    launch_percent: number;
    launch_done: number;
    launch_total: number;
  };
  commandCenter?: {
    generatedAt: string;
    summary: {
      health: "ready" | "warning" | "critical";
      criticalAlerts: number;
      pendingApprovals: number;
      activeLumeniteActions: number;
    };
  };
  performance?: {
    growthSeries: Array<{
      date: string;
      label: string;
      widgetUsers: number;
      leads: number;
      buyers: number;
    }>;
    channels: Array<{ key: string; label: string; value: number; percent: number }>;
  };
  recentLeads?: Array<{
    id: string;
    chat_id: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    status: string;
    score: number;
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

type FocusItem = {
  title: string;
  copy: string;
  href: string;
  action: string;
  tone: "blue" | "amber" | "violet";
  icon: typeof Target;
};

function shortDate(value?: string | null) {
  if (!value) return "Ahora";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Ahora";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function leadName(lead: NonNullable<OverviewData["recentLeads"]>[number]) {
  return lead.name || lead.phone || lead.email || "Lead sin nombre";
}

function buildFocus(data: OverviewData | null): FocusItem[] {
  const stats = data?.stats;
  const items: FocusItem[] = [];

  if ((stats?.chats_unread ?? 0) > 0) {
    items.push({
      title: "Conversaciones esperando respuesta",
      copy: `${stats?.chats_unread ?? 0} clientes necesitan atención. Pulse recomienda resolver primero las conversaciones con mayor intención.`,
      href: "/panel/chat",
      action: "Abrir conversaciones",
      tone: "amber",
      icon: MessageCircleMore,
    });
  }

  if ((stats?.leads_new ?? 0) > 0) {
    items.push({
      title: "Nuevas oportunidades detectadas",
      copy: `${stats?.leads_new ?? 0} leads ingresaron al flujo comercial y aún no tienen seguimiento.`,
      href: "/panel/leads",
      action: "Revisar oportunidades",
      tone: "blue",
      icon: Target,
    });
  }

  if (!data?.widget?.enabled) {
    items.push({
      title: "Activa tu canal público",
      copy: "El widget está configurado pero todavía no recibe conversaciones desde tu sitio web.",
      href: "/panel/widget",
      action: "Publicar widget",
      tone: "violet",
      icon: Bot,
    });
  }

  if ((stats?.kb_published ?? 0) < Math.max(1, stats?.kb_total ?? 0)) {
    items.push({
      title: "Fortalece el conocimiento de la IA",
      copy: "Completa servicios, precios y políticas para que las respuestas sean precisas y comerciales.",
      href: "/panel/knowledge",
      action: "Completar Knowledge",
      tone: "blue",
      icon: BookOpenText,
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Tu operación está al día",
      copy: "No hay bloqueos inmediatos. Es un buen momento para optimizar conversión y preparar nuevas campañas.",
      href: "/panel/growth",
      action: "Explorar crecimiento",
      tone: "blue",
      icon: Sparkles,
    });
  }

  return items.slice(0, 3);
}

export default function OverviewPage() {
  const { operatorId } = usePanel();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function loadOverview(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await panelFetch("/api/panel/overview", { method: "GET" });
      const payload = (await response.json().catch(() => ({}))) as OverviewData;
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "No pudimos cargar el centro de mando.");
      }
      setData(payload);
      setError(null);
      setUpdatedAt(new Date().toISOString());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos conectar con LumenAI.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadOverview();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOverview(true);
    }, 45_000);
    return () => window.clearInterval(interval);
  }, []);

  const stats = data?.stats;
  const summary = data?.commandCenter?.summary;
  const health = summary?.health ?? "warning";
  const score = stats?.launch_percent ?? 0;
  const focus = useMemo(() => buildFocus(data), [data]);
  const series = data?.performance?.growthSeries ?? [];
  const maxActivity = Math.max(1, ...series.map((point) => point.widgetUsers + point.leads));

  return (
    <div className="lmx-overview">
      <header className="lmx-page-header">
        <div>
          <span className="lmx-eyebrow">Centro de mando</span>
          <h1>Todo tu negocio, en un solo lugar.</h1>
          <p>Conversaciones, oportunidades y decisiones organizadas para saber qué ocurre y qué hacer después.</p>
        </div>
        <div className="lmx-page-actions">
          <button type="button" className="lmx-button lmx-button-ghost" onClick={() => void loadOverview(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
            {refreshing ? "Actualizando" : "Actualizar"}
          </button>
          <Link href="/panel/autoconfig" className="lmx-button lmx-button-primary">
            <WandSparkles aria-hidden="true" />
            Configurar con IA
          </Link>
        </div>
      </header>

      {error ? (
        <div className="lmx-alert" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadOverview()}>Reintentar</button>
        </div>
      ) : null}

      <section className="lmx-overview-hero" aria-busy={loading}>
        <div className="lmx-health-card" data-health={health}>
          <div className="lmx-health-card-head">
            <span className="lmx-card-kicker"><HeartPulse aria-hidden="true" /> Estado general</span>
            <span className="lmx-health-pill"><i aria-hidden="true" /> {health === "ready" ? "Operación saludable" : health === "critical" ? "Requiere atención" : "Atención recomendada"}</span>
          </div>
          <div className="lmx-health-main">
            <div>
              <h2>{health === "ready" ? "Tu negocio está funcionando correctamente." : "Hay oportunidades que requieren tu atención."}</h2>
              <p>Pulse revisó el sistema y ordenó los siguientes pasos según su impacto comercial.</p>
            </div>
            <div className="lmx-score" style={{ "--lmx-score": `${Math.max(0, Math.min(100, score)) * 3.6}deg` } as CSSProperties}>
              <span><strong>{score}%</strong><small>preparado</small></span>
            </div>
          </div>
          <div className="lmx-health-stats">
            <div><small>Alertas críticas</small><strong>{summary?.criticalAlerts ?? 0}</strong><span>{(summary?.criticalAlerts ?? 0) > 0 ? "Revisar ahora" : "Sin bloqueos"}</span></div>
            <div><small>Aprobaciones</small><strong>{summary?.pendingApprovals ?? 0}</strong><span>Decisiones pendientes</span></div>
            <div><small>Acciones activas</small><strong>{summary?.activeLumeniteActions ?? 0}</strong><span>LumenAI trabajando</span></div>
          </div>
        </div>

        <aside className="lmx-pulse-card">
          <div className="lmx-pulse-orb" aria-hidden="true" />
          <div className="lmx-pulse-card-head">
            <OperatorAvatar operator={operatorId} mood={health === "ready" ? "good-news" : "analyzing"} size={96} priority />
            <span><small>Tu operador</small><strong>Pulse está atento</strong></span>
          </div>
          <blockquote>“{focus[0]?.title}. Puedo mostrarte la evidencia y ayudarte a resolverlo.”</blockquote>
          <button type="button" onClick={() => window.dispatchEvent(new Event("lumenai:pulse-open"))}>
            Hablar con Pulse <ArrowRight aria-hidden="true" />
          </button>
        </aside>
      </section>

      <section className="lmx-metric-grid" aria-label="Indicadores principales">
        <Metric icon={MessageCircleMore} label="Conversaciones" value={stats?.chats_total ?? 0} detail={`${stats?.chats_unread ?? 0} sin leer`} tone="blue" href="/panel/chat" loading={loading} />
        <Metric icon={UsersRound} label="Oportunidades" value={stats?.leads_total ?? 0} detail={`${stats?.leads_new ?? 0} nuevas`} tone="violet" href="/panel/leads" loading={loading} />
        <Metric icon={BrainCircuit} label="Conocimiento" value={`${stats?.kb_published ?? 0}/${stats?.kb_total ?? 0}`} detail="Fuentes publicadas" tone="cyan" href="/panel/knowledge" loading={loading} />
        <Metric icon={Bot} label="Widget público" value={data?.widget?.enabled ? "Activo" : "Pendiente"} detail={data?.widget?.enabled ? "Recibiendo visitas" : "Aún sin publicar"} tone={data?.widget?.enabled ? "green" : "amber"} href="/panel/widget" loading={loading} />
      </section>

      <section className="lmx-dashboard-grid">
        <div className="lmx-panel lmx-focus-panel">
          <PanelHeading eyebrow="Prioridades" title="Lo importante para hoy" copy="Ordenado por impacto y urgencia." href="/panel/radar" action="Ver Radar" />
          <div className="lmx-focus-list">
            {focus.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="lmx-focus-item" data-tone={item.tone}>
                  <span className="lmx-focus-number">0{index + 1}</span>
                  <span className="lmx-focus-icon"><Icon aria-hidden="true" /></span>
                  <span className="lmx-focus-copy"><strong>{item.title}</strong><small>{item.copy}</small></span>
                  <span className="lmx-focus-action">{item.action}<ChevronRight aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="lmx-panel lmx-activity-chart">
          <PanelHeading eyebrow="Rendimiento" title="Actividad reciente" copy="Interacciones y oportunidades detectadas." href="/panel/growth" action="Ver análisis" />
          <div className="lmx-chart-summary"><strong>{stats?.chats_total ?? 0}</strong><span>interacciones acumuladas</span></div>
          <div className="lmx-bars" aria-label="Actividad por periodo">
            {(series.length ? series.slice(-10) : Array.from({ length: 10 }, (_, index) => ({ label: `${index + 1}`, widgetUsers: 0, leads: 0, buyers: 0, date: "" }))).map((point, index) => {
              const value = point.widgetUsers + point.leads;
              return <span key={`${point.date}-${index}`} title={`${point.label}: ${value}`} style={{ height: `${Math.max(8, (value / maxActivity) * 100)}%` }}><i style={{ height: `${Math.max(0, (point.leads / Math.max(1, value)) * 100)}%` }} /></span>;
            })}
          </div>
          <div className="lmx-chart-legend"><span><i data-color="blue" />Interacciones</span><span><i data-color="violet" />Leads</span><time>{updatedAt ? `Actualizado ${shortDate(updatedAt)}` : "Sincronizando"}</time></div>
        </div>
      </section>

      <section className="lmx-dashboard-grid lmx-dashboard-grid-secondary">
        <div className="lmx-panel">
          <PanelHeading eyebrow="Actividad" title="Últimas conversaciones" copy="Lo más reciente de tus canales." href="/panel/chat" action="Ver todas" />
          <div className="lmx-compact-list">
            {loading ? <EmptyRow label="Cargando conversaciones…" /> : (data?.recentMessages ?? []).length ? (data?.recentMessages ?? []).slice(0, 5).map((message) => (
              <Link key={message.id} href={`/panel/chat/${message.chat_id}`}>
                <span className="lmx-list-avatar"><MessageCircleMore aria-hidden="true" /></span>
                <span><strong>{message.sender_type === "assistant" ? "Respuesta de LumenAI" : "Nuevo mensaje de cliente"}</strong><small>{message.content || "Mensaje sin contenido"}</small></span>
                <time>{shortDate(message.created_at)}</time>
              </Link>
            )) : <EmptyRow label="Todavía no hay conversaciones." />}
          </div>
        </div>

        <div className="lmx-panel">
          <PanelHeading eyebrow="Pipeline" title="Leads recientes" copy="Oportunidades listas para seguimiento." href="/panel/leads" action="Ver pipeline" />
          <div className="lmx-compact-list">
            {loading ? <EmptyRow label="Cargando oportunidades…" /> : (data?.recentLeads ?? []).length ? (data?.recentLeads ?? []).slice(0, 5).map((lead) => (
              <Link key={lead.id} href={lead.chat_id ? `/panel/chat/${lead.chat_id}` : "/panel/leads"}>
                <span className="lmx-lead-avatar">{leadName(lead).slice(0, 1).toUpperCase()}</span>
                <span><strong>{leadName(lead)}</strong><small>{lead.status === "new" ? "Nuevo lead" : lead.status} · Potencial comercial</small></span>
                <b>{lead.score ?? 0}%</b>
              </Link>
            )) : <EmptyRow label="Todavía no hay oportunidades." />}
          </div>
        </div>
      </section>

      <section className="lmx-module-section">
        <PanelHeading eyebrow="Herramientas" title="Tu sistema LumenAI" copy="Acceso rápido a cada área de trabajo." />
        <div className="lmx-module-grid">
          <Module href="/panel/calibration" icon={Settings2} title="Calibración" copy="Personalidad, reglas y ventas" />
          <Module href="/panel/knowledge" icon={BookOpenText} title="Knowledge" copy="Cerebro de tu negocio" />
          <Module href="/panel/radar" icon={Sparkles} title="Pulse Radar" copy="Señales y recomendaciones" />
          <Module href="/panel/growth" icon={TrendingUp} title="Growth" copy="Crecimiento y oportunidades" />
          <Module href="/panel/approvals" icon={ShieldCheck} title="Aprobaciones" copy="Control de decisiones" />
          <Module href="/panel/system-health" icon={HeartPulse} title="Salud" copy="Servicios y conexiones" />
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone, href, loading }: { icon: typeof Target; label: string; value: string | number; detail: string; tone: string; href: string; loading: boolean }) {
  return (
    <Link href={href} className="lmx-metric" data-tone={tone}>
      <span className="lmx-metric-icon"><Icon aria-hidden="true" /></span>
      <span><small>{label}</small><strong>{loading ? "—" : value}</strong><em>{detail}</em></span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function PanelHeading({ eyebrow, title, copy, href, action }: { eyebrow: string; title: string; copy: string; href?: string; action?: string }) {
  return (
    <header className="lmx-panel-heading">
      <div><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>
      {href && action ? <Link href={href}>{action}<ArrowRight aria-hidden="true" /></Link> : null}
    </header>
  );
}

function Module({ href, icon: Icon, title, copy }: { href: string; icon: typeof Target; title: string; copy: string }) {
  return <Link href={href} className="lmx-module"><span><Icon aria-hidden="true" /></span><strong>{title}</strong><small>{copy}</small><ArrowRight aria-hidden="true" /></Link>;
}

function EmptyRow({ label }: { label: string }) {
  return <div className="lmx-empty-row"><Clock3 aria-hidden="true" /><span>{label}</span></div>;
}
