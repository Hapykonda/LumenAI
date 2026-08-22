import { getOptionalEnv } from "@/lib/env";

export type LumeniteAgentKey =
  | "widget"
  | "autoconfig"
  | "panel"
  | "radar"
  | "growth"
  | "twin"
  | "campaigns";

type AgentEnvConfig = {
  keyEnv: string;
  modelEnv: string;
  fallbackModel: string;
  fallbackAgents?: LumeniteAgentKey[];
};

export const LUMENITE_PRIMARY_MODEL = "openai/gpt-oss-120b";
export const LUMENITE_BACKUP_MODEL = "qwen/qwen3.6-27b";

const DEPRECATED_MODEL_ALIASES = new Set([
  "llama-3.3-70b-versatile",
  "meta-llama/llama-3.3-70b-versatile",
]);

const FALLBACK_MODEL = LUMENITE_PRIMARY_MODEL;

export const LUMENITE_AGENT_ENV: Record<LumeniteAgentKey, AgentEnvConfig> = {
  widget: {
    keyEnv: "GROQ_WIDGET_API_KEY",
    modelEnv: "GROQ_WIDGET_MODEL",
    fallbackModel: FALLBACK_MODEL,
    fallbackAgents: ["panel"],
  },
  autoconfig: {
    keyEnv: "GROQ_AUTOCONFIG_API_KEY",
    modelEnv: "GROQ_AUTOCONFIG_MODEL",
    fallbackModel: FALLBACK_MODEL,
    fallbackAgents: ["panel"],
  },
  panel: {
    keyEnv: "GROQ_PANEL_API_KEY",
    modelEnv: "GROQ_PANEL_MODEL",
    fallbackModel: FALLBACK_MODEL,
  },
  radar: {
    keyEnv: "GROQ_RADAR_API_KEY",
    modelEnv: "GROQ_RADAR_MODEL",
    fallbackModel: FALLBACK_MODEL,
    fallbackAgents: ["panel"],
  },
  growth: {
    keyEnv: "GROQ_GROWTH_API_KEY",
    modelEnv: "GROQ_GROWTH_MODEL",
    fallbackModel: FALLBACK_MODEL,
    fallbackAgents: ["panel"],
  },
  twin: {
    keyEnv: "GROQ_TWIN_API_KEY",
    modelEnv: "GROQ_TWIN_MODEL",
    fallbackModel: FALLBACK_MODEL,
    fallbackAgents: ["panel"],
  },
  campaigns: {
    keyEnv: "GROQ_CAMPAIGNS_API_KEY",
    modelEnv: "GROQ_CAMPAIGNS_MODEL",
    fallbackModel: FALLBACK_MODEL,
    fallbackAgents: ["panel"],
  },
};

function readEnv(name: string) {
  return getOptionalEnv(name);
}

export function normalizeLumeniteModel(model: string) {
  const value = String(model || "").trim();
  if (!value) return FALLBACK_MODEL;

  return DEPRECATED_MODEL_ALIASES.has(value.toLowerCase())
    ? LUMENITE_PRIMARY_MODEL
    : value;
}

export function resolveLumeniteEnv(agent: LumeniteAgentKey) {
  const config = LUMENITE_AGENT_ENV[agent];
  const dedicatedKey = readEnv(config.keyEnv);
  const fallbackFromAgent = (config.fallbackAgents ?? [])
    .map((fallbackAgent) => LUMENITE_AGENT_ENV[fallbackAgent].keyEnv)
    .find((envName) => Boolean(readEnv(envName)));
  const fallbackKey =
    fallbackFromAgent ? readEnv(fallbackFromAgent) : readEnv("GROQ_API_KEY");
  const apiKey = dedicatedKey || fallbackKey || readEnv("GROQ_API_KEY");
  const fallbackEnv = fallbackFromAgent || (readEnv("GROQ_API_KEY") ? "GROQ_API_KEY" : null);

  return {
    agent,
    keyEnv: config.keyEnv,
    modelEnv: config.modelEnv,
    configured: Boolean(apiKey),
    dedicatedKey: Boolean(dedicatedKey),
    usingFallbackKey: !dedicatedKey && Boolean(apiKey),
    fallbackEnv,
    apiKey,
    model: normalizeLumeniteModel(
      readEnv(config.modelEnv) ||
        (fallbackEnv === "GROQ_PANEL_API_KEY" ? readEnv("GROQ_PANEL_MODEL") : "") ||
        readEnv("GROQ_MODEL") ||
        config.fallbackModel
    ),
  };
}

export function getLumenitePublicStatus(agent: LumeniteAgentKey) {
  const resolved = resolveLumeniteEnv(agent);

  return {
    provider: "lumenite",
    configured: resolved.configured,
    dedicatedKey: resolved.dedicatedKey,
    usingFallbackKey: resolved.usingFallbackKey,
    env: resolved.keyEnv,
    model: resolved.model,
  };
}

export function requireLumeniteEnv(agent: LumeniteAgentKey) {
  const resolved = resolveLumeniteEnv(agent);

  if (!resolved.apiKey) {
    throw new Error(`Missing ${resolved.keyEnv}`);
  }

  return resolved;
}
