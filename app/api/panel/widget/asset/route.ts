import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "lumenai-widget-assets";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function supabaseAdmin() {
  const env = getSupabaseServerEnv();

  return createClient(env.url, env.serviceRoleKey, {
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

function pickBusinessIdFromProfile(profile: any) {
  if (!profile || typeof profile !== "object") return null;

  for (const key of [
    "active_business_id",
    "business_id",
    "current_business_id",
    "selected_business_id",
    "default_business_id",
  ]) {
    const value = clean(profile[key]);
    if (value) return value;
  }

  return null;
}

async function getUser(req: Request, admin: ReturnType<typeof supabaseAdmin>) {
  const token = getBearer(req);
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
}

async function readProfile(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  for (const column of ["id", "user_id", "owner_id"]) {
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq(column, userId)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function readOwnedBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  for (const column of ["owner_id", "user_id", "created_by", "profile_id"]) {
    const { data, error } = await admin
      .from("businesses")
      .select("id,name,public_key")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  return null;
}

async function resolveBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const profile = await readProfile(admin, userId);
  const profileBusinessId = pickBusinessIdFromProfile(profile);

  if (profileBusinessId) {
    const { data, error } = await admin
      .from("businesses")
      .select("id,name,public_key")
      .eq("id", profileBusinessId)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  return readOwnedBusiness(admin, userId);
}

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function ensureBucket(admin: ReturnType<typeof supabaseAdmin>) {
  const current = await admin.storage.getBucket(BUCKET);
  if (!current.error) return;

  const created = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });

  if (created.error) throw new Error(created.error.message);
}

export async function POST(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const business = await resolveBusiness(admin, user.id);

    if (!business?.id) {
      return NextResponse.json({ ok: false, error: "missing_business" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "image_too_large" }, { status: 400 });
    }

    await ensureBucket(admin);

    const ext = extensionFromType(file.type);
    const path = `${business.id}/widget-avatar-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(bytes), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) throw new Error(error.message);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "widget_asset_upload_error" },
      { status: 500 }
    );
  }
}
