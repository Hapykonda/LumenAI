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
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { panelFetch } from "@/lib/panel-fetch";
import { usePanel } from "../_components/panel-context";

type OverviewData = {
  ok?: boolean;
  error?: string;
  business?: { id: string; name: string; public_key: string | null };
  widget?: { enabled: boolean; assistant_name: string; published_at: string | null };
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
  tone: "cyan" | "amber" | "violet";
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
      title: "Conversaciones con intención sin resolver",
      copy: `${stats?.chats_unread ?? 0} conversaciones esperan respuesta. Pulse priorizó las de mayor intención comercial.`,
      href: "/panel/chat",
      action: "Abrir inbox",
      tone: "amber",
      icon: MessageCircleMore,
    });
  }

  if ((stats?.leads_new ?? 0) > 0) {
    items.push({
      title: "Oportunidades nuevas sin siguiente paso",
      copy: `${stats?.leads_new ?? 0} leads ingresaron al pipeline y todavía no tienen una acción de seguimiento.`,
      href: "/panel/leads",
      action: "Abrir pipeline",
      tone: "cyan",
      icon: Target,
    });
  }

  if (!data?.widget?.enabled) {
    items.push({
      title: "Canal público fuera de operación",
      copy: "El widget está configurado, pero todavía no recibe conversaciones desde tu sitio.",
      href: "/panel/widget",
      action: "Publicar canal",
      tone: "violet",
      icon: Bot,
    });
  }

  if ((stats?.kb_published ?? 0) < Math.max(1, stats?.kb_total ?? 0)) {
    items.push({
      title: "Conocimiento con cobertura incompleta",
      copy: "Completa servicios, precios y políticas para elevar precisión y conversión.",
      href: "/panel/knowledge",
      action: "Abrir Knowledge",
      tone: "cyan",
      icon: BookOpenText,
    });
  }

  if (items.length === 0) {
    items.push({
      title: "La operación está bajo control",
      copy: "No hay bloqueos inmediatos. Pulse recomienda explorar la siguiente oportunidad de crecimiento.",
      href: "/panel/growth",
      action: "Abrir Growth",
      tone: "cyan",
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
  const healthLabel = health === "ready" ? "VERIFICADO" : health === "critical" ? "CRÍTICO" : "REVISIÓN";

  return (
    <div className="lmx-overview lmx-command-overview">
      <header className="lmx-command-pagebar">
        <div>
          <span><i aria-hidden="true" /> COMMAND / HOY</span>
          <p>La señal operativa del negocio, ordenada para decidir.</p>
        </div>
        <div className="lmx-page-actions">
          <button type="button" className="lmx-button lmx-button-ghost" onClick={() => void loadOverview(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
            {refreshing ? "Leyendo" : "Actualizar señal"}
          </button>
          <Link href="/panel/autoconfig" className="lmx-button lmx-button-primary">
            <WandSparkles aria-hidden="true" /> Configurar con IA
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

      <section className="lmx-executive-grid" aria-busy={loading}>
        <article className="lmx-executive-state" data-health={health}>
          <header>
            <span className="lmx-section-code">01 / ESTADO EJECUTIVO</span>
            <span className="lmx-verified-state"><i aria-hidden="true" /> {healthLabel}</span>
          </header>

          <div className="lmx-state-primary">
            <div className="lmx-readiness-index">
              <span>{loading ? "—" : String(score).padStart(2, "0")}</span>
              <small>READINESS<br />INDEX</small>
            </div>
            <div className="lmx-state-narrative">
              <small>PULSE / DIAGNÓSTICO</small>
              <h2>{health === "ready" ? "La operación está lista para escalar." : "La operación necesita una decisión."}</h2>
              <p>
                {health === "ready"
                  ? "Los canales críticos están conectados y la IA cuenta con contexto suficiente para operar."
                  : "Pulse encontró señales que conviene resolver antes de aumentar volumen o automatización."}
              </p>
            </div>
          </div>

          <div className="lmx-state-ledger">
            <StateLine label="Alertas críticas" value={summary?.criticalAlerts ?? 0} detail={(summary?.criticalAlerts ?? 0) ? "Requieren control" : "Sin bloqueos"} />
            <StateLine label="Aprobaciones" value={summary?.pendingApprovals ?? 0} detail="Decisiones humanas" />
            <StateLine label="Acciones activas" value={summary?.activeLumeniteActions ?? 0} detail="LumenAI ejecutando" />
          </div>
        </article>

        <aside className="lmx-pulse-brief">
          <header>
            <div>
              <span className="lmx-section-code">PULSE / EXECUTIVE BRIEF</span>
              <strong>La siguiente decisión</strong>
            </div>
            <span className="lmx-pulse-portrait">
              <OperatorAvatar operator={operatorId} mood={health === "ready" ? "good-news" : "analyzing"} size={112} priority />
            </span>
          </header>
          <div className="lmx-pulse-statement">
            <i aria-hidden="true">“</i>
            <p>{focus[0]?.title}. <span>{focus[0]?.copy}</span></p>
          </div>
          <div className="lmx-pulse-evidence">
            <span><small>EVIDENCIA</small><strong>{stats?.chats_unread ?? 0} chats / {stats?.leads_new ?? 0} leads</strong></span>
            <span><small>CONFIANZA</small><strong>{score >= 80 ? "Alta" : "Media"}</strong></span>
          </div>
          <div className="lmx-pulse-brief-actions">
            <Link href={focus[0]?.href || "/panel/radar"}>{focus[0]?.action || "Abrir señal"}<ArrowRight aria-hidden="true" /></Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event("lumenai:pulse-open"))}>Analizar con Pulse</button>
          </div>
        </aside>
      </section>

      <section className="lmx-kpi-ledger" aria-label="Indicadores principales">
        <Metric icon={MessageCircleMore} code="CHT" label="Conversaciones" value={stats?.chats_total ?? 0} detail={`${stats?.chats_unread ?? 0} sin leer`} href="/panel/chat" loading={loading} />
        <Metric icon={UsersRound} code="LD" label="Oportunidades" value={stats?.leads_total ?? 0} detail={`${stats?.leads_new ?? 0} nuevas`} href="/panel/leads" loading={loading} />
        <Metric icon={BrainCircuit} code="KB" label="Conocimiento" value={`${stats?.kb_published ?? 0}/${stats?.kb_total ?? 0}`} detail="Fuentes publicadas" href="/panel/knowledge" loading={loading} />
        <Metric icon={Bot} code="WGT" label="Canal público" value={data?.widget?.enabled ? "Online" : "Offline"} detail={data?.widget?.enabled ? "Recibiendo visitas" : "Pendiente de publicar"} href="/panel/widget" loading={loading} active={Boolean(data?.widget?.enabled)} />
      </section>

      <section className="lmx-operations-grid">
        <div className="lmx-signal-board">
          <SectionTitle code="02 / PRIORIDAD" title="Decisiones que mueven la operación" copy="Ordenadas por impacto, evidencia y urgencia." href="/panel/radar" action="Abrir Radar" />
          <div className="lmx-command-focus-list">
            {focus.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="lmx-command-focus" data-tone={item.tone}>
                  <span className="lmx-command-focus-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lmx-command-focus-icon"><Icon aria-hidden="true" /></span>
                  <span><strong>{item.title}</strong><small>{item.copy}</small></span>
                  <span className="lmx-command-focus-cta">{item.action}<ChevronRight aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="lmx-telemetry-panel">
          <SectionTitle code="03 / TELEMETRÍA" title="Actividad de los últimos ciclos" copy="Interacciones y oportunidades detectadas." href="/panel/growth" action="Abrir Growth" />
          <div className="lmx-telemetry-total"><strong>{stats?.chats_total ?? 0}</strong><span>interacciones<br />acumuladas</span></div>
          <div className="lmx-telemetry-chart" aria-label="Actividad por periodo">
            {(series.length ? series.slice(-10) : Array.from({ length: 10 }, (_, index) => ({ label: `${index + 1}`, widgetUsers: 0, leads: 0, buyers: 0, date: "" }))).map((point, index) => {
              const value = point.widgetUsers + point.leads;
              return (
                <span key={`${point.date}-${index}`} title={`${point.label}: ${value}`} style={{ "--height": `${Math.max(8, (value / maxActivity) * 100)}%` } as CSSProperties}>
                  <i style={{ "--lead-height": `${Math.max(0, (point.leads / Math.max(1, value)) * 100)}%` } as CSSProperties} />
                  <small>{point.label.slice(0, 2)}</small>
                </span>
              );
            })}
          </div>
          <footer><span><i />Interacciones</span><span><i />Leads</span><time>{updatedAt ? `Actualizado ${shortDate(updatedAt)}` : "Sincronizando"}</time></footer>
        </div>
      </section>

      <section className="lmx-live-grid">
        <div className="lmx-live-panel">
          <SectionTitle code="04 / CONVERSACIONES" title="Última actividad comercial" copy="Mensajes que requieren contexto o continuidad." href="/panel/chat" action="Abrir inbox" />
          <div className="lmx-command-list">
            {loading ? <EmptyRow label="Leyendo conversaciones…" /> : (data?.recentMessages ?? []).length ? (data?.recentMessages ?? []).slice(0, 4).map((message) => (
              <Link key={message.id} href={`/panel/chat/${message.chat_id}`}>
                <span className="lmx-command-list-mark"><MessageCircleMore aria-hidden="true" /></span>
                <span><strong>{message.sender_type === "assistant" ? "Respuesta de LumenAI" : "Mensaje de cliente"}</strong><small>{message.content || "Mensaje sin contenido"}</small></span>
                <time>{shortDate(message.created_at)}</time>
              </Link>
            )) : <EmptyRow label="Todavía no hay conversaciones." />}
          </div>
        </div>

        <div className="lmx-live-panel">
          <SectionTitle code="05 / PIPELINE" title="Oportunidades en movimiento" copy="Leads listos para una acción humana o automática." href="/panel/leads" action="Abrir pipeline" />
          <div className="lmx-command-list">
            {loading ? <EmptyRow label="Leyendo pipeline…" /> : (data?.recentLeads ?? []).length ? (data?.recentLeads ?? []).slice(0, 4).map((lead) => (
              <Link key={lead.id} href={lead.chat_id ? `/panel/chat/${lead.chat_id}` : "/panel/leads"}>
                <span className="lmx-command-list-avatar">{leadName(lead).slice(0, 1).toUpperCase()}</span>
                <span><strong>{leadName(lead)}</strong><small>{lead.status === "new" ? "Nuevo lead" : lead.status} · Potencial comercial</small></span>
                <b>{lead.score ?? 0}<small>%</small></b>
              </Link>
            )) : <EmptyRow label="Todavía no hay oportunidades." />}
          </div>
        </div>
      </section>

      <section className="lmx-capability-index">
        <SectionTitle code="06 / CAPACIDADES" title="Arquitectura LumenAI" copy="Cada módulo cumple una función dentro del sistema comercial." />
        <div>
          <Module href="/panel/calibration" code="CAL" icon={Zap} title="Calibración" copy="Identidad, ventas y límites" />
          <Module href="/panel/knowledge" code="KNW" icon={BookOpenText} title="Knowledge" copy="Memoria operativa" />
          <Module href="/panel/radar" code="RAD" icon={Sparkles} title="Pulse Radar" copy="Señales y decisiones" />
          <Module href="/panel/growth" code="GTH" icon={TrendingUp} title="Growth" copy="Demanda y conversión" />
          <Module href="/panel/approvals" code="APR" icon={ShieldCheck} title="Aprobaciones" copy="Control humano" />
          <Module href="/panel/system-health" code="SYS" icon={HeartPulse} title="System Health" copy="Servicios y evidencia" />
        </div>
      </section>
    </div>
  );
}

function StateLine({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div><small>{label}</small><strong>{String(value).padStart(2, "0")}</strong><span>{detail}</span></div>;
}

function Metric({ icon: Icon, code, label, value, detail, href, loading, active = false }: { icon: typeof Target; code: string; label: string; value: string | number; detail: string; href: string; loading: boolean; active?: boolean }) {
  return (
    <Link href={href} className="lmx-ledger-metric" data-active={active ? "true" : "false"}>
      <span className="lmx-ledger-code">{code}</span>
      <span className="lmx-ledger-icon"><Icon aria-hidden="true" /></span>
      <span><small>{label}</small><strong>{loading ? "—" : value}</strong><em>{detail}</em></span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function SectionTitle({ code, title, copy, href, action }: { code: string; title: string; copy: string; href?: string; action?: string }) {
  return (
    <header className="lmx-command-section-title">
      <div><span>{code}</span><h2>{title}</h2><p>{copy}</p></div>
      {href && action ? <Link href={href}>{action}<ArrowRight aria-hidden="true" /></Link> : null}
    </header>
  );
}

function Module({ href, code, icon: Icon, title, copy }: { href: string; code: string; icon: typeof Target; title: string; copy: string }) {
  return (
    <Link href={href} className="lmx-capability">
      <span className="lmx-capability-code">{code}</span>
      <span className="lmx-capability-icon"><Icon aria-hidden="true" /></span>
      <strong>{title}</strong>
      <small>{copy}</small>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="lmx-command-empty"><Clock3 aria-hidden="true" /><span>{label}</span></div>;
}
