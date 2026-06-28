import { NextResponse } from "next/server";
import { resolveLumeniteEnv } from "@/lib/ai/lumenite/env";
import { getOptionalEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const headers = corsHeaders();

  try {
    const widgetEnv = resolveLumeniteEnv("widget");
    const apiKey = widgetEnv.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "La transcripcion de audio no esta configurada." },
        { status: 500, headers }
      );
    }

    const form = await req.formData();
    const file = form.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "missing_audio" },
        { status: 400, headers }
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { ok: false, error: "audio_too_large" },
        { status: 400, headers }
      );
    }

    const upstream = new FormData();
    upstream.set("file", file, file.name || "audio.webm");
    upstream.set(
      "model",
      getOptionalEnv("GROQ_TRANSCRIPTION_MODEL") ||
        getOptionalEnv("GROQ_WIDGET_TRANSCRIPTION_MODEL") ||
        "whisper-large-v3-turbo"
    );
    upstream.set("language", String(form.get("language") || "es").slice(0, 12));
    upstream.set("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstream,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.error?.message || `No se pudo transcribir el audio (${res.status}).`,
        },
        { status: res.status, headers }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        text: String(data?.text ?? "").trim(),
      },
      { headers }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "transcription_error" },
      { status: 500, headers }
    );
  }
}
