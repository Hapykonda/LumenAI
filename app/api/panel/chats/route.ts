import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChatSummary = {
  title?: unknown;
  channel?: unknown;
};

type LeadSummary = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  status?: string | null;
  score?: number | null;
};

type MessageSummary = {
  content?: unknown;
  created_at?: string | null;
  sender_type?: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function titleFromChat(
  chat: ChatSummary,
  lead: LeadSummary | null,
  lastMessage: MessageSummary | null,
) {
  const leadLabel =
    clean(lead?.name) ||
    clean(lead?.phone) ||
    clean(lead?.email);

  if (leadLabel) return leadLabel;

  if (clean(chat?.title)) return clean(chat.title);

  if (chat?.channel === "widget") return "Cliente del widget";

  if (clean(lastMessage?.content)) {
    return clean(lastMessage?.content).slice(0, 42);
  }

  return "Chat";
}

function previewFromMessage(message: MessageSummary | null) {
  const content = clean(message?.content);

  if (!content) return "Sin mensajes todavía.";

  return content.length > 140 ? `${content.slice(0, 140)}…` : content;
}

export async function GET(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:read",
    });
    const admin = context.admin;
    const businessId = context.businessId;

    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get("limit") || 80);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(120, Math.round(rawLimit)))
      : 80;

    const { data: chats, error: chatsError } = await admin
      .from("chats")
      .select(
        "id,business_id,title,updated_at,created_at,channel,visitor_id,unread_owner,human_takeover,human_takeover_at,ai_paused_reason"
      )
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (chatsError) {
      return NextResponse.json(
        { ok: false, error: "chats_error", detail: chatsError.message },
        { status: 500 }
      );
    }

    const safeChats = Array.isArray(chats) ? chats : [];
    const chatIds = safeChats.map((chat) => chat.id).filter(Boolean);

    const messagesByChat = new Map<string, MessageSummary>();
    const leadsByChat = new Map<string, LeadSummary[]>();

    if (chatIds.length > 0) {
      const { data: messages } = await admin
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

      const { data: leads } = await admin
        .from("leads")
        .select("id,chat_id,name,email,phone,status,score,source,intent,created_at,updated_at")
        .eq("business_id", businessId)
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false });

      if (Array.isArray(leads)) {
        for (const lead of leads) {
          const list = leadsByChat.get(lead.chat_id) || [];
          list.push(lead);
          leadsByChat.set(lead.chat_id, list);
        }
      }
    }

    const enriched = safeChats.map((chat) => {
      const lastMessage = messagesByChat.get(chat.id) || null;
      const leads = leadsByChat.get(chat.id) || [];
      const mainLead = leads[0] || null;

      return {
        ...chat,
        title: titleFromChat(chat, mainLead, lastMessage),
        last_message: previewFromMessage(lastMessage),
        last_message_at: lastMessage?.created_at ?? null,
        last_sender_type: lastMessage?.sender_type ?? null,
        lead_count: leads.length,
        lead: mainLead,
        lead_status: mainLead?.status ?? null,
        lead_score: mainLead?.score ?? null,
        lead_name: mainLead?.name ?? null,
        lead_phone: mainLead?.phone ?? null,
        lead_email: mainLead?.email ?? null,
      };
    });

    const stats = {
      total: enriched.length,
      unread: enriched.filter((chat) => Boolean(chat.unread_owner)).length,
      human_takeover: enriched.filter((chat) => Boolean(chat.human_takeover)).length,
      widget: enriched.filter((chat) => chat.channel === "widget").length,
      panel: enriched.filter((chat) => chat.channel === "panel").length,
      with_leads: enriched.filter((chat) => Number(chat.lead_count || 0) > 0).length,
    };

    return NextResponse.json({
      ok: true,
      businessId,
      chats: enriched,
      stats,
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("chats_get_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "error_list_chats" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const businessId = context.businessId;

    const body = await req.json().catch(() => ({}));
    const title = clean(body?.title) || "Nuevo chat";

    const { data: created, error } = await admin
      .from("chats")
      .insert({
        business_id: businessId,
        title: title.slice(0, 80),
        channel: "panel",
        unread_owner: false,
        human_takeover: true,
        human_takeover_at: new Date().toISOString(),
        ai_paused_reason: "panel_created_chat",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "create_chat_error", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: created?.id,
      chat: created,
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("chats_post_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "error_create_chat" },
      { status: 500 }
    );
  }
}
