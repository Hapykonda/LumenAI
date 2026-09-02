/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { callGroqChat } from "@/lib/ai/groq";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PendingCookie = { name: string; value: string; options?: any };

function withCookies(res: NextResponse, pending: PendingCookie[]) {
  for (const c of pending) {
    res.cookies.set({ name: c.name, value: c.value, ...(c.options ?? {}) });
  }
  return res;
}

// ---------------- Helpers ----------------
function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function wantsPrice(userMsg: string) {
  const m = norm(userMsg);
  return m.includes("precio") || m.includes("valor") || m.includes("cuanto") || m.includes("cuesta");
}

function looksLikePrice(s: string) {
  const t = norm(s);
  return /(\$|clp)?\s*\d{1,3}([.,]\d{3})+|\b\d{4,}\b/.test(t);
}

// Match tolerante: “precio zapatillas” == “zapatillas precio”
function titleMatchesMessage(title: string, userMsg: string) {
  const t = norm(title);
  const m = norm(userMsg);
  if (!t) return false;

  if (m.includes(t)) return true;

  // tokens del título (>=3 letras) deben estar en el mensaje (en cualquier orden)
  const tokens = t.split(/\s+/).filter(w => w.length >= 3);
  if (tokens.length === 0) return false;
  return tokens.every(tok => m.includes(tok) || (tok.endsWith("s") && m.includes(tok.slice(0, -1))));
}

async function fetchBusinessKB(admin: any, businessId: string) {
  // IMPORTANTÍSIMO:
  // - Trae publicados o null (para no quedar “vacío” por defaults raros)
  const res = await admin
    .from("business_kb")
    .select("id,type,title,content,is_published,created_at")
    .eq("business_id", businessId)
    .or("is_published.eq.true,is_published.is.null")
    .order("created_at", { ascending: false })
    .limit(200);

  return { items: (res.data ?? []) as any[], error: res.error?.message ?? null };
}

function extractPrice(row: any) {
  const content = typeof row?.content === "string" ? row.content : String(row?.content ?? "");
  return looksLikePrice(content) ? content.trim() : "";
}

function priceFromKB(items: any[], userMsg: string) {
  if (!wantsPrice(userMsg)) return null;

  for (const row of items ?? []) {
    const title = row?.title ? String(row.title) : "";
    const price = extractPrice(row);
    if (!title || !price) continue;

    // si tienes tipos, esto ayuda:
    // si row.type === "price" prioriza
    if (titleMatchesMessage(title, userMsg)) {
      return `El precio de **${title}** es **${price}**.`;
    }
  }
  return null;
}

function buildKbText(items: any[]) {
  return (items ?? [])
    .map((row) => {
      const t = row?.title ? String(row.title) : "";
      const c = row?.content ? String(row.content) : "";
      const ty = row?.type ? String(row.type) : "";
      return [ty, t, c].filter(Boolean).join(" — ");
    })
    .filter(Boolean)
    .join("\n");
}

function fallbackAssistantFromKb(items: any[], message: string) {
  const kbText = buildKbText(items);
  const msg = norm(message);

  if (!kbText.trim()) {
    return "Todavia no hay Knowledge publicado para responder con precision. Puedo registrar la consulta y conviene completar servicios, precios, politicas o datos de pago en Knowledge.";
  }

  const blocks = kbText
    .split(/\n\s*\n|---/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const tokens = msg.split(/\s+/).filter((word) => word.length >= 4);
  const best =
    blocks.find((block) => tokens.some((word) => norm(block).includes(word))) ||
    blocks[0];

  return `Con la informacion publicada en Knowledge, esto es lo mas relevante:\n\n${best.slice(
    0,
    900
  )}\n\nSi quieres, deja un dato de contacto o revisa Knowledge para completar informacion faltante.`;
}

// ---------------- Route ----------------
export async function POST(req: NextRequest) {
  const pending: PendingCookie[] = [];

  try {
    const body = await req.json().catch(() => ({} as any));

    const chatId = String(body?.chatId ?? body?.chat_id ?? "").trim();
    const message = String(body?.message ?? body?.content ?? "").trim();
    const businessIdFromBody = body?.businessId ? String(body.businessId).trim() : "";

    if (!chatId || !message) {
      return withCookies(
        NextResponse.json(
          { error: "Missing chatId/message", debug: { gotKeys: Object.keys(body || {}) } },
          { status: 400 }
        ),
        pending
      );
    }

    const context = await getAuthorizedBusinessContext({
      request: req,
      requestedBusinessId: businessIdFromBody,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const businessId = context.businessId;

    // 1) Buscar chat existente
    const chatExisting = await admin
      .from("chats")
      .select("id,business_id")
      .eq("id", chatId)
      .maybeSingle();

    const chatBusinessId = chatExisting?.data?.business_id ? String(chatExisting.data.business_id) : "";

    if (chatBusinessId) {
      if (chatBusinessId !== businessId) {
        return withCookies(
          NextResponse.json(
            {
              error: "Business mismatch",
              code: "BUSINESS_MISMATCH",
              detail: "El chat pertenece a otro negocio.",
            },
            { status: 409 }
          ),
          pending
        );
      }
    }

    // 3) Asegurar chat con business correcto
    await admin.from("chats").upsert(
      { id: chatId, business_id: businessId, updated_at: new Date().toISOString(), title: "Nuevo chat" },
      { onConflict: "id" }
    );

    // 4) Guardar mensaje user
    await admin.from("chat_messages").insert({
      chat_id: chatId,
      business_id: businessId,
      sender_type: "user",
      content: message,
    });

    // 5) Leer KB
    const { items, error: kbError } = await fetchBusinessKB(admin, businessId);
    if (kbError) {
      return withCookies(
        NextResponse.json({ error: "KB query failed", detail: kbError, businessId }, { status: 500 }),
        pending
      );
    }

    // 6) Precio determinístico
    const direct = priceFromKB(items, message);
    if (direct) {
      await admin.from("chat_messages").insert({
        chat_id: chatId,
        business_id: businessId,
        sender_type: "assistant",
        content: direct,
      });

      return withCookies(
        NextResponse.json({ ok: true, reply: direct, businessId, kbCount: items.length }),
        pending
      );
    }

    // 7) Historial real del chat (para “memoria” del chat)
    const histRes = await admin
      .from("chat_messages")
      .select("sender_type,role,content,created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(14);

    const history = (histRes.data ?? [])
      .slice()
      .reverse()
      .map((m: any) => {
        const r = (m?.sender_type ?? m?.role ?? "assistant") as string;
        const content = String(m?.content ?? "").trim();
        if (!content) return null;
        return { role: r === "user" ? "user" : "assistant", content };
      })
      .filter(Boolean) as { role: "user" | "assistant"; content: string }[];

    const kbText = buildKbText(items);
    const sys = `
Eres el asistente del negocio.
Usa la BASE DE CONOCIMIENTO como fuente principal.
Si el usuario pregunta por precios y existen en la base, responde con el precio exacto.
BASE DE CONOCIMIENTO:
${kbText || "(vacía)"}
`.trim();

    let assistant = "";

    assistant =
      (await callGroqChat({
        purpose: "chats",
        messages: [{ role: "system", content: sys }, ...history],
        temperature: 0.2,
      })) || "";

    if (!assistant) {
      assistant = fallbackAssistantFromKb(items, message);
    }

    await admin.from("chat_messages").insert({
      chat_id: chatId,
      business_id: businessId,
      sender_type: "assistant",
      content: assistant,
    });

    return withCookies(
      NextResponse.json({ ok: true, reply: assistant, businessId, kbCount: items.length }),
      pending
    );
  } catch (e: any) {
    if (e instanceof BusinessAuthorizationError) {
      return withCookies(businessAuthorizationErrorResponse(e), pending);
    }
    return withCookies(
      NextResponse.json({ error: "Server error", detail: e?.message ?? "unknown" }, { status: 500 }),
      pending
    );
  }
}
