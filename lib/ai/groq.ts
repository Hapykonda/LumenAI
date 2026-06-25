type GroqPurpose = "autoconfig" | "panel" | "widget";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const purposeEnv: Record<
  GroqPurpose,
  { key: string; model: string; fallbackModel: string }
> = {
  autoconfig: {
    key: "GROQ_AUTOCONFIG_API_KEY",
    model: "GROQ_AUTOCONFIG_MODEL",
    fallbackModel: "llama-3.3-70b-versatile",
  },
  panel: {
    key: "GROQ_PANEL_API_KEY",
    model: "GROQ_PANEL_MODEL",
    fallbackModel: "llama-3.3-70b-versatile",
  },
  widget: {
    key: "GROQ_WIDGET_API_KEY",
    model: "GROQ_WIDGET_MODEL",
    fallbackModel: "llama-3.3-70b-versatile",
  },
};

export function getGroqApiKey(purpose: GroqPurpose) {
  const envName = purposeEnv[purpose].key;
  return process.env[envName] || process.env.GROQ_API_KEY || "";
}

export function getGroqStatus(purpose: GroqPurpose) {
  const config = purposeEnv[purpose];
  const dedicatedKey = Boolean(process.env[config.key]);
  const fallbackKey = Boolean(process.env.GROQ_API_KEY);

  return {
    provider: "groq",
    configured: dedicatedKey || fallbackKey,
    dedicatedKey,
    usingFallbackKey: !dedicatedKey && fallbackKey,
    env: config.key,
    model: getGroqModel(purpose),
  };
}

export function getGroqModel(purpose: GroqPurpose) {
  const config = purposeEnv[purpose];
  return (
    process.env[config.model] ||
    process.env.GROQ_MODEL ||
    config.fallbackModel
  );
}

export async function callGroqChat(input: {
  purpose: GroqPurpose;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object";
}) {
  const apiKey = getGroqApiKey(input.purpose);

  if (!apiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getGroqModel(input.purpose),
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 900,
      response_format: input.responseFormat
        ? { type: input.responseFormat }
        : undefined,
    }),
  }).catch(() => null);

  if (!res?.ok) return null;

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;

  return typeof content === "string" && content.trim()
    ? content.trim()
    : null;
}
