import {
  getLumenitePublicStatus,
  LUMENITE_BACKUP_MODEL,
  resolveLumenAiEnv,
  type LumenAiPillarKey,
} from "@/lib/ai/lumenite/env";

type GroqPurpose = LumenAiPillarKey;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getGroqApiKey(purpose: GroqPurpose) {
  return resolveLumenAiEnv(purpose).apiKey;
}

export function getGroqStatus(purpose: GroqPurpose) {
  return getLumenitePublicStatus(purpose);
}

export function getGroqModel(purpose: GroqPurpose) {
  return resolveLumenAiEnv(purpose).model;
}

function cleanAiContent(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";

  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*<think>[\s\S]*$/i, "")
    .trim();
}

export async function callGroqChat(input: {
  purpose: GroqPurpose;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object";
}) {
  const resolved = resolveLumenAiEnv(input.purpose);
  const apiKey = resolved.apiKey;

  if (!apiKey) return null;

  const payload = (model: string) => ({
    model,
    messages: input.messages,
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens ?? 900,
    response_format: input.responseFormat
      ? { type: input.responseFormat }
      : undefined,
  });

  async function request(model: string) {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload(model)),
    }).catch(() => null);
  }

  async function readContent(res: Response | null) {
    if (!res?.ok) return "";

    const data = await res.json().catch(() => null);
    return cleanAiContent(data?.choices?.[0]?.message?.content);
  }

  let res = await request(resolved.model);
  let content = await readContent(res);

  if (!content && resolved.model !== LUMENITE_BACKUP_MODEL) {
    res = await request(LUMENITE_BACKUP_MODEL);
    content = await readContent(res);
  }

  return content || null;
}
