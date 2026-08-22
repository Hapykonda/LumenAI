import type { PulseInsightKind, PulseWidgetState } from "@/lib/pulse-radar/types";

export type PulseExpressionTone =
  | "neutral"
  | "positive"
  | "analytical"
  | "warning"
  | "critical";

export type PulseExpression = {
  id: string;
  label: string;
  emoji: string[];
  tone: PulseExpressionTone;
  coreAnimation: "none" | "breathe" | "scan" | "write" | "notify" | "confirm";
  accentMode: "cyan" | "blue" | "violet" | "green" | "amber" | "red" | "muted";
  decorationMode: "none" | "discovery" | "opportunity" | "success";
  reducedMotionFallback: "steady" | "bright" | "dim";
};

const emoji = {
  wave: "\u{1F44B}",
  sparkle: "\u2728",
  star: "\u{1F31F}",
  search: "\u{1F50E}",
  brain: "\u{1F9E0}",
  chart: "\u{1F4CA}",
  satellite: "\u{1F6F0}\uFE0F",
  idea: "\u{1F4A1}",
  target: "\u{1F3AF}",
  trend: "\u{1F4C8}",
  fire: "\u{1F525}",
  rocket: "\u{1F680}",
  eyes: "\u{1F440}",
  pin: "\u{1F4CC}",
  bell: "\u{1F514}",
  check: "\u2705",
  celebration: "\u{1F389}",
  heartBlue: "\u{1F499}",
  heartGreen: "\u{1F49A}",
  shield: "\u{1F6E1}\uFE0F",
  warning: "\u26A0\uFE0F",
  wrench: "\u{1F527}",
  chat: "\u{1F4AC}",
  handshake: "\u{1F91D}",
  user: "\u{1F464}",
  inbox: "\u{1F4E9}",
  books: "\u{1F4DA}",
  note: "\u{1F4DD}",
  sleep: "\u{1F4A4}",
  hourglass: "\u23F3",
  moon: "\u{1F319}",
  error: "\u274C",
  tools: "\u{1F6E0}\uFE0F",
} as const;

export const PULSE_EXPRESSION_CATALOG = {
  neutral: expression("neutral", "Observando", [], "neutral", "none", "cyan", "none", "steady"),
  greeting: expression("greeting", "Saludando", [emoji.wave, emoji.sparkle], "positive", "notify", "cyan", "discovery", "bright"),
  curious: expression("curious", "Curioso", [emoji.eyes], "analytical", "breathe", "blue", "discovery", "steady"),
  analyzing: expression("analyzing", "Analizando", [emoji.search, emoji.chart], "analytical", "scan", "cyan", "none", "bright"),
  thinking: expression("thinking", "Pensando", [emoji.brain], "analytical", "breathe", "blue", "none", "steady"),
  writing: expression("writing", "Escribiendo", [], "analytical", "write", "cyan", "none", "steady"),
  discovery: expression("discovery", "Descubrimiento", [emoji.eyes, emoji.sparkle], "analytical", "notify", "cyan", "discovery", "bright"),
  opportunity: expression("opportunity", "Oportunidad", [emoji.idea, emoji.trend], "positive", "notify", "green", "opportunity", "bright"),
  good_news: expression("good_news", "Buena noticia", [emoji.check, emoji.heartBlue], "positive", "confirm", "green", "success", "bright"),
  celebration: expression("celebration", "Celebracion", [emoji.celebration, emoji.star], "positive", "confirm", "violet", "success", "bright"),
  recommendation: expression("recommendation", "Recomendacion", [emoji.target, emoji.idea], "analytical", "notify", "cyan", "opportunity", "bright"),
  important: expression("important", "Importante", [emoji.pin], "analytical", "notify", "blue", "discovery", "bright"),
  warning: expression("warning", "Advertencia", [emoji.warning], "warning", "notify", "amber", "none", "bright"),
  urgent: expression("urgent", "Urgente", [], "warning", "notify", "amber", "none", "bright"),
  critical: expression("critical", "Critico", [], "critical", "notify", "red", "none", "bright"),
  reassuring: expression("reassuring", "Tranquilizador", [emoji.shield], "positive", "breathe", "cyan", "none", "steady"),
  empathetic: expression("empathetic", "Empatico", [emoji.handshake], "neutral", "breathe", "blue", "none", "steady"),
  no_data: expression("no_data", "Sin datos", [emoji.hourglass], "neutral", "none", "muted", "none", "dim"),
  waiting: expression("waiting", "Esperando", [], "neutral", "breathe", "muted", "none", "dim"),
  offline: expression("offline", "Offline", [], "neutral", "none", "muted", "none", "dim"),
  error: expression("error", "Error", [emoji.tools], "critical", "none", "red", "none", "dim"),
  recovering: expression("recovering", "Recuperando", [emoji.wrench], "analytical", "scan", "amber", "none", "steady"),
  action_complete: expression("action_complete", "Accion completada", [emoji.check], "positive", "confirm", "green", "success", "bright"),
} satisfies Record<string, PulseExpression>;

function expression(
  id: string,
  label: string,
  values: string[],
  tone: PulseExpressionTone,
  coreAnimation: PulseExpression["coreAnimation"],
  accentMode: PulseExpression["accentMode"],
  decorationMode: PulseExpression["decorationMode"],
  reducedMotionFallback: PulseExpression["reducedMotionFallback"],
): PulseExpression {
  return {
    id,
    label,
    emoji: values.slice(0, 3),
    tone,
    coreAnimation,
    accentMode,
    decorationMode,
    reducedMotionFallback,
  };
}

export function getPulseExpression(id?: string | null) {
  if (id && id in PULSE_EXPRESSION_CATALOG) {
    return PULSE_EXPRESSION_CATALOG[id as keyof typeof PULSE_EXPRESSION_CATALOG];
  }

  return PULSE_EXPRESSION_CATALOG.neutral;
}

export function expressionForInsight(
  kind: PulseInsightKind,
  severity: "low" | "medium" | "high" | "critical",
) {
  if (severity === "critical" || kind === "critical") return PULSE_EXPRESSION_CATALOG.critical;
  if (kind === "warning" || severity === "high") return PULSE_EXPRESSION_CATALOG.warning;
  if (kind === "opportunity") return PULSE_EXPRESSION_CATALOG.opportunity;
  if (kind === "success" || kind === "health") return PULSE_EXPRESSION_CATALOG.good_news;
  if (kind === "recommendation") return PULSE_EXPRESSION_CATALOG.recommendation;
  return PULSE_EXPRESSION_CATALOG.discovery;
}

export function expressionForWidgetState(state: PulseWidgetState) {
  const map: Partial<Record<PulseWidgetState, PulseExpression>> = {
    closed: PULSE_EXPRESSION_CATALOG.neutral,
    teaser: PULSE_EXPRESSION_CATALOG.discovery,
    unread: PULSE_EXPRESSION_CATALOG.important,
    opening: PULSE_EXPRESSION_CATALOG.greeting,
    idle: PULSE_EXPRESSION_CATALOG.neutral,
    listening: PULSE_EXPRESSION_CATALOG.empathetic,
    thinking: PULSE_EXPRESSION_CATALOG.thinking,
    streaming: PULSE_EXPRESSION_CATALOG.writing,
    insight: PULSE_EXPRESSION_CATALOG.discovery,
    action_ready: PULSE_EXPRESSION_CATALOG.recommendation,
    success: PULSE_EXPRESSION_CATALOG.action_complete,
    warning: PULSE_EXPRESSION_CATALOG.warning,
    critical: PULSE_EXPRESSION_CATALOG.critical,
    error: PULSE_EXPRESSION_CATALOG.error,
    offline: PULSE_EXPRESSION_CATALOG.offline,
    closing: PULSE_EXPRESSION_CATALOG.neutral,
  };

  return map[state] ?? PULSE_EXPRESSION_CATALOG.neutral;
}
