import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const params = await ctx.params;
    const chatId = clean(params?.id);

    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "missing_chat_id" },
        { status: 400 }
      );
    }

    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const businessId = context.businessId;

    const { data: chat, error: chatError } = await admin
      .from("chats")
      .select("id,business_id")
      .eq("id", chatId)
      .maybeSingle();

    if (chatError) {
      return NextResponse.json(
        { ok: false, error: chatError.message },
        { status: 400 }
      );
    }

    if (!chat?.id) {
      return NextResponse.json(
        { ok: false, error: "chat_not_found" },
        { status: 404 }
      );
    }

    if (chat.business_id !== businessId) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const { error: updateError } = await admin
      .from("chats")
      .update({ unread_owner: false })
      .eq("id", chatId)
      .eq("business_id", businessId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : new Error("chat_read_error");
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "read_error" },
      { status: 500 }
    );
  }
}
