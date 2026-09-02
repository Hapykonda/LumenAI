import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";
import { getLumenitePublicStatus, type LumeniteAgentKey } from "@/lib/ai/lumenite/env";
import { resolveCountryDisplay, resolveCountryKey } from "@/lib/geo/countries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OverviewRow = Record<string, unknown>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function countByStatus(leads: OverviewRow[], status: string) {
  return leads.filter((lead) => String(lead.status || "") === status).length;
}

function countKbByType(items: OverviewRow[], type: string) {
  return items.filter(
    (item) => item.is_published && String(item.type || "").toLowerCase() === type
  ).length;
}

function formatPreview(value: unknown, max = 160) {
  const text = clean(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function readMeta(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeCountry(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readCountryFromMetadata(metaInput: unknown) {
  const meta = readMeta(metaInput);
  const nestedGeo = readMeta(meta.geo);
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

  const key = resolveCountryKey(value, code) || normalizeCountry(value);
  if (!key || key === "sin datos" || key === "unknown") return null;

  return {
    key,
    name: resolveCountryDisplay(value, code) || clean(value) || key,
  };
}

function pushBar<T extends { value: number }>(items: T[], total: number) {
  return items.map((item) => ({
    ...item,
    percent: total ? Math.round((item.value / total) * 100) : 0,
  }));
}

function dayKeyFrom(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function dateValue(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function newestDate(rows: OverviewRow[], fields = ["updated_at", "created_at"]) {
  let latest = 0;
  for (const row of rows) {
    for (const field of fields) latest = Math.max(latest, dateValue(row?.[field]));
  }
  return latest ? new Date(latest).toISOString() : null;
}

function sevenDayComparison(rows: OverviewRow[], field = "created_at") {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const currentStart = now - 7 * day;
  const previousStart = now - 14 * day;
  const current = rows.filter((row) => dateValue(row?.[field]) >= currentStart).length;
  const previous = rows.filter((row) => {
    const timestamp = dateValue(row?.[field]);
    return timestamp >= previousStart && timestamp < currentStart;
  }).length;
  return { current, previous, label: `7 dias: ${current}; periodo anterior: ${previous}` };
}

function buildDayKeys(days = 14) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: date.toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
    };
  });
}

function buildPerformance(input: {
  chats: OverviewRow[];
  leads: OverviewRow[];
  kbItems: OverviewRow[];
  messages: OverviewRow[];
  chatGeoRows: OverviewRow[];
}) {
  const { chats, leads, kbItems, messages, chatGeoRows } = input;
  const totalLeads = Math.max(leads.length, 1);
  const totalChats = Math.max(chats.length, 1);

  const leadFunnel = pushBar(
    [
      { key: "new", label: "Nuevos", value: countByStatus(leads, "new") },
      { key: "contacted", label: "Contactados", value: countByStatus(leads, "contacted") },
      { key: "qualified", label: "Calificados", value: countByStatus(leads, "qualified") },
      { key: "won", label: "Ganados", value: countByStatus(leads, "won") },
    ],
    totalLeads
  );

  const channelCounts = chats.reduce((acc: Record<string, number>, chat) => {
    const key = clean(chat.channel || "panel") || "panel";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const channels = pushBar(
    Object.entries(channelCounts)
      .map(([key, value]) => ({
        key,
        label: key === "widget" ? "Widget publico" : key,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    totalChats
  );

  const knowledgeTypes = ["services", "pricing", "payment", "faq", "policy", "contact", "other"];
  const knowledgeMix = pushBar(
    knowledgeTypes.map((type) => ({
      key: type,
      label:
        type === "services"
          ? "Servicios"
          : type === "pricing"
          ? "Precios"
          : type === "payment"
          ? "Pagos"
          : type === "faq"
          ? "FAQ"
          : type === "policy"
          ? "Politicas"
          : type === "contact"
          ? "Contacto"
          : "Otros",
      value: kbItems.filter((item) => String(item.type || "other").toLowerCase() === type).length,
    })),
    Math.max(kbItems.length, 1)
  );

  const hourMap = new Map<number, { hour: number; value: number; customers: number; assistant: number }>();
  for (let hour = 0; hour < 24; hour += 1) {
    hourMap.set(hour, { hour, value: 0, customers: 0, assistant: 0 });
  }

  messages.forEach((message) => {
    const date = message.created_at ? new Date(String(message.created_at)) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const item = hourMap.get(date.getHours());
    if (!item) return;
    item.value += 1;
    if (message.sender_type === "user") item.customers += 1;
    if (message.sender_type === "assistant") item.assistant += 1;
  });

  const hourlyActivity = [...hourMap.values()]
    .filter((item) => item.value > 0)
    .slice(-12)
    .map((item) => ({
      ...item,
      label: `${String(item.hour).padStart(2, "0")}:00`,
    }));

  const daySeeds = buildDayKeys(14);
  const daily = new Map(
    daySeeds.map((day) => [
      day.key,
      {
        date: day.key,
        label: day.label,
        widgetUsers: 0,
        leads: 0,
        buyers: 0,
      },
    ])
  );
  const widgetVisitorsByDay = new Map<string, Set<string>>();

  chats.forEach((chat) => {
    if (String(chat.channel || "").toLowerCase() !== "widget") return;
    const key = dayKeyFrom(chat.created_at);
    if (!key || !daily.has(key)) return;

    const visitors = widgetVisitorsByDay.get(key) ?? new Set<string>();
    visitors.add(String(chat.visitor_id || chat.id));
    widgetVisitorsByDay.set(key, visitors);
  });

  leads.forEach((lead) => {
    const leadKey = dayKeyFrom(lead.created_at);
    if (leadKey && daily.has(leadKey)) {
      daily.get(leadKey)!.leads += 1;
    }

    if (String(lead.status || "").toLowerCase() === "won") {
      const wonKey = dayKeyFrom(lead.updated_at || lead.created_at);
      if (wonKey && daily.has(wonKey)) {
        daily.get(wonKey)!.buyers += 1;
      }
    }
  });

  widgetVisitorsByDay.forEach((visitors, key) => {
    const item = daily.get(key);
    if (item) item.widgetUsers = visitors.size;
  });

  const growthSeries = [...daily.values()];

  const chatCountry = new Map<string, string>();
  const geoMap = new Map<
    string,
    {
      country: string;
      countryKey: string;
      people: number;
      leads: number;
      hot: number;
      messages: number;
    }
  >();

  function ensureCountry(countryKey: string, countryName?: string) {
    const current =
      geoMap.get(countryKey) ?? {
        country: countryName || countryKey,
        countryKey,
        people: 0,
        leads: 0,
        hot: 0,
        messages: 0,
      };

    if (countryName && current.country === countryKey) {
      current.country = countryName;
    }

    geoMap.set(countryKey, current);
    return current;
  }

  chatGeoRows.forEach((chat) => {
    const country = readCountryFromMetadata(chat.metadata);
    if (!country) return;
    chatCountry.set(String(chat.id), country.key);
    ensureCountry(country.key, country.name).people += 1;
  });

  leads.forEach((lead) => {
    const country = readCountryFromMetadata(lead.metadata);
    if (!country) return;
    if (lead.chat_id) chatCountry.set(String(lead.chat_id), country.key);
    const item = ensureCountry(country.key, country.name);
    item.leads += 1;
    item.people += chatGeoRows.length ? 0 : 1;
    if (Number(lead.score || 0) >= 70) item.hot += 1;
  });

  messages.forEach((message) => {
    const country = chatCountry.get(String(message.chat_id));
    if (!country) return;
    ensureCountry(country).messages += 1;
  });

  const geo = [...geoMap.values()].sort((a, b) => {
    const scoreA = a.messages + a.leads * 2 + a.people;
    const scoreB = b.messages + b.leads * 2 + b.people;
    return scoreB - scoreA;
  });

  return {
    leadFunnel,
    channels,
    knowledgeMix,
    hourlyActivity,
    growthSeries,
    geo,
  };
}

export async function GET(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:read",
    });
    const admin = context.admin;
    const business = context.activeBusiness;
    const businessId = context.businessId;

    const [
      chatsResult,
      leadsResult,
      kbResult,
      widgetResult,
      messagesResult,
      actionRunsResult,
      approvalsResult,
      pulseResult,
      auditResult,
    ] = await Promise.all([
      admin
        .from("chats")
        .select(
          "id,title,channel,visitor_id,unread_owner,human_takeover,human_takeover_at,created_at,updated_at"
        )
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(100),

      admin
        .from("leads")
        .select(
          "id,chat_id,name,email,phone,source,intent,summary,status,score,metadata,created_at,updated_at"
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(100),

      admin
        .from("business_kb")
        .select("id,type,title,is_published,created_at,updated_at")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(200),

      admin
        .from("widget_settings")
        .select(
          "business_id,widget_enabled,assistant_name,greeting,whatsapp,email,published_settings,published_at,updated_at"
        )
        .eq("business_id", businessId)
        .maybeSingle(),

      admin
        .from("chat_messages")
        .select("id,chat_id,business_id,sender_type,content,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(160),

      admin
        .from("lumenai_action_runs")
        .select(
          "id,capability,status,risk_level,source,error_message,created_at,updated_at,completed_at,failed_at"
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(100),

      admin
        .from("lumenai_action_approvals")
        .select("id,action_run_id,decision,expires_at,created_at,decided_at")
        .eq("business_id", businessId)
        .eq("decision", "pending")
        .order("created_at", { ascending: false })
        .limit(100),

      admin
        .from("lumenai_pulse_signals")
        .select(
          "id,title,severity,status,source_label,period_label,recommended_capability,action_run_id,last_error,snoozed_until,last_refreshed_at,created_at,updated_at"
        )
        .eq("business_id", businessId)
        .order("last_refreshed_at", { ascending: false })
        .limit(100),

      admin
        .from("lumenai_audit_log")
        .select("id,action,target_table,target_id,metadata,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const failedQuery = [
      chatsResult,
      leadsResult,
      kbResult,
      widgetResult,
      messagesResult,
      actionRunsResult,
      approvalsResult,
      pulseResult,
      auditResult,
    ].find((result) => result.error);
    if (failedQuery?.error) throw failedQuery.error;

    const chats = Array.isArray(chatsResult.data) ? chatsResult.data : [];
    const leads = Array.isArray(leadsResult.data) ? leadsResult.data : [];
    const kbItems = Array.isArray(kbResult.data) ? kbResult.data : [];
    const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];
    const actionRuns = Array.isArray(actionRunsResult.data) ? actionRunsResult.data : [];
    const approvals = Array.isArray(approvalsResult.data) ? approvalsResult.data : [];
    const pulseSignals = Array.isArray(pulseResult.data) ? pulseResult.data : [];
    const auditRows = Array.isArray(auditResult.data) ? auditResult.data : [];
    const widget = widgetResult.data ?? null;
    let chatGeoRows: OverviewRow[] = [];

    try {
      const { data, error } = await admin
        .from("chats")
        .select("id,visitor_id,metadata,created_at,updated_at")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data)) {
        chatGeoRows = data;
      }
    } catch {}

    const publishedKb = kbItems.filter((item) => item.is_published);

    const widgetEnabled =
      typeof widget?.widget_enabled === "boolean" ? widget.widget_enabled : false;

    const hasContact = Boolean(clean(widget?.whatsapp) || clean(widget?.email));

    const checks = {
      knowledge: publishedKb.length > 0,
      services: countKbByType(kbItems, "services") > 0,
      pricing: countKbByType(kbItems, "pricing") > 0,
      faq: countKbByType(kbItems, "faq") > 0,
      contact: hasContact,
      widget: widgetEnabled,
    };

    const done = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const launchPercent = Math.round((done / total) * 100);

    const recentLeads = leads.slice(0, 5).map((lead) => ({
      id: lead.id,
      chat_id: lead.chat_id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      score: lead.score,
      intent: lead.intent,
      source: lead.source,
      created_at: lead.created_at,
    }));

    const recentMessages = messages.slice(0, 6).map((message) => ({
      id: message.id,
      chat_id: message.chat_id,
      sender_type: message.sender_type,
      content: formatPreview(message.content),
      created_at: message.created_at,
    }));

    const stats = {
      chats_total: chats.length,
      chats_unread: chats.filter((chat) => Boolean(chat.unread_owner)).length,
      chats_paused: chats.filter((chat) => Boolean(chat.human_takeover)).length,
      chats_widget: chats.filter((chat) => chat.channel === "widget").length,

      leads_total: leads.length,
      leads_new: countByStatus(leads, "new"),
      leads_contacted: countByStatus(leads, "contacted"),
      leads_qualified: countByStatus(leads, "qualified"),
      leads_won: countByStatus(leads, "won"),
      leads_lost: countByStatus(leads, "lost"),

      kb_total: kbItems.length,
      kb_published: publishedKb.length,
      kb_services: countKbByType(kbItems, "services"),
      kb_pricing: countKbByType(kbItems, "pricing"),
      kb_payment: countKbByType(kbItems, "payment"),
      kb_faq: countKbByType(kbItems, "faq"),
      kb_policy: countKbByType(kbItems, "policy"),
      kb_contact: countKbByType(kbItems, "contact"),

      launch_percent: launchPercent,
      launch_done: done,
      launch_total: total,
    };
    const performance = buildPerformance({
      chats,
      leads,
      kbItems,
      messages,
      chatGeoRows,
    });
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const activeApprovals = approvals.filter(
      (approval) => !approval.expires_at || dateValue(approval.expires_at) > now,
    );
    const expiredApprovals = approvals.filter(
      (approval) => approval.expires_at && dateValue(approval.expires_at) <= now,
    );
    const activeActionStatuses = new Set([
      "awaiting_approval",
      "approved",
      "queued",
      "executing",
      "verifying",
    ]);
    const activeActionRuns = actionRuns.filter((run) => activeActionStatuses.has(run.status));
    const completedActions7d = actionRuns.filter(
      (run) =>
        ["completed", "undo_available", "reverted"].includes(run.status) &&
        dateValue(run.completed_at || run.updated_at) >= now - 7 * day,
    );
    const failedActions24h = actionRuns.filter(
      (run) =>
        ["failed", "partially_completed"].includes(run.status) &&
        dateValue(run.failed_at || run.updated_at) >= now - day,
    );
    const inactivePulseStatuses = new Set(["resolved", "dismissed", "reverted"]);
    const activePulseSignals = pulseSignals.filter(
      (signal) =>
        !inactivePulseStatuses.has(signal.status) &&
        (!signal.snoozed_until || dateValue(signal.snoozed_until) <= now),
    );
    const criticalPulseSignals = activePulseSignals.filter(
      (signal) => signal.severity === "critical" || signal.status === "failed",
    );
    const criticalAlerts =
      criticalPulseSignals.length + failedActions24h.length + expiredApprovals.length;
    const opportunityLeads = leads.filter((lead) =>
      ["new", "qualified"].includes(String(lead.status || "")),
    );
    const chatComparison = sevenDayComparison(chats);
    const leadComparison = sevenDayComparison(leads);
    const activity24h = auditRows.filter((row) => dateValue(row.created_at) >= now - day);
    const lumeniteAgents: LumeniteAgentKey[] = [
      "calibration",
      "config-ai",
      "lumen-eye",
      "pulse-radar",
      "research",
      "widget",
      "chats",
      "knowledge",
      "interface",
      "overview",
      "access",
    ];
    const environmentStatus = lumeniteAgents.map((agent) => ({
      agent,
      ...getLumenitePublicStatus(agent),
    }));
    const missingEnvironment = environmentStatus.filter((item) => !item.configured);
    const healthCritical = missingEnvironment.some((item) => item.agent === "widget");
    const healthWarnings =
      Object.values(checks).filter((ready) => !ready).length +
      missingEnvironment.filter((item) => item.agent !== "widget").length;
    const healthState = healthCritical
      ? "critical"
      : healthWarnings > 0
        ? "warning"
        : "ready";
    const generatedAt = new Date(now).toISOString();
    const metric = (input: Record<string, unknown>) => ({
      updatedAt: generatedAt,
      ...input,
    });
    const commandCenter = {
      generatedAt,
      summary: {
        health: healthState,
        criticalAlerts,
        pendingApprovals: activeApprovals.length,
        activeLumeniteActions: activeActionRuns.length,
      },
      metrics: [
        metric({
          key: "health",
          label: "Salud del sistema",
          value: healthState === "ready" ? "Operativo" : healthState === "warning" ? "Atencion" : "Critico",
          meaning: "Disponibilidad funcional, configuracion esencial y cobertura de agentes.",
          source: "System Health + configuracion del workspace",
          period: "Estado actual",
          comparison: `${healthWarnings} advertencia(s); ${missingEnvironment.length} entorno(s) pendiente(s)`,
          state: healthState,
          href: "/panel/access?view=security",
          actionLabel: "Abrir salud",
        }),
        metric({
          key: "alerts",
          label: "Alertas criticas",
          value: criticalAlerts,
          meaning: "Senales criticas, ejecuciones fallidas recientes y aprobaciones vencidas.",
          source: "Pulse Radar + Lumenite + Approval Inbox",
          period: "Activas; fallos de las ultimas 24 h",
          updatedAt: newestDate([...pulseSignals, ...actionRuns, ...approvals]) || generatedAt,
          comparison: `${criticalPulseSignals.length} Pulse; ${failedActions24h.length} ejecucion(es); ${expiredApprovals.length} vencida(s)`,
          state: criticalAlerts > 0 ? "critical" : "ready",
          href: criticalPulseSignals.length ? "/panel/radar" : "/panel/access?view=security",
          actionLabel: criticalAlerts > 0 ? "Resolver alertas" : "Ver estado",
        }),
        metric({
          key: "approvals",
          label: "Aprobaciones pendientes",
          value: activeApprovals.length,
          meaning: "Acciones de Lumenite que requieren una decision humana antes de ejecutarse.",
          source: "Lumenite Approval Inbox",
          period: "Pendientes y no vencidas",
          updatedAt: newestDate(approvals) || generatedAt,
          comparison: `${expiredApprovals.length} solicitud(es) vencida(s) detectada(s)`,
          state: activeApprovals.length > 0 ? "warning" : "ready",
          href: "/panel/overview?view=decisions",
          actionLabel: "Revisar inbox",
        }),
        metric({
          key: "lumenite",
          label: "Acciones Lumenite",
          value: activeActionRuns.length,
          meaning: "Planes actualmente esperando, en cola, ejecutandose o verificandose.",
          source: "Lumenite Action OS",
          period: "Estado actual; comparacion 7 dias",
          updatedAt: newestDate(actionRuns) || generatedAt,
          comparison: `${completedActions7d.length} completada(s) o revertida(s) en 7 dias`,
          state: failedActions24h.length ? "critical" : activeActionRuns.length ? "active" : "ready",
          href: "/panel/radar?view=actions",
          actionLabel: "Abrir Lumenite",
        }),
        metric({
          key: "pulse",
          label: "Senales Pulse",
          value: activePulseSignals.length,
          meaning: "Condiciones operativas con evidencia que todavia requieren lectura o accion.",
          source: "Pulse Radar persistido",
          period: "Activas y no pospuestas",
          updatedAt: newestDate(pulseSignals, ["last_refreshed_at", "updated_at"]) || generatedAt,
          comparison: `${criticalPulseSignals.length} critica(s); ${pulseSignals.length - activePulseSignals.length} cerrada(s) o pospuesta(s)`,
          state: criticalPulseSignals.length ? "critical" : activePulseSignals.length ? "warning" : "ready",
          href: "/panel/radar",
          actionLabel: "Abrir Radar",
        }),
        metric({
          key: "opportunities",
          label: "Oportunidades",
          value: opportunityLeads.length,
          meaning: "Leads nuevos o calificados que conservan potencial comercial abierto.",
          source: "Pipeline de leads",
          period: "Acumulado actual",
          updatedAt: newestDate(leads) || generatedAt,
          comparison: `${stats.leads_won} ganada(s); ${stats.leads_lost} perdida(s)`,
          state: opportunityLeads.length ? "active" : "muted",
          href: "/panel/chat?view=leads",
          actionLabel: "Priorizar leads",
        }),
        metric({
          key: "conversations",
          label: "Conversaciones",
          value: chats.length,
          meaning: "Conversaciones reales registradas en los canales del workspace.",
          source: "Chats del panel y widget",
          period: "Total; comparacion movil de 7 dias",
          updatedAt: newestDate(chats) || generatedAt,
          comparison: chatComparison.label,
          state: stats.chats_unread > 0 ? "warning" : chats.length ? "active" : "muted",
          href: "/panel/chat",
          actionLabel: "Abrir conversaciones",
        }),
        metric({
          key: "leads",
          label: "Leads",
          value: leads.length,
          meaning: "Contactos comerciales captados y almacenados en el negocio activo.",
          source: "CRM interno de LumenAI",
          period: "Total; comparacion movil de 7 dias",
          updatedAt: newestDate(leads) || generatedAt,
          comparison: leadComparison.label,
          state: leads.length ? "active" : "muted",
          href: "/panel/chat?view=leads",
          actionLabel: "Ver pipeline",
        }),
        metric({
          key: "activity",
          label: "Actividad reciente",
          value: activity24h.length,
          meaning: "Eventos auditados producidos por usuarios, agentes y ciclos operativos.",
          source: "Audit Log inmutable",
          period: "Ultimas 24 horas",
          updatedAt: newestDate(auditRows, ["created_at"]) || generatedAt,
          comparison: `${auditRows.length} evento(s) disponibles en la ventana consultada`,
          state: activity24h.length ? "active" : "muted",
          href: "/panel/access?view=security",
          actionLabel: "Revisar actividad",
        }),
        metric({
          key: "coverage",
          label: "Cobertura operativa",
          value: `${launchPercent}%`,
          meaning: "Configuracion de Knowledge, contacto y canal publico necesaria para operar.",
          source: "Widget Settings + Knowledge",
          period: "Estado actual",
          updatedAt: newestDate([...(widget ? [widget] : []), ...kbItems]) || generatedAt,
          comparison: `${done} de ${total} controles esenciales completos`,
          state: launchPercent >= 80 ? "ready" : launchPercent >= 55 ? "warning" : "critical",
          href: "/panel/autoconfig",
          actionLabel: "Completar configuracion",
        }),
      ],
    };

    return NextResponse.json({
      ok: true,
      business: {
        id: businessId,
        name: business.name ?? "Tu negocio",
        public_key: business.public_key ?? null,
      },
      widget: {
        enabled: widgetEnabled,
        assistant_name: widget?.assistant_name ?? "LumenAI",
        published_at: widget?.published_at ?? null,
        updated_at: widget?.updated_at ?? null,
        has_contact: hasContact,
        whatsapp: widget?.whatsapp ?? null,
        email: widget?.email ?? null,
      },
      checks,
      stats,
      performance,
      commandCenter,
      recentLeads,
      recentMessages,
    });
  } catch (error: unknown) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "overview_error",
      },
      { status: 500 }
    );
  }
}
