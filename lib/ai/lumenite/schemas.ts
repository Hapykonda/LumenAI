import type { LumeniteAgentName } from "./agents";

export type LumeniteRiskLevel = "low" | "medium" | "high";
export type LumeniteActionStatus = "pending" | "success" | "error";

export type LumenitePlannedAction = {
  action_name: string;
  payload: Record<string, unknown>;
  reason: string;
  rollback_available: boolean;
};

export type LumenitePlan = {
  agent: LumeniteAgentName | string;
  intent: string;
  summary: string;
  risk_level: LumeniteRiskLevel;
  requires_confirmation: boolean;
  actions: LumenitePlannedAction[];
  user_message: string;
  missing_data: string[];
  warnings: string[];
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cleanText(value: unknown, max = 1200) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

export function clampNumber(value: unknown, fallback = 0, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

export function asStringArray(value: unknown, maxItems = 12, maxLength = 180) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeRisk(value: unknown): LumeniteRiskLevel {
  const risk = cleanText(value, 20).toLowerCase();
  if (risk === "high" || risk === "medium" || risk === "low") return risk;
  return "medium";
}

export function validateLumenitePlan(raw: unknown, fallbackAgent: string): LumenitePlan {
  const input = isObject(raw) ? raw : {};
  const rawActions = Array.isArray(input.actions) ? input.actions : [];
  const actions = rawActions
    .map((action): LumenitePlannedAction | null => {
      if (!isObject(action)) return null;
      const actionName = cleanText(action.action_name, 120);
      if (!actionName) return null;

      return {
        action_name: actionName,
        payload: isObject(action.payload) ? action.payload : {},
        reason: cleanText(action.reason, 400),
        rollback_available: Boolean(action.rollback_available),
      };
    })
    .filter(Boolean) as LumenitePlannedAction[];

  return {
    agent: cleanText(input.agent, 80) || fallbackAgent,
    intent: cleanText(input.intent, 220) || "Solicitud operativa",
    summary: cleanText(input.summary, 700) || "Lumenite preparo un plan operativo.",
    risk_level: normalizeRisk(input.risk_level),
    requires_confirmation:
      typeof input.requires_confirmation === "boolean"
        ? input.requires_confirmation
        : true,
    actions,
    user_message:
      cleanText(input.user_message, 700) ||
      "Revise el plan antes de aplicar cambios al sistema.",
    missing_data: asStringArray(input.missing_data, 8, 160),
    warnings: asStringArray(input.warnings, 8, 180),
  };
}
