import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function admin() {
  const env = getSupabaseServerEnv();

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

async function resolveBusiness(sb: ReturnType<typeof admin>, key: string) {
  const cleanKey = clean(key);

  if (!cleanKey) return null;

  const { data: byPublicKey, error: publicKeyError } = await sb
    .from("businesses")
    .select("id,name,public_key")
    .eq("public_key", cleanKey)
    .limit(1)
    .maybeSingle();

  if (publicKeyError) throw new Error(publicKeyError.message);
  if (byPublicKey?.id) return byPublicKey;

  if (isUuid(cleanKey)) {
    const { data: byId, error: idError } = await sb
      .from("businesses")
      .select("id,name,public_key")
      .eq("id", cleanKey)
      .limit(1)
      .maybeSingle();

    if (idError) throw new Error(idError.message);
    if (byId?.id) return byId;
  }

  return null;
}

export async function GET(req: Request) {
  const headers = corsHeaders();

  try {
    const url = new URL(req.url);

    const key = clean(
      url.searchParams.get("key") ||
        url.searchParams.get("publicKey") ||
        url.searchParams.get("public_key")
    );

    const chatId = clean(
      url.searchParams.get("chatId") || url.searchParams.get("chat_id")
    );

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Falta key/publicKey." },
        { status: 400, headers }
      );
    }

    if (!chatId || !isUuid(chatId)) {
      return NextResponse.json(
        { ok: false, error: "Falta chatId válido." },
        { status: 400, headers }
      );
    }

    const sb = admin();
    const business = await resolveBusiness(sb, key);

    if (!business?.id) {
      return NextResponse.json(
        { ok: false, error: "Negocio no encontrado." },
        { status: 404, headers }
      );
    }

    const { data: chat, error: chatError } = await sb
      .from("chats")
      .select("id,business_id,updated_at")
      .eq("id", chatId)
      .maybeSingle();

    if (chatError) {
      return NextResponse.json(
        { ok: false, error: chatError.message },
        { status: 500, headers }
      );
    }

    if (!chat?.id) {
      return NextResponse.json(
        { ok: false, error: "Chat no encontrado." },
        { status: 404, headers }
      );
    }

    if (chat.business_id !== business.id) {
      return NextResponse.json(
        { ok: false, error: "Chat no pertenece a este negocio." },
        { status: 403, headers }
      );
    }

    const { data: messages, error: messagesError } = await sb
      .from("chat_messages")
      .select("id,chat_id,business_id,sender_type,content,created_at")
      .eq("chat_id", chatId)
      .eq("business_id", business.id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) {
      return NextResponse.json(
        { ok: false, error: messagesError.message },
        { status: 500, headers }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        businessId: business.id,
        chatId,
        updatedAt: chat.updated_at,
        messages: messages ?? [],
      },
      { headers }
    );
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("messages_error");
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error leyendo mensajes del widget.",
      },
      { status: 500, headers }
    );
  }
}
