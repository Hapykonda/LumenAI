import type {
  InsightMood,
  InsightSeverity,
  InsightType,
  PulseOverallStatus,
  PulseRecommendation,
} from "@/lib/pulse-insights";

export type PulseWidgetState =
  | "closed"
  | "teaser"
  | "unread"
  | "opening"
  | "idle"
  | "listening"
  | "thinking"
  | "streaming"
  | "insight"
  | "action_ready"
  | "success"
  | "warning"
  | "critical"
  | "error"
  | "offline"
  | "closing";

export type PulseWidgetSurface = "closed" | "teaser" | "panel";

export type PulseInsightKind =
  | "info"
  | "opportunity"
  | "success"
  | "warning"
  | "critical"
  | "health"
  | "recommendation";

export type PulseInsightSeverity = "low" | "medium" | "high" | "critical";

export type RadarEmphasis = {
  text: string;
  kind: "underline" | "highlight" | "metric" | "warning";
};

export type PulseRadarAction = {
  id: string;
  label: string;
  href: string;
  kind?: "primary" | "secondary";
};

export type PulseRadarInsight = {
  id: string;
  type: PulseInsightKind;
  severity: PulseInsightSeverity;
  expression: string;
  title: string;
  body: string;
  emojis?: string[];
  emphasis?: RadarEmphasis[];
  source?: {
    label: string;
    route?: string;
  };
  confidence?: number;
  actions?: PulseRadarAction[];
  createdAt: string;
  expiresAt?: string;
  read: boolean;
  status?: "new" | "viewed" | "action_prepared" | "awaiting_approval" | "executing" | "resolved" | "partially_resolved" | "failed" | "reverted" | "dismissed";
  evidence?: Record<string, unknown>;
  period?: { label: string; start: string | null; end: string };
  lastUpdatedAt?: string;
  actionPlanId?: string | null;
  actionRunId?: string | null;
  lastError?: string | null;
  snoozedUntil?: string | null;
  resolution?: Record<string, unknown>;
};

export type PulseHealthCheck = {
  key: string;
  label: string;
  status: "ready" | "warning" | "critical";
  detail: string;
};

export type PulseHealthData = {
  ok: boolean;
  health: "ready" | "warning" | "critical" | "unknown";
  checks: PulseHealthCheck[];
  summary: {
    total: number;
    ready: number;
    warnings: number;
    critical: number;
  };
  checkedAt: string;
  error?: string;
};

export type PulseMetricItem = {
  label: string;
  value: string | number;
  state: "good" | "neutral" | "warning";
  description: string;
};

export type PulseSignalItem = {
  id: string;
  title: string;
  message: string;
  type: InsightType;
  severity: InsightSeverity;
  emoji?: string;
  timestamp: string;
  actionHref?: string;
};

export type PulseRadarData = {
  ok: boolean;
  error?: string;
  overallStatus: PulseOverallStatus;
  systemMood: InsightMood;
  summary: string;
  executiveSummary: string;
  suggestedFocus: string;
  questions: string[];
  headline: string;
  brief: string;
  greeting: string;
  refreshedAt: string;
  insights: PulseRadarInsight[];
  signals: PulseSignalItem[];
  recommendations: PulseRecommendation[];
  metrics: PulseMetricItem[];
  nextBestActions: Array<{
    label: string;
    description: string;
    href: string;
    priority: "primary" | "secondary";
  }>;
  assistant: {
    name: string;
    role: string;
    ai?: {
      provider: string;
      configured: boolean;
      model: string;
      usingFallbackKey: boolean;
    };
  };
  summary24h?: {
    isPreview?: boolean;
    hasInsufficientData?: boolean;
    greeting: string;
    systemScore: number;
    leadsNew: number;
    chatsNew: number;
    widgetStatus: string;
    knowledgeStatus: string;
    primaryAlert: string;
    primaryRecommendation: string;
  };
};

export type PulseConversationMessage = {
  id: string;
  role: "assistant" | "user";
  title?: string;
  body: string;
  expression?: string;
  emojis?: string[];
  emphasis?: RadarEmphasis[];
  source?: PulseRadarInsight["source"];
  confidence?: number;
  actions?: PulseRadarAction[];
  createdAt: string;
  state?: "pending" | "complete" | "error";
  signalStatus?: PulseRadarInsight["status"];
  period?: PulseRadarInsight["period"];
  lastUpdatedAt?: string;
  lastError?: string | null;
};

export type PulseAssistantReply = {
  ok: boolean;
  insight?: PulseRadarInsight;
  refreshedAt?: string;
  error?: string;
};

export const PULSE_ALLOWED_ROUTE_PREFIXES = [
  "/panel/overview",
  "/panel/calibration",
  "/panel/autoconfig",
  "/panel/lumen-eye",
  "/panel/radar",
  "/panel/research",
  "/panel/widget",
  "/panel/chat",
  "/panel/knowledge",
  "/panel/interface",
  "/panel/access",
] as const;

export function isSafePulseRoute(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  try {
    const url = new URL(value, "https://lumenai.local");
    return url.origin === "https://lumenai.local" && PULSE_ALLOWED_ROUTE_PREFIXES.some(
      (route) => url.pathname === route || url.pathname.startsWith(`${route}/`),
    );
  } catch {
    return false;
  }
}

export function pulseSectionFromPath(pathname: string) {
  const entry = [
    ["/panel/calibration", "Calibration"],
    ["/panel/autoconfig", "Config AI"],
    ["/panel/lumen-eye", "Lumen Eye"],
    ["/panel/radar", "Pulse Radar"],
    ["/panel/research", "Research"],
    ["/panel/widget", "Widget"],
    ["/panel/chat", "Chats"],
    ["/panel/knowledge", "Knowledge"],
    ["/panel/interface", "Interface"],
    ["/panel/overview", "Overview"],
    ["/panel/access", "Access"],
  ].find(([route]) => pathname === route || pathname.startsWith(`${route}/`));

  return entry?.[1] ?? "Overview";
}
