import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
type LeadRow = Record<string, unknown> & {
  chat_id?: string | null;
  score?: number | string | null;
  status?: string | null;
};
type ChatRow = Record<string, unknown> & { id: string };
type MessageRow = Record<string, unknown> & {
  chat_id?: string | null;
  content?: unknown;
  created_at?: string | null;
  sender_type?: string | null;
};

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function clean(input: unknown) {
  return String(input ?? "").trim();
}

function cleanNullable(input: unknown) {
  const value = clean(input);
  return value || null;
}

function validStatus(input: unknown): LeadStatus {
  const value = clean(input) as LeadStatus;
  return VALID_STATUSES.includes(value) ? value : "new";
}

function clampScore(input: unknown) {
  const n = Number(input);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildStats(leads: LeadRow[]) {
  const total = leads.length;

  const avgScore =
    total > 0
      ? Math.round(
          leads.reduce((acc, lead) => acc + Number(lead.score || 0), 0) / total
        )
      : 0;

  return {
    total,
    new: leads.filter((lead) => lead.status === "new").length,
    contacted: leads.filter((lead) => lead.status === "contacted").length,
    qualified: leads.filter((lead) => lead.status === "qualified").length,
    won: leads.filter((lead) => lead.status === "won").length,
    lost: leads.filter((lead) => lead.status === "lost").length,
    avgScore,
    hot: leads.filter((lead) => Number(lead.score || 0) >= 70).length,
  };
}

function previewFromMessage(message: MessageRow | null) {
  const content = clean(message?.content);
  if (!content) return null;

  return content.replace(/\s+/g, " ").slice(0, 180);
}

async function enrichWithChats(
  sb: ReturnType<typeof supabaseAdmin>,
  businessId: string,
  leads: LeadRow[]
) {
  const chatIds = Array.from(new Set(leads
    .map((lead) => clean(lead.chat_id))
    .filter(Boolean)));

  if (chatIds.length === 0) return leads;

  const { data: chats } = await sb
    .from("chats")
    .select(
      "id,title,channel,visitor_id,unread_owner,human_takeover,human_takeover_at,updated_at,created_at"
    )
    .eq("business_id", businessId)
    .in("id", chatIds);

  const chatMap = new Map<string, ChatRow>();
  const messagesByChat = new Map<string, MessageRow>();
  const leadCountByChat = new Map<string, number>();

  if (Array.isArray(chats)) {
    for (const chat of chats) {
      chatMap.set(chat.id, chat);
    }
  }

  const { data: messages } = await sb
    .from("chat_messages")
    .select("id,chat_id,sender_type,content,created_at")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: false })
    .limit(Math.min(chatIds.length * 8, 500));

  if (Array.isArray(messages)) {
    for (const message of messages) {
      if (!messagesByChat.has(message.chat_id)) {
        messagesByChat.set(message.chat_id, message);
      }
    }
  }

  const { data: chatLeads } = await sb
    .from("leads")
    .select("id,chat_id")
    .eq("business_id", businessId)
    .in("chat_id", chatIds);

  if (Array.isArray(chatLeads)) {
    for (const lead of chatLeads) {
      const chatId = clean(lead.chat_id);
      if (!chatId) continue;
      leadCountByChat.set(chatId, (leadCountByChat.get(chatId) ?? 0) + 1);
    }
  }

  return leads.map((lead) => {
    const chat = lead.chat_id ? chatMap.get(lead.chat_id) ?? null : null;
    const lastMessage = lead.chat_id ? messagesByChat.get(lead.chat_id) ?? null : null;
    const leadCount = lead.chat_id ? leadCountByChat.get(lead.chat_id) ?? 1 : 1;

    return {
      ...lead,
      chat: chat
        ? {
            ...chat,
            last_message: previewFromMessage(lastMessage),
            last_message_at: lastMessage?.created_at ?? null,
            last_sender_type: lastMessage?.sender_type ?? null,
            lead_count: leadCount,
          }
        : null,
    };
  });
}

export async function GET(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:read",
    });
    const sb = context.admin;
    const businessId = context.businessId;

    const url = new URL(req.url);
    const status = clean(url.searchParams.get("status"));

    const onlyStatus = VALID_STATUSES.includes(status as LeadStatus)
      ? (status as LeadStatus)
      : null;

    let query = sb
      .from("leads")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(300);

    if (onlyStatus) {
      query = query.eq("status", onlyStatus);
    }

    const { data, error } = await query;

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    const rawLeads = Array.isArray(data) ? data : [];
    const leads = await enrichWithChats(sb, businessId, rawLeads);

    return json({
      ok: true,
      businessId,
      leads,
      stats: buildStats(leads),
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("leads_get_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return json(
      {
        ok: false,
        error: error?.message || "Error listando leads.",
      },
      500
    );
  }
}

export async function POST(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const sb = context.admin;
    const businessId = context.businessId;

    const body = await req.json().catch(() => ({}));

    const payload = {
      business_id: businessId,
      chat_id: cleanNullable(body?.chatId || body?.chat_id),
      name: cleanNullable(body?.name),
      email: cleanNullable(body?.email),
      phone: cleanNullable(body?.phone),
      source: clean(body?.source) || "panel",
      intent: cleanNullable(body?.intent),
      summary: cleanNullable(body?.summary),
      status: validStatus(body?.status),
      score: clampScore(body?.score ?? 50),
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : {
              createdBy: "panel",
            },
    };

    const { data, error } = await sb
      .from("leads")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    const leads = await enrichWithChats(sb, businessId, data ? [data] : []);

    return json({
      ok: true,
      lead: leads[0] ?? data,
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("leads_post_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return json(
      {
        ok: false,
        error: error?.message || "Error creando lead.",
      },
      500
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const sb = context.admin;
    const businessId = context.businessId;

    const body = await req.json().catch(() => ({}));
    const id = clean(body?.id || body?.leadId);

    if (!id) {
      return json({ ok: false, error: "Falta id del lead." }, 400);
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body?.status !== undefined) update.status = validStatus(body.status);
    if (body?.name !== undefined) update.name = cleanNullable(body.name);
    if (body?.email !== undefined) update.email = cleanNullable(body.email);
    if (body?.phone !== undefined) update.phone = cleanNullable(body.phone);
    if (body?.intent !== undefined) update.intent = cleanNullable(body.intent);
    if (body?.summary !== undefined) update.summary = cleanNullable(body.summary);
    if (body?.score !== undefined) update.score = clampScore(body.score);

    if (body?.metadata && typeof body.metadata === "object") {
      update.metadata = body.metadata;
    }

    const { data, error } = await sb
      .from("leads")
      .update(update)
      .eq("id", id)
      .eq("business_id", businessId)
      .select("*")
      .maybeSingle();

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    const leads = await enrichWithChats(sb, businessId, data ? [data] : []);

    return json({
      ok: true,
      lead: leads[0] ?? data,
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("leads_patch_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return json(
      {
        ok: false,
        error: error?.message || "Error actualizando lead.",
      },
      500
    );
  }
}
