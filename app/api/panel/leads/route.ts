import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

function admin() {
  const env = getSupabaseServerEnv();

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function json(data: any, status = 200) {
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

function getBearer(req: Request) {
  const raw = req.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}

async function getUser(req: Request, sb: ReturnType<typeof admin>) {
  const token = getBearer(req);

  if (!token) return null;

  const { data, error } = await sb.auth.getUser(token);

  if (error || !data?.user) return null;

  return data.user;
}

function pickBusinessIdFromProfile(profile: any) {
  if (!profile || typeof profile !== "object") return null;

  const keys = [
    "business_id",
    "active_business_id",
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

async function readProfile(sb: ReturnType<typeof admin>, userId: string) {
  const attempts = [
    { table: "profiles", column: "id" },
    { table: "profiles", column: "user_id" },
    { table: "profiles", column: "owner_id" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await sb
      .from(attempt.table)
      .select("*")
      .eq(attempt.column, userId)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function readOwnedBusiness(sb: ReturnType<typeof admin>, userId: string) {
  const attempts = ["owner_id", "user_id", "created_by", "profile_id"];

  for (const column of attempts) {
    const { data, error } = await sb
      .from("businesses")
      .select("id")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  return null;
}

async function resolveBusinessId(sb: ReturnType<typeof admin>, userId: string) {
  const profile = await readProfile(sb, userId);
  const profileBusinessId = pickBusinessIdFromProfile(profile);

  if (profileBusinessId) {
    const { data, error } = await sb
      .from("businesses")
      .select("id")
      .eq("id", profileBusinessId)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  const owned = await readOwnedBusiness(sb, userId);

  if (owned?.id) return owned.id as string;

  return null;
}

function buildStats(leads: any[]) {
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

function previewFromMessage(message: any) {
  const content = clean(message?.content);
  if (!content) return null;

  return content.replace(/\s+/g, " ").slice(0, 180);
}

async function enrichWithChats(
  sb: ReturnType<typeof admin>,
  businessId: string,
  leads: any[]
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

  const chatMap = new Map<string, any>();
  const messagesByChat = new Map<string, any>();
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
    const sb = admin();
    const user = await getUser(req, sb);

    if (!user) {
      return json({ ok: false, error: "No autorizado." }, 401);
    }

    const businessId = await resolveBusinessId(sb, user.id);

    if (!businessId) {
      return json(
        {
          ok: false,
          error: "No se encontró negocio activo para listar leads.",
        },
        404
      );
    }

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
  } catch (error: any) {
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
    const sb = admin();
    const user = await getUser(req, sb);

    if (!user) {
      return json({ ok: false, error: "No autorizado." }, 401);
    }

    const businessId = await resolveBusinessId(sb, user.id);

    if (!businessId) {
      return json(
        {
          ok: false,
          error: "No se encontró negocio activo para crear lead.",
        },
        404
      );
    }

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
  } catch (error: any) {
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
    const sb = admin();
    const user = await getUser(req, sb);

    if (!user) {
      return json({ ok: false, error: "No autorizado." }, 401);
    }

    const businessId = await resolveBusinessId(sb, user.id);

    if (!businessId) {
      return json(
        {
          ok: false,
          error: "No se encontró negocio activo para actualizar lead.",
        },
        404
      );
    }

    const body = await req.json().catch(() => ({}));
    const id = clean(body?.id || body?.leadId);

    if (!id) {
      return json({ ok: false, error: "Falta id del lead." }, 400);
    }

    const update: Record<string, any> = {
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
  } catch (error: any) {
    return json(
      {
        ok: false,
        error: error?.message || "Error actualizando lead.",
      },
      500
    );
  }
}
