import type { LumeniteAgentName } from "./agents";
import type { LumeniteActionSource, LumeniteRiskLevel } from "./core";
import type { LumenitePlan, LumenitePlannedAction } from "./contracts";

export type LegacyLumeniteActionStatus = "pending" | "success" | "error";

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

export function normalizeRisk(value: unknown): LumeniteRiskLevel {
  const risk = cleanText(value, 20).toLowerCase();
  if (risk === "high" || risk === "medium" || risk === "low") return risk;
  return "medium";
}

export function validateLumenitePlan(
  raw: unknown,
  fallbackAgent: LumeniteAgentName | string,
  source: LumeniteActionSource,
): LumenitePlan {
  const input = isObject(raw) ? raw : {};
  const rawActions = Array.isArray(input.actions) ? input.actions : [];
  const actions = rawActions
    .map((action): LumenitePlannedAction | null => {
      if (!isObject(action)) return null;
      const capability = cleanText(action.capability || action.action_name, 120);
      if (!capability) return null;

      return {
        capability,
        input: isObject(action.input)
          ? action.input
          : isObject(action.payload)
            ? action.payload
            : {},
        reason: cleanText(action.reason, 400),
        expectedResult: cleanText(action.expectedResult || action.expected_result, 400),
      };
    })
    .filter(Boolean) as LumenitePlannedAction[];

  return {
    agent: cleanText(input.agent, 80) || fallbackAgent,
    intent: cleanText(input.intent, 220) || "Solicitud operativa",
    objective: cleanText(input.objective, 300) || cleanText(input.intent, 220) || "Preparar una accion interna",
    summary: cleanText(input.summary, 700) || "Lumenite preparo un plan operativo para revisar.",
    source,
    riskLevel: normalizeRisk(input.riskLevel || input.risk_level),
    dataUsed: asStringArray(input.dataUsed || input.data_used, 12, 120),
    integrations: asStringArray(input.integrations, 8, 80),
    expectedResult: cleanText(input.expectedResult || input.expected_result, 500),
    steps: [],
    actions,
    missingData: asStringArray(input.missingData || input.missing_data, 8, 160),
    warnings: asStringArray(input.warnings, 8, 180),
  };
}
