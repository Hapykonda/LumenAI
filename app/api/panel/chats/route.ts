import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearer(req: Request) {
  const raw = req.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

async function getUser(req: Request, admin: ReturnType<typeof supabaseAdmin>) {
  const token = getBearer(req);

  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);

  if (error || !data?.user) return null;

  return data.user;
}

function pickBusinessIdFromProfile(profile: any) {
  if (!profile || typeof profile !== "object") return null;

  const keys = [
    "active_business_id",
    "business_id",
    "current_business_id",
    "selected_business_id",
    "default_business_id",
  ];

  for (const key of keys) {
    const value = clean(profile[key]);
    if (value) return value;
  }

  return null;
}

async function readProfile(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const attempts = [
    { table: "profiles", column: "id" },
    { table: "profiles", column: "user_id" },
    { table: "profiles", column: "owner_id" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await admin
      .from(attempt.table)
      .select("*")
      .eq(attempt.column, userId)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function readOwnedBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const attempts = ["owner_id", "user_id", "created_by", "profile_id"];

  for (const column of attempts) {
    const { data, error } = await admin
      .from("businesses")
      .select("id")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  return null;
}

async function resolveBusinessId(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const profile = await readProfile(admin, userId);
  const profileBusinessId = pickBusinessIdFromProfile(profile);

  if (profileBusinessId) {
    const { data, error } = await admin
      .from("businesses")
      .select("id")
      .eq("id", profileBusinessId)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  const ownedBusinessId = await readOwnedBusiness(admin, userId);

  if (ownedBusinessId) return ownedBusinessId;

  return null;
}

function titleFromChat(chat: any, lead: any, lastMessage: any) {
  const leadLabel =
    clean(lead?.name) ||
    clean(lead?.phone) ||
    clean(lead?.email);

  if (leadLabel) return leadLabel;

  if (clean(chat?.title)) return clean(chat.title);

  if (chat?.channel === "widget") return "Cliente del widget";

  if (clean(lastMessage?.content)) {
    return clean(lastMessage.content).slice(0, 42);
  }

  return "Chat";
}

function previewFromMessage(message: any) {
  const content = clean(message?.content);

  if (!content) return "Sin mensajes todavía.";

  return content.length > 140 ? `${content.slice(0, 140)}…` : content;
}

export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const businessId = await resolveBusinessId(admin, user.id);

    if (!businessId) {
      return NextResponse.json({ ok: false, error: "missing_business" }, { status: 403 });
    }

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

    let messagesByChat = new Map<string, any>();
    let leadsByChat = new Map<string, any[]>();

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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "error_list_chats" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const businessId = await resolveBusinessId(admin, user.id);

    if (!businessId) {
      return NextResponse.json({ ok: false, error: "missing_business" }, { status: 403 });
    }

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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "error_create_chat" },
      { status: 500 }
    );
  }
}