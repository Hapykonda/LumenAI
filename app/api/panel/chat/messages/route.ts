import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
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
    return { ok: false, error: error.message, chat: null };
  }

  if (!data?.id) {
    return { ok: false, error: "chat_not_found", chat: null };
  }

  if (data.business_id !== businessId) {
    return { ok: false, error: "forbidden", chat: null };
  }

  return { ok: true, error: null, chat: data };
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
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("messages_get_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "messages_get_error" },
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
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("messages_post_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "messages_post_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const businessId = context.businessId;

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
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("messages_patch_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "messages_patch_error" },
      { status: 500 }
    );
  }
}
