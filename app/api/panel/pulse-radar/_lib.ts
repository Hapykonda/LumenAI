import { NextResponse } from "next/server";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText, clampNumber, safeJson } from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";
import {
  getInsightEmoji,
  toneFromSeverity,
  type InsightMood,
  type InsightSeverity,
  type InsightType,
  type PulseOverallStatus,
  type PulseRecommendation,
} from "@/lib/pulse-insights";
import { expressionForInsight } from "@/lib/pulse-radar/expression-catalog";
import {
  isSafePulseRoute,
  type PulseInsightKind,
  type PulseInsightSeverity,
  type PulseRadarInsight,
} from "@/lib/pulse-radar/types";
import {
  upsertPulseSignals,
  type PulseSignalDetection,
  type PulseSignalRow,
} from "@/lib/pulse-radar/lifecycle";

type PulseSignal = {
  label: string;
  value: string;
  tone: "good" | "warn" | "risk" | "info";
};

type PulseMetrics = {
  readiness: number;
  leadsTotal: number;
  chatsTotal: number;
  messagesTotal: number;
  leads24h: number;
  chats24h: number;
  messages24h: number;
  unreadChats: number;
  hotLeads: number;
  opportunitiesOpen: number;
  knowledgePublished: number;
  widgetConfigured: boolean;
  widgetEnabled: boolean;
  calibrationPublished: boolean;
  activeCampaigns: number;
  hasEnoughActivity: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function recentCount(items: Array<Record<string, unknown>>, field = "created_at") {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const date = new Date(cleanText(item[field], 80)).getTime();
    return Number.isFinite(date) && date >= since;
  }).length;
}

function widgetEnabledFrom(widget: Record<string, unknown> | null) {
  const published = asRecord(widget?.published_settings);
  const draft = asRecord(widget?.draft_settings);
  const publishedWidget = asRecord(published.widget);
  const draftWidget = asRecord(draft.widget);

  return Boolean(widget?.widget_enabled ?? publishedWidget.widgetEnabled ?? draftWidget.widgetEnabled);
}

function businessHasContact(widget: Record<string, unknown> | null) {
  const published = asRecord(widget?.published_settings);
  const draft = asRecord(widget?.draft_settings);
  const publishedWidget = asRecord(published.widget);
  const draftWidget = asRecord(draft.widget);

  return Boolean(
    cleanText(widget?.whatsapp, 120) ||
      cleanText(widget?.email, 120) ||
      cleanText(publishedWidget.whatsapp, 120) ||
      cleanText(publishedWidget.email, 120) ||
      cleanText(draftWidget.whatsapp, 120) ||
      cleanText(draftWidget.email, 120),
  );
}

function buildMetrics(snapshot: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>): PulseMetrics {
  const widget = snapshot.widget;
  const widgetConfigured = Boolean(widget);
  const widgetEnabled = widgetEnabledFrom(widget);
  const calibrationPublished = Object.keys(asRecord(widget?.published_settings)).length > 0;
  const hasContact = businessHasContact(widget);
  const leads24h = recentCount(snapshot.leads);
  const chats24h = recentCount(snapshot.chats, "updated_at");
  const messages24h = recentCount(snapshot.messages);
  const checks = [
    widgetConfigured,
    widgetEnabled,
    calibrationPublished,
    hasContact,
    snapshot.stats.knowledgePublished > 0,
    snapshot.leads.length > 0 || snapshot.chats.length > 0,
  ];
  const readiness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    readiness,
    leadsTotal: snapshot.leads.length,
    chatsTotal: snapshot.chats.length,
    messagesTotal: snapshot.messages.length,
    leads24h,
    chats24h,
    messages24h,
    unreadChats: snapshot.stats.unreadChats,
    hotLeads: snapshot.stats.hotLeads,
    opportunitiesOpen: snapshot.stats.openOpportunities,
    knowledgePublished: snapshot.stats.knowledgePublished,
    widgetConfigured,
    widgetEnabled,
    calibrationPublished,
    activeCampaigns: snapshot.stats.activeCampaigns,
    hasEnoughActivity: snapshot.leads.length > 0 || snapshot.chats.length > 0 || snapshot.messages.length > 0,
  };
}

function recommendation(
  title: string,
  message: string,
  type: InsightType,
  severity: InsightSeverity,
  cta: string,
  href: string,
  reasoning = message,
  priority: "low" | "medium" | "high" = severity === "critical" || severity === "warning" ? "high" : "medium",
): PulseRecommendation {
  return {
    id: `${type}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`,
    title,
    message,
    reasoning,
    priority,
    type,
    severity,
    emoji: getInsightEmoji(type, severity),
    cta,
    ctaLabel: cta,
    href,
  };
}

function buildDeterministicRecommendations(metrics: PulseMetrics): PulseRecommendation[] {
  const recs: PulseRecommendation[] = [];

  if (!metrics.widgetConfigured || !metrics.widgetEnabled) {
    recs.push(
      recommendation(
        "Activa el widget",
        "Conecta el widget para empezar a recibir señales reales del sitio.",
        "widget",
        "warning",
        "Abrir widget",
        "/panel/widget",
      ),
    );
  }

  if (!metrics.calibrationPublished) {
    recs.push(
      recommendation(
        "Publica la calibración",
        "El asistente necesita una personalidad publicada para responder con consistencia.",
        "calibration",
        "warning",
        "Ajustar",
        "/panel/calibration",
      ),
    );
  }

  if (!metrics.knowledgePublished) {
    recs.push(
      recommendation(
        "Carga conocimiento clave",
        "Agrega precios, políticas y preguntas frecuentes para mejorar la precisión.",
        "knowledge",
        "warning",
        "Revisar knowledge",
        "/panel/knowledge",
      ),
    );
  }

  if (metrics.unreadChats > 0) {
    recs.push(
      recommendation(
        "Revisa conversaciones pendientes",
        `Hay ${metrics.unreadChats} chat(s) que conviene revisar antes de perder contexto.`,
        "chat",
        "critical",
        "Ver chats",
        "/panel/chat",
      ),
    );
  }

  if (metrics.hotLeads > 0) {
    recs.push(
      recommendation(
        "Prioriza leads calientes",
        `${metrics.hotLeads} lead(s) tienen señales comerciales altas y pueden requerir seguimiento.`,
        "sales",
        "success",
        "Ver leads",
        "/panel/leads",
      ),
    );
  }

  if (!metrics.hasEnoughActivity) {
    recs.push(
      recommendation(
        "Prueba el flujo completo",
        "Aún no hay conversaciones suficientes. Abre el widget, envía un mensaje de prueba y valida la captura de leads.",
        "activity",
        "info",
        "Probar widget",
        "/panel/widget",
      ),
    );
  }

  if (!recs.length) {
    recs.push(
      recommendation(
        "Mantén el monitoreo activo",
        "El sistema tiene datos reales. Revisa oportunidades y conversaciones recientes para decidir el siguiente paso.",
        "system",
        "success",
        "Abrir overview",
        "/panel/overview",
      ),
    );
  }

  return recs.slice(0, 5);
}

function buildSignals(metrics: PulseMetrics): PulseSignal[] {
  return [
    {
      label: "Readiness",
      value: `${metrics.readiness}%`,
      tone: metrics.readiness >= 80 ? "good" : metrics.readiness >= 50 ? "warn" : "risk",
    },
    {
      label: "Widget",
      value: metrics.widgetEnabled ? "Activo" : metrics.widgetConfigured ? "Pendiente" : "Sin configurar",
      tone: metrics.widgetEnabled ? "good" : "warn",
    },
    {
      label: "Knowledge",
      value: metrics.knowledgePublished ? "Lista" : "Pendiente",
      tone: metrics.knowledgePublished ? "good" : "warn",
    },
    {
      label: "Chats 24h",
      value: String(metrics.chats24h),
      tone: metrics.chats24h ? "good" : "info",
    },
    {
      label: "Leads 24h",
      value: String(metrics.leads24h),
      tone: metrics.leads24h ? "good" : "info",
    },
  ];
}

function moodFromMetrics(metrics: PulseMetrics): InsightMood {
  if (metrics.unreadChats > 0 || metrics.readiness < 50) return "warning";
  if (metrics.hotLeads > 0 || metrics.leads24h > 0) return "growth";
  if (metrics.messages24h > 0 || metrics.chats24h > 0) return "active";
  if (metrics.readiness >= 80) return "focused";
  return "calm";
}

function statusFromMetrics(metrics: PulseMetrics): PulseOverallStatus {
  if (!metrics.hasEnoughActivity && metrics.readiness < 55) return "empty";
  if (metrics.unreadChats > 0 || metrics.readiness < 50) return "warning";
  if (metrics.hotLeads > 0 || metrics.leads24h > 0 || metrics.opportunitiesOpen > 0) return "opportunity";
  if (!metrics.widgetEnabled || !metrics.calibrationPublished || !metrics.knowledgePublished) return "needs_setup";
  return "healthy";
}

function assistantFallback(metrics: PulseMetrics, recommendations: PulseRecommendation[]) {
  const mood = moodFromMetrics(metrics);
  const greeting =
    mood === "warning"
      ? "Estoy atento a una señal que conviene revisar."
      : mood === "opportunity"
        ? "Veo una oportunidad comercial para priorizar."
        : mood === "active"
          ? "Estoy leyendo actividad reciente del sistema."
          : "Estoy listo para ayudarte a preparar el panel.";

  const summary = metrics.hasEnoughActivity
    ? `Detecté ${metrics.chatsTotal} chat(s), ${metrics.leadsTotal} lead(s) y ${metrics.knowledgePublished} pieza(s) de knowledge publicada(s).`
    : "Sin datos suficientes todavía. Conecta el widget, publica calibración y carga conocimiento para empezar a recibir señales.";

  return {
    greeting,
    mood,
    summary,
    recommendations,
  };
}

async function buildAiAssistantResponse(input: {
  metrics: PulseMetrics;
  recommendations: PulseRecommendation[];
  businessName: string;
  section: string;
}) {
  const fallback = assistantFallback(input.metrics, input.recommendations);
  const aiText = await callGroqChat({
    purpose: "panel",
    responseFormat: "json_object",
    temperature: 0.25,
    maxTokens: 700,
    messages: [
      {
        role: "system",
        content:
          "Eres el operador ejecutivo de Pulse Radar dentro del panel LumenAI. Devuelve solo JSON con greeting, mood, summary y recommendations. Usa lenguaje de briefing operativo, no chatbot. Usa solo los numeros enviados. Si faltan datos, dilo con honestidad y recomienda pasos concretos. No inventes metricas.",
      },
      {
        role: "user",
        content: JSON.stringify({
          businessName: input.businessName,
          section: input.section,
          metrics: input.metrics,
          deterministicRecommendations: input.recommendations,
          allowedMoods: ["calm", "active", "focused", "warning", "growth", "opportunity"],
          allowedTypes: ["knowledge", "widget", "sales", "lead", "calibration", "chat", "system", "activity"],
          allowedSeverity: ["info", "success", "warning", "critical"],
        }),
      },
    ],
  });

  if (!aiText) return fallback;

  const parsed = safeJson<unknown>(aiText, null);
  if (!isRecord(parsed)) return fallback;

  const mood = ["calm", "active", "focused", "warning", "growth", "opportunity"].includes(cleanText(parsed.mood, 40))
    ? (cleanText(parsed.mood, 40) as InsightMood)
    : fallback.mood;

  const aiRecommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .map((item): PulseRecommendation | null => {
          if (!isRecord(item)) return null;
          const type = cleanText(item.type, 40) as InsightType;
          const severity = cleanText(item.severity, 40) as InsightSeverity;
          if (!["knowledge", "widget", "sales", "lead", "calibration", "chat", "system", "activity"].includes(type)) {
            return null;
          }
          if (!["info", "success", "warning", "critical"].includes(severity)) return null;

          return {
            id: cleanText(item.id, 80) || `${type}-${cleanText(item.title, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            title: cleanText(item.title, 90) || "Recomendación",
            message: cleanText(item.message, 220) || "Revisa esta parte del sistema.",
            reasoning: cleanText(item.reasoning, 260) || cleanText(item.message, 220) || "Esta acción mejora el estado operativo del sistema.",
            priority: ["low", "medium", "high"].includes(cleanText(item.priority, 20))
              ? (cleanText(item.priority, 20) as "low" | "medium" | "high")
              : severity === "warning" || severity === "critical"
                ? "high"
                : "medium",
            type,
            severity,
            emoji: cleanText(item.emoji, 8) || getInsightEmoji(type, severity, mood),
            cta: cleanText(item.cta, 40) || "Revisar",
            ctaLabel: cleanText(item.ctaLabel, 40) || cleanText(item.cta, 40) || "Revisar",
            href: cleanText(item.href, 120) || undefined,
          };
        })
        .filter((item): item is PulseRecommendation => Boolean(item))
    : [];

  return {
    greeting: cleanText(parsed.greeting, 160) || fallback.greeting,
    mood,
    summary: cleanText(parsed.summary, 360) || fallback.summary,
    recommendations: aiRecommendations.length ? aiRecommendations.slice(0, 3) : fallback.recommendations,
  };
}

function reportFromMetrics(metrics: PulseMetrics, recommendations: PulseRecommendation[]) {
  return {
    isPreview: false,
    hasInsufficientData: !metrics.hasEnoughActivity,
    performance24h: `${metrics.leads24h} lead(s), ${metrics.chats24h} chat(s), ${metrics.messages24h} mensaje(s) en 24h.`,
    performance7d: `${metrics.leadsTotal} lead(s), ${metrics.chatsTotal} chat(s) y ${metrics.opportunitiesOpen} oportunidad(es) abiertas disponibles.`,
    leadsNew: metrics.leads24h,
    conversations: metrics.chatsTotal,
    responseRate: metrics.messagesTotal ? clampNumber(Math.round((metrics.messages24h / Math.max(metrics.messagesTotal, 1)) * 100), 0, 0, 100) : 0,
    topItem: metrics.knowledgePublished ? "Knowledge publicado" : "Sin knowledge publicado",
    topRegion: "Sin zona suficiente",
    positiveSignals: [
      metrics.widgetEnabled ? "Widget activo" : "",
      metrics.knowledgePublished ? "Knowledge disponible" : "",
      metrics.hotLeads ? `${metrics.hotLeads} lead(s) calientes` : "",
    ].filter(Boolean),
    riskSignals: [
      !metrics.widgetEnabled ? "Widget pendiente" : "",
      !metrics.calibrationPublished ? "Calibración sin publicar" : "",
      !metrics.knowledgePublished ? "Knowledge pendiente" : "",
      metrics.unreadChats ? `${metrics.unreadChats} chat(s) sin leer` : "",
    ].filter(Boolean),
    opportunities: recommendations.map((item) => item.title),
    recommendation: recommendations[0]?.message || "Mantén Pulse Radar activo.",
    strategy: metrics.hasEnoughActivity
      ? "Priorizar conversaciones y convertir señales comerciales en acciones."
      : "Completar configuración base antes de optimizar ventas.",
    trend: [metrics.leads24h, metrics.chats24h, metrics.messages24h, metrics.hotLeads].map((value) =>
      Math.max(1, Number(value) || 1),
    ),
    nextSteps: recommendations.map((item) => item.cta),
  };
}

function buildPulseSignals(metrics: PulseMetrics, timestamp: string) {
  return [
    {
      id: "widget",
      title: "Widget",
      message: metrics.widgetEnabled
        ? "El widget está activo y puede recibir conversaciones."
        : metrics.widgetConfigured
          ? "El widget existe, pero necesita activarse o probarse."
          : "Conecta tu widget para empezar a recibir señales reales.",
      type: "widget" as const,
      severity: metrics.widgetEnabled ? "success" as const : "warning" as const,
      emoji: getInsightEmoji("widget", metrics.widgetEnabled ? "success" : "warning"),
      timestamp,
      actionHref: "/panel/widget",
    },
    {
      id: "knowledge",
      title: "Knowledge",
      message: metrics.knowledgePublished
        ? `${metrics.knowledgePublished} pieza(s) publicadas para responder con más precisión.`
        : "Carga precios, políticas y preguntas frecuentes para mejorar la precisión.",
      type: "knowledge" as const,
      severity: metrics.knowledgePublished ? "success" as const : "warning" as const,
      emoji: getInsightEmoji("knowledge", metrics.knowledgePublished ? "success" : "warning"),
      timestamp,
      actionHref: "/panel/knowledge",
    },
    {
      id: "chat",
      title: "Conversaciones",
      message: metrics.chats24h
        ? `${metrics.chats24h} chat(s) con actividad en las últimas 24h.`
        : "Aún no hay conversaciones recientes.",
      type: "chat" as const,
      severity: metrics.unreadChats ? "critical" as const : metrics.chats24h ? "success" as const : "info" as const,
      emoji: getInsightEmoji("chat", metrics.unreadChats ? "critical" : metrics.chats24h ? "success" : "info"),
      timestamp,
      actionHref: "/panel/chat",
    },
    {
      id: "lead",
      title: "Leads",
      message: metrics.leads24h
        ? `${metrics.leads24h} lead(s) nuevos en 24h.`
        : "Sin leads nuevos detectados todavía.",
      type: "lead" as const,
      severity: metrics.hotLeads ? "success" as const : metrics.leads24h ? "info" as const : "info" as const,
      emoji: getInsightEmoji("lead", metrics.hotLeads ? "success" : "info"),
      timestamp,
      actionHref: "/panel/leads",
    },
    {
      id: "calibration",
      title: "Calibración",
      message: metrics.calibrationPublished
        ? "La calibración publicada ya puede guiar respuestas del widget."
        : "Publica una calibración para activar respuestas más consistentes.",
      type: "calibration" as const,
      severity: metrics.calibrationPublished ? "success" as const : "warning" as const,
      emoji: getInsightEmoji("calibration", metrics.calibrationPublished ? "success" : "warning"),
      timestamp,
      actionHref: "/panel/calibration",
    },
    {
      id: "system",
      title: "Actividad reciente",
      message: metrics.hasEnoughActivity
        ? `${metrics.messagesTotal} mensaje(s) disponibles para lectura operativa.`
        : "Sin datos suficientes para detectar patrones todavía.",
      type: "system" as const,
      severity: metrics.hasEnoughActivity ? "success" as const : "info" as const,
      emoji: getInsightEmoji("system", metrics.hasEnoughActivity ? "success" : "info"),
      timestamp,
      actionHref: "/panel/overview",
    },
  ];
}

function buildMetricItems(metrics: PulseMetrics) {
  return [
    {
      label: "Readiness",
      value: `${metrics.readiness}%`,
      state: metrics.readiness >= 80 ? "good" as const : metrics.readiness >= 50 ? "neutral" as const : "warning" as const,
      description: "Preparación operativa",
    },
    {
      label: "Chats 24h",
      value: metrics.chats24h,
      state: metrics.chats24h ? "good" as const : "neutral" as const,
      description: "Actividad reciente",
    },
    {
      label: "Leads",
      value: metrics.leadsTotal,
      state: metrics.leadsTotal ? "good" as const : "neutral" as const,
      description: "Contactos capturados",
    },
    {
      label: "Knowledge",
      value: metrics.knowledgePublished,
      state: metrics.knowledgePublished ? "good" as const : "warning" as const,
      description: "Piezas publicadas",
    },
  ];
}

function buildNextBestActions(recommendations: PulseRecommendation[]) {
  return recommendations.slice(0, 5).map((item, index) => ({
    label: item.ctaLabel || item.cta || item.title,
    description: item.reasoning || item.message,
    href: item.href || "/panel/overview",
    priority: index === 0 ? "primary" as const : "secondary" as const,
  }));
}

function emphasisFromBody(body: string) {
  const metric = body.match(/\b\d+(?:[.,]\d+)?(?:\s*%|\s+\w+(?:\(s\))?)?/);
  if (!metric?.[0] || metric[0].length > 48) return [];
  return [{ text: metric[0], kind: "metric" as const }];
}

function sourceLabel(type: InsightType) {
  const labels: Record<InsightType, string> = {
    system: "Sistema",
    knowledge: "Knowledge",
    widget: "Widget",
    sales: "Growth",
    lead: "Leads",
    calibration: "Calibration",
    chat: "Chat",
    activity: "Overview",
  };

  return labels[type];
}

function actionForRecommendation(
  item: PulseRecommendation,
  snapshot: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>,
) {
  const lead = snapshot.leads[0];
  const chat = snapshot.chats.find((row) => row.unread_owner) ?? snapshot.chats[0];
  if ((item.type === "lead" || item.type === "sales") && lead?.id) {
    return {
      capability: "internal.reminder.create",
      input: {
        title: cleanText(item.title, 160),
        note: cleanText(item.message, 1600),
        remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        resourceType: "lead",
        resourceId: lead.id,
      },
    };
  }
  return {
    capability: "internal.task.create",
    input: {
      title: cleanText(item.title, 160),
      description: cleanText(item.message, 1600),
      dueAt: null,
      priority: item.priority === "high" ? "high" : "medium",
      leadId: null,
      conversationId: item.type === "chat" && chat?.id ? chat.id : null,
    },
  };
}

function buildSignalDetections(
  recommendations: PulseRecommendation[],
  snapshot: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>,
  metrics: PulseMetrics,
  periodEnd: string,
): PulseSignalDetection[] {
  const periodStart = new Date(new Date(periodEnd).getTime() - 24 * 60 * 60 * 1000).toISOString();
  return recommendations.slice(0, 5).map((item) => {
    const href = isSafePulseRoute(item.href) ? item.href : "/panel/overview";
    const action = actionForRecommendation(item, snapshot);
    return {
      signalKey: `recommendation:${cleanText(item.id, 100) || item.type}`,
      type: item.type,
      title: cleanText(item.title, 100) || "Senal de Pulse Radar",
      description: cleanText(item.message, 360) || "Revisa el estado actual del sistema.",
      severity: item.severity,
      evidence: {
        basis: cleanText(item.reasoning, 360) || cleanText(item.message, 360),
        metrics: {
          readiness: metrics.readiness,
          leads24h: metrics.leads24h,
          chats24h: metrics.chats24h,
          messages24h: metrics.messages24h,
          unreadChats: metrics.unreadChats,
          hotLeads: metrics.hotLeads,
          knowledgePublished: metrics.knowledgePublished,
          widgetEnabled: metrics.widgetEnabled,
          calibrationPublished: metrics.calibrationPublished,
        },
      },
      sourceLabel: sourceLabel(item.type),
      sourceRoute: href,
      periodLabel: "Ultimas 24 horas y estado actual",
      periodStart,
      periodEnd,
      recommendedCapability: action.capability,
      recommendedInput: action.input,
    };
  });
}

function kindFromSignal(signal: PulseSignalRow): PulseInsightKind {
  if (signal.severity === "critical") return "critical";
  if (signal.severity === "warning") return "warning";
  if (signal.type === "lead" || signal.type === "sales") return "opportunity";
  if (signal.severity === "success") return "success";
  return "recommendation";
}

function severityFromSignal(signal: PulseSignalRow): PulseInsightSeverity {
  if (signal.severity === "critical") return "critical";
  if (signal.severity === "warning") return "high";
  if (signal.severity === "success") return "medium";
  return "low";
}

function buildStructuredInsights(signals: PulseSignalRow[]): PulseRadarInsight[] {
  return signals.map((signal, index) => {
    const kind = kindFromSignal(signal);
    const severity = severityFromSignal(signal);
    const expression = expressionForInsight(kind, severity);
    const href = isSafePulseRoute(signal.source_route) ? signal.source_route : "/panel/overview";
    const retryable = ["failed", "partially_resolved", "reverted"].includes(signal.status);
    const actionHref = retryable
      ? `/panel/lumenite?source=pulse_radar&signal=${encodeURIComponent(signal.id)}&autoplan=1&retry=1`
      : signal.action_run_id
        ? `/panel/lumenite?run=${encodeURIComponent(signal.action_run_id)}`
        : `/panel/lumenite?source=pulse_radar&signal=${encodeURIComponent(signal.id)}&autoplan=1`;
    return {
      id: signal.id,
      type: kind,
      severity,
      expression: expression.id,
      title: signal.title,
      body: signal.description,
      emojis: expression.tone === "critical" ? [] : expression.emoji.slice(0, 2),
      emphasis: emphasisFromBody(signal.description),
      source: { label: signal.source_label, route: href },
      actions: [
        { id: `open-${signal.id}-${index}`, label: "Ver evidencia", href, kind: "primary" as const },
        {
          id: `prepare-${signal.id}-${index}`,
          label: retryable ? "Reintentar con Lumenite" : signal.action_run_id ? "Ver ejecucion" : "Preparar con Lumenite",
          href: actionHref,
          kind: "secondary" as const,
        },
      ],
      createdAt: signal.detected_at,
      read: signal.status !== "new",
      status: signal.status,
      evidence: signal.evidence ?? {},
      period: { label: signal.period_label, start: signal.period_start, end: signal.period_end },
      lastUpdatedAt: signal.last_refreshed_at,
      actionPlanId: signal.action_plan_id,
      actionRunId: signal.action_run_id,
      lastError: signal.last_error,
      snoozedUntil: signal.snoozed_until,
      resolution: signal.resolution ?? {},
    };
  });
}

function suggestedFocusFromStatus(status: PulseOverallStatus, metrics: PulseMetrics) {
  if (status === "empty") return "Prioriza widget, knowledge y calibración antes de medir ventas.";
  if (status === "needs_setup") return "Cierra la configuración base para que LumenAI pueda operar con consistencia.";
  if (status === "warning") return "Revisa chats pendientes y puntos débiles antes de activar más tráfico.";
  if (status === "opportunity") return "Convierte la señal comercial en seguimiento o campaña.";
  return metrics.hasEnoughActivity ? "Mantén el monitoreo y optimiza conversaciones recientes." : "El sistema está estable; falta volumen para patrones.";
}

function questionsFromMetrics(metrics: PulseMetrics) {
  return [
    metrics.knowledgePublished ? "¿Quieres optimizar ventas?" : "¿Cargamos precios y FAQs?",
    metrics.widgetEnabled ? "¿Revisamos conversaciones?" : "¿Probamos el widget?",
    metrics.calibrationPublished ? "¿Afinamos tono comercial?" : "¿Publicamos calibración?",
  ];
}

export async function buildPulseRadarPayload(section = "panel", request?: Request) {
  const ctx = await requireLumeniteBusiness(request);
  const snapshot = await buildLumeniteBusinessSnapshot({
    admin: ctx.admin,
    businessId: ctx.businessId,
    businessName: cleanText(ctx.business.name, 120),
    publicKey: cleanText(ctx.business.public_key, 120) || null,
  });
  const rawMetrics = buildMetrics(snapshot);
  const refreshedAt = new Date().toISOString();
  const overallStatus = statusFromMetrics(rawMetrics);
  const deterministicRecommendations = buildDeterministicRecommendations(rawMetrics);
  const assistantMessage = await buildAiAssistantResponse({
    metrics: rawMetrics,
    recommendations: deterministicRecommendations,
    businessName: snapshot.business.name,
    section,
  });
  const recommendations = assistantMessage.recommendations.map((item) => ({
    ...item,
    emoji: item.emoji || getInsightEmoji(item.type, item.severity, assistantMessage.mood),
    href:
      item.href ||
      deterministicRecommendations.find((fallback) => fallback.type === item.type)?.href ||
      "/panel/overview",
  }));
  const legacySignals = buildSignals(rawMetrics);
  const signals = buildPulseSignals(rawMetrics, refreshedAt);
  const metrics = buildMetricItems(rawMetrics);
  const nextBestActions = buildNextBestActions(recommendations);
  const detections = buildSignalDetections(
    deterministicRecommendations,
    snapshot,
    rawMetrics,
    refreshedAt,
  );
  const persistedSignals = await upsertPulseSignals({
    admin: ctx.admin,
    businessId: ctx.businessId,
    detections,
  });
  const order = new Map(detections.map((item, index) => [item.signalKey, index]));
  persistedSignals.sort(
    (left, right) => (order.get(left.signal_key) ?? 99) - (order.get(right.signal_key) ?? 99),
  );
  const insights = buildStructuredInsights(persistedSignals);
  const topRecommendation = recommendations[0] || deterministicRecommendations[0];
  const topSignal = legacySignals[0];
  const summary = assistantMessage.summary;
  const executiveSummary = rawMetrics.hasEnoughActivity
    ? summary
    : "LumenAI puede operar, pero aún faltan señales suficientes para detectar patrones comerciales. La siguiente acción recomendada es probar el widget, publicar calibración y cargar conocimiento clave del negocio.";

  return {
    ok: true,
    overallStatus,
    systemMood: assistantMessage.mood,
    summary,
    executiveSummary,
    suggestedFocus: suggestedFocusFromStatus(overallStatus, rawMetrics),
    questions: questionsFromMetrics(rawMetrics),
    assistant: {
      name: "Pulse Radar",
      role: "Asistente vivo del panel",
      ai: getGroqStatus("panel"),
    },
    headline: rawMetrics.readiness >= 80 ? "LumenAI está listo para operar." : "LumenAI necesita ajustes clave.",
    brief: summary,
    greeting: assistantMessage.greeting,
    mood: assistantMessage.mood,
    refreshedAt,
    rawMetrics,
    metrics,
    insights,
    legacySignals,
    signals,
    recommendations,
    assistantMessage,
    actions: recommendations.map((item) => ({
      title: item.title,
      detail: item.message,
      href: item.href || "/panel/overview",
    })),
    marketNotes: rawMetrics.hasEnoughActivity
      ? [
          `Pulse trabaja con ${rawMetrics.chatsTotal} chat(s) y ${rawMetrics.leadsTotal} lead(s) reales del sistema.`,
          topRecommendation?.message || "Revisa señales recientes antes de ajustar campañas.",
        ]
      : [
          "Sin datos suficientes todavía: conecta el widget para empezar a recibir señales.",
          "Carga conocimiento para que LumenAI responda con más precisión.",
        ],
    summary24h: {
      isPreview: false,
      hasInsufficientData: !rawMetrics.hasEnoughActivity,
      greeting: assistantMessage.greeting,
      systemScore: rawMetrics.readiness,
      leadsNew: rawMetrics.leads24h,
      chatsNew: rawMetrics.chats24h,
      widgetStatus: rawMetrics.widgetEnabled ? "Activo" : rawMetrics.widgetConfigured ? "Pendiente" : "Sin configurar",
      knowledgeStatus: rawMetrics.knowledgePublished ? "Lista" : "Pendiente",
      primaryAlert: topSignal.value,
      primaryRecommendation: topRecommendation?.message || "Completa la configuración base.",
    },
    report: reportFromMetrics(rawMetrics, recommendations),
    nextBestActions,
    readinessStatus: rawMetrics.readiness >= 80 ? "Sistema listo" : "Requiere ajuste",
    statusTone: toneFromSeverity(
      rawMetrics.readiness >= 80 ? "success" : rawMetrics.readiness >= 50 ? "warning" : "critical",
    ),
  };
}

export async function pulseRadarResponse(section?: string, request?: Request) {
  try {
    return NextResponse.json(await buildPulseRadarPayload(section, request));
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: safeErrorMessage(error, "No se pudo leer Pulse Radar"),
      },
      { status: safeErrorStatus(error, 500) },
    );
  }
}
