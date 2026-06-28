import {
  getLumenitePublicStatus,
  resolveLumeniteEnv,
  type LumeniteAgentKey,
} from "@/lib/ai/lumenite/env";

type GroqPurpose = LumeniteAgentKey;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getGroqApiKey(purpose: GroqPurpose) {
  return resolveLumeniteEnv(purpose).apiKey;
}

export function getGroqStatus(purpose: GroqPurpose) {
  return getLumenitePublicStatus(purpose);
}

export function getGroqModel(purpose: GroqPurpose) {
  return resolveLumeniteEnv(purpose).model;
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
