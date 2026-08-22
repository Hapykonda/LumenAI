import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "lumenai-widget-assets";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getOwnedStoragePath(value: unknown, businessId: string) {
  const raw = clean(value);
  if (!raw) return null;

  let candidate = raw;

  try {
    const url = new URL(raw);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    candidate = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    candidate = raw.replace(/^\/+/, "");
  }

  const normalized = candidate.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized.startsWith(`${businessId}/`)) return null;
  if (normalized.includes("../") || normalized.includes("/..")) return null;

  return normalized;
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
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const business = context.activeBusiness;

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "image_too_large" }, { status: 400 });
    }

    await ensureBucket(admin);

    const kind = clean(form.get("kind")) === "logo" ? "logo" : "avatar";
    const ext = extensionFromType(file.type);
    const path = `${business.id}/widget-${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(bytes), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) throw new Error(error.message);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path,
    });
  } catch (error: unknown) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "widget_asset_upload_error") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const business = context.activeBusiness;

    const body = await req.json().catch(() => ({}));
    const path = getOwnedStoragePath(body?.path ?? body?.url, business.id);

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "invalid_or_external_asset" },
        { status: 400 }
      );
    }

    const { error } = await admin.storage.from(BUCKET).remove([path]);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "widget_asset_delete_error") },
      { status: 500 }
    );
  }
}
