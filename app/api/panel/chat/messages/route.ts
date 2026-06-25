 import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function assertChatBelongsToBusiness(
  admin: ReturnType<typeof supabaseAdmin>,
  chatId: string,
  businessId: string
) {
  const { data, error } = await admin
    .from("chats")
    .select(
      "id,business_id,title,channel,visitor_id,unread_owner,human_takeover,human_takeover_at,ai_paused_reason,created_at,updated_at"
    )
    .eq("id", chatId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message, chat: null as any };
  }

  if (!data?.id) {
    return { ok: false, error: "chat_not_found", chat: null as any };
  }

  if (data.business_id !== businessId) {
    return { ok: false, error: "forbidden", chat: null as any };
  }

  return { ok: true, error: null, chat: data };
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
      return NextResponse.json({ ok: false, error: "no_business" }, { status: 403 });
    }

    const url = new URL(req.url);
    const chatId = clean(url.searchParams.get("chat_id"));

    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "missing_chat_id" },
        { status: 400 }
      );
    }

    const check = await assertChatBelongsToBusiness(admin, chatId, businessId);

    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: check.error },
        { status: check.error === "chat_not_found" ? 404 : 403 }
      );
    }

    const { data: messages, error: msgError } = await admin
      .from("chat_messages")
      .select("id,chat_id,business_id,sender_type,content,created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (msgError) {
      return NextResponse.json(
        { ok: false, error: "db_error", detail: msgError.message },
        { status: 500 }
      );
    }

    const { data: leads } = await admin
      .from("leads")
      .select("*")
      .eq("business_id", businessId)
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      chat: check.chat,
      messages: messages ?? [],
      leads: leads ?? [],
      lead: Array.isArray(leads) && leads.length > 0 ? leads[0] : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "messages_get_error" },
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
      return NextResponse.json({ ok: false, error: "no_business" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const chatId = clean(body?.chat_id || body?.chatId);
    const content = clean(body?.content || body?.message);

    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "missing_chat_id" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "missing_content" },
        { status: 400 }
      );
    }

    const check = await assertChatBelongsToBusiness(admin, chatId, businessId);

    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: check.error },
        { status: check.error === "chat_not_found" ? 404 : 403 }
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from("chat_messages")
      .insert({
        chat_id: chatId,
        business_id: businessId,
        sender_type: "assistant",
        content,
      })
      .select("id,chat_id,business_id,sender_type,content,created_at")
      .maybeSingle();

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: "db_error", detail: insertError.message },
        { status: 500 }
      );
    }

    await admin
      .from("chats")
      .update({
        updated_at: new Date().toISOString(),
        unread_owner: false,
        human_takeover: true,
        human_takeover_at: new Date().toISOString(),
        ai_paused_reason: "manual_reply",
      })
      .eq("id", chatId)
      .eq("business_id", businessId);

    return NextResponse.json({
      ok: true,
      message: inserted,
      humanTakeover: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "messages_post_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const businessId = await resolveBusinessId(admin, user.id);

    if (!businessId) {
      return NextResponse.json({ ok: false, error: "no_business" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const chatId = clean(body?.chat_id || body?.chatId);
    const nextHumanTakeover = Boolean(body?.human_takeover ?? body?.humanTakeover);

    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "missing_chat_id" },
        { status: 400 }
      );
    }

    const check = await assertChatBelongsToBusiness(admin, chatId, businessId);

    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: check.error },
        { status: check.error === "chat_not_found" ? 404 : 403 }
      );
    }

    const payload = nextHumanTakeover
      ? {
          human_takeover: true,
          human_takeover_at: new Date().toISOString(),
          ai_paused_reason: clean(body?.reason) || "manual_toggle",
          updated_at: new Date().toISOString(),
        }
      : {
          human_takeover: false,
          human_takeover_at: null,
          ai_paused_reason: null,
          updated_at: new Date().toISOString(),
        };

    const { data: chat, error } = await admin
      .from("chats")
      .update(payload)
      .eq("id", chatId)
      .eq("business_id", businessId)
      .select(
        "id,business_id,title,channel,visitor_id,unread_owner,human_takeover,human_takeover_at,ai_paused_reason,created_at,updated_at"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db_error", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      chat,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "messages_patch_error" },
      { status: 500 }
    );
  }
}