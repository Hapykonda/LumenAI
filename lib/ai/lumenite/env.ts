import { getOptionalEnv } from "@/lib/env";

export type LumenAiPillarKey =
  | "calibration"
  | "config-ai"
  | "lumen-eye"
  | "pulse-radar"
  | "research"
  | "widget"
  | "chats"
  | "knowledge"
  | "interface"
  | "overview"
  | "access";

/** Kept as an internal compatibility name for the action engine. */
export type LumeniteAgentKey = LumenAiPillarKey;

type PillarEnvConfig = {
  keyEnv: string;
  modelEnv: string;
  fallbackModel: string;
};

export const LUMENITE_PRIMARY_MODEL = "openai/gpt-oss-120b";
export const LUMENITE_BACKUP_MODEL = "qwen/qwen3.6-27b";

const DEPRECATED_MODEL_ALIASES = new Set([
  "llama-3.3-70b-versatile",
  "meta-llama/llama-3.3-70b-versatile",
]);

export const LUMENAI_PILLAR_ENV: Record<LumenAiPillarKey, PillarEnvConfig> = {
  calibration: { keyEnv: "GROQ_CALIBRATION_API_KEY", modelEnv: "GROQ_CALIBRATION_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  "config-ai": { keyEnv: "GROQ_CONFIG_AI_API_KEY", modelEnv: "GROQ_CONFIG_AI_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  "lumen-eye": { keyEnv: "GROQ_LUMEN_EYE_API_KEY", modelEnv: "GROQ_LUMEN_EYE_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  "pulse-radar": { keyEnv: "GROQ_PULSE_API_KEY", modelEnv: "GROQ_PULSE_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  research: { keyEnv: "GROQ_RESEARCH_API_KEY", modelEnv: "GROQ_RESEARCH_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  widget: { keyEnv: "GROQ_WIDGET_API_KEY", modelEnv: "GROQ_WIDGET_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  chats: { keyEnv: "GROQ_CHATS_API_KEY", modelEnv: "GROQ_CHATS_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  knowledge: { keyEnv: "GROQ_KNOWLEDGE_API_KEY", modelEnv: "GROQ_KNOWLEDGE_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  interface: { keyEnv: "GROQ_INTERFACE_API_KEY", modelEnv: "GROQ_INTERFACE_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  overview: { keyEnv: "GROQ_OVERVIEW_API_KEY", modelEnv: "GROQ_OVERVIEW_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
  access: { keyEnv: "GROQ_ACCESS_API_KEY", modelEnv: "GROQ_ACCESS_MODEL", fallbackModel: LUMENITE_PRIMARY_MODEL },
};

export function normalizeLumeniteModel(model: string) {
  const value = String(model || "").trim();
  if (!value) return LUMENITE_PRIMARY_MODEL;
  return DEPRECATED_MODEL_ALIASES.has(value.toLowerCase())
    ? LUMENITE_PRIMARY_MODEL
    : value;
}

export function resolveLumenAiEnv(pillar: LumenAiPillarKey) {
  const config = LUMENAI_PILLAR_ENV[pillar];
  const dedicatedKey = getOptionalEnv(config.keyEnv);
  const genericKey = getOptionalEnv("GROQ_API_KEY");
  const apiKey = dedicatedKey || genericKey;

  return {
    pillar,
    agent: pillar,
    keyEnv: config.keyEnv,
    modelEnv: config.modelEnv,
    configured: Boolean(apiKey),
    dedicatedKey: Boolean(dedicatedKey),
    usingFallbackKey: !dedicatedKey && Boolean(genericKey),
    fallbackEnv: !dedicatedKey && genericKey ? "GROQ_API_KEY" : null,
    apiKey,
    model: normalizeLumeniteModel(
      getOptionalEnv(config.modelEnv) || getOptionalEnv("GROQ_MODEL") || config.fallbackModel,
    ),
  };
}

export const resolveLumeniteEnv = resolveLumenAiEnv;

export function getLumenitePublicStatus(pillar: LumenAiPillarKey) {
  const resolved = resolveLumenAiEnv(pillar);
  return {
    provider: "groq",
    configured: resolved.configured,
    dedicatedKey: resolved.dedicatedKey,
    usingFallbackKey: resolved.usingFallbackKey,
    env: resolved.keyEnv,
    model: resolved.model,
  };
}

export function requireLumeniteEnv(pillar: LumenAiPillarKey) {
  const resolved = resolveLumenAiEnv(pillar);
  if (!resolved.apiKey) throw new Error(`Missing ${resolved.keyEnv}`);
  return resolved;
}
