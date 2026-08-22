import { buildPulseRadarPayload } from "../pulse-radar/_lib";
import { callGroqChat } from "@/lib/ai/groq";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { cleanText, safeJson } from "@/lib/ai/lumenite/schemas";
import {
  getPulseExpression,
  PULSE_EXPRESSION_CATALOG,
} from "@/lib/pulse-radar/expression-catalog";
import {
  isSafePulseRoute,
  type PulseInsightKind,
  type PulseInsightSeverity,
  type PulseRadarAction,
  type PulseRadarInsight,
  type RadarEmphasis,
} from "@/lib/pulse-radar/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_INSIGHT_KINDS: PulseInsightKind[] = [
  "info",
  "opportunity",
  "success",
  "warning",
  "critical",
  "health",
  "recommendation",
];

const ALLOWED_SEVERITIES: PulseInsightSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

const ALLOWED_EMPHASIS: RadarEmphasis["kind"][] = [
  "underline",
  "highlight",
  "metric",
  "warning",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeActions(value: unknown, registered: Map<string, PulseRadarAction>) {
  if (!Array.isArray(value)) return [];

  return value
    .map((id) => registered.get(cleanText(id, 100)))
    .filter((action): action is PulseRadarAction => Boolean(action))
    .slice(0, 2);
}

function safeEmphasis(value: unknown, body: string): RadarEmphasis[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): RadarEmphasis | null => {
      if (!isRecord(item)) return null;
      const text = cleanText(item.text, 64);
      const kind = cleanText(item.kind, 20) as RadarEmphasis["kind"];
      if (!text || !body.includes(text) || !ALLOWED_EMPHASIS.includes(kind)) return null;
      return { text, kind };
    })
    .filter((item): item is RadarEmphasis => Boolean(item))
    .slice(0, 3);
}

function fallbackInsight(
  payload: Awaited<ReturnType<typeof buildPulseRadarPayload>>,
  section: string,
): PulseRadarInsight {
  const top = payload.insights[0];
  if (top) {
    return {
      ...top,
      id: `assistant-${top.id}-${Date.now()}`,
      title: `Lectura de ${section}`,
      body: `${payload.executiveSummary} ${payload.suggestedFocus}`.slice(0, 520),
      createdAt: new Date().toISOString(),
      read: true,
    };
  }

  return {
    id: `assistant-empty-${Date.now()}`,
    type: "info",
    severity: "low",
    expression: "no_data",
    title: `Observando ${section}`,
    body: "Todavía no hay señales suficientes. Completa la configuración base y vuelve a revisar.",
    emojis: [],
    emphasis: [],
    source: { label: section, route: "/panel/overview" },
    actions: [
      {
        id: "open-overview",
        label: "Abrir Overview",
        href: "/panel/overview",
        kind: "primary",
      },
    ],
    createdAt: new Date().toISOString(),
    read: true,
  };
}

async function buildConversationInsight(input: {
  message: string;
  section: string;
  request?: Request;
}) {
  const payload = await buildPulseRadarPayload(input.section, input.request);
  const fallback = fallbackInsight(payload, input.section);
  const registeredActions = new Map<string, PulseRadarAction>();

  for (const insight of payload.insights) {
    for (const action of insight.actions ?? []) {
      if (isSafePulseRoute(action.href)) registeredActions.set(action.id, action);
    }
  }

  const aiText = await callGroqChat({
    purpose: "panel",
    responseFormat: "json_object",
    temperature: 0.2,
    maxTokens: 650,
    messages: [
      {
        role: "system",
        content:
          "Eres Pulse Radar, operador ejecutivo contextual de LumenAI. Responde solo JSON con type, severity, expression, title, body, emphasis y actionIds. Usa exclusivamente el contexto suministrado. No inventes metricas, eventos, clientes, salud ni fuentes. No devuelvas HTML, Markdown, URLs ni emojis. Se breve, profesional y accionable. actionIds solo puede contener IDs registrados.",
      },
      {
        role: "user",
        content: JSON.stringify({
          question: input.message,
          currentSection: input.section,
          realContext: {
            overallStatus: payload.overallStatus,
            executiveSummary: payload.executiveSummary,
            suggestedFocus: payload.suggestedFocus,
            metrics: payload.metrics,
            signals: payload.insights.map((insight) => ({
              id: insight.id,
              type: insight.type,
              severity: insight.severity,
              title: insight.title,
              body: insight.body,
              source: insight.source,
            })),
          },
          allowedExpressions: Object.keys(PULSE_EXPRESSION_CATALOG),
          allowedTypes: ALLOWED_INSIGHT_KINDS,
          allowedSeverities: ALLOWED_SEVERITIES,
          registeredActions: Array.from(registeredActions.values()).map((action) => ({
            id: action.id,
            label: action.label,
          })),
        }),
      },
    ],
  });

  if (!aiText) return fallback;
  const parsed = safeJson<unknown>(aiText, null);
  if (!isRecord(parsed)) return fallback;

  const type = cleanText(parsed.type, 24) as PulseInsightKind;
  const severity = cleanText(parsed.severity, 16) as PulseInsightSeverity;
  const body = cleanText(parsed.body, 520);
  const expression = getPulseExpression(cleanText(parsed.expression, 40));

  if (
    !ALLOWED_INSIGHT_KINDS.includes(type) ||
    !ALLOWED_SEVERITIES.includes(severity) ||
    !body
  ) {
    return fallback;
  }

  return {
    id: `assistant-${Date.now()}`,
    type,
    severity,
    expression: expression.id,
    title: cleanText(parsed.title, 100) || fallback.title,
    body,
    emojis: expression.tone === "critical" ? [] : expression.emoji.slice(0, 2),
    emphasis: safeEmphasis(parsed.emphasis, body),
    source: {
      label: input.section,
      route: payload.insights[0]?.source?.route || "/panel/overview",
    },
    actions: safeActions(parsed.actionIds, registeredActions),
    createdAt: new Date().toISOString(),
    read: true,
  } satisfies PulseRadarInsight;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return assistantSummary(url.searchParams.get("section") || "Overview", request);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return Response.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
    }

    const section = cleanText(body.section, 80) || "Overview";
    const message = cleanText(body.message, 600);

    if (!message) return assistantSummary(section, request);

    const insight = await buildConversationInsight({ message, section, request });
    return Response.json({
      ok: true,
      insight,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: safeErrorMessage(error, "No se pudo completar la revisión."),
      },
      { status: safeErrorStatus(error, 500) },
    );
  }
}

async function assistantSummary(section: string, request?: Request) {
  try {
    const payload = await buildPulseRadarPayload(section, request);

    return Response.json({
      ok: true,
      overallStatus: payload.overallStatus,
      systemMood: payload.systemMood,
      greeting: payload.assistantMessage.greeting,
      mood: payload.assistantMessage.mood,
      summary: payload.assistantMessage.summary,
      executiveSummary: payload.executiveSummary,
      suggestedFocus: payload.suggestedFocus,
      questions: payload.questions,
      insights: payload.insights,
      signals: payload.signals,
      recommendations: payload.recommendations,
      metrics: payload.metrics,
      nextBestActions: payload.nextBestActions,
      refreshedAt: payload.refreshedAt,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: safeErrorMessage(error, "No se pudo generar el asistente Pulse."),
      },
      { status: safeErrorStatus(error, 500) },
    );
  }
}
