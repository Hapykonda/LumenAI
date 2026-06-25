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

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function getBearer(req: Request) {
  const raw = req.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
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

    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const businessId = await resolveBusinessId(admin, user.id);

    if (!businessId) {
      return NextResponse.json(
        { ok: false, error: "no_business" },
        { status: 403 }
      );
    }

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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "read_error" },
      { status: 500 }
    );
  }
}