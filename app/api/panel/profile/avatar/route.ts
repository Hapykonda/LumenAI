import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
} from "@/lib/auth/business-context";
import { isRecord, OWNER_PROFILE_BUCKET } from "@/lib/owner-profile";
import { readOwnerProfile, requireProfileContext, safeProfileError } from "../_lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

function extensionFor(type: AllowedType) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return "webp";
}

function detectedImageType(bytes: Uint8Array): AllowedType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function avatarMetadata(current: unknown, patch: Record<string, unknown>) {
  return {
    ...(isRecord(current) ? current : {}),
    ...patch,
  };
}

export async function GET(request: Request) {
  try {
    const context = await requireProfileContext(request);
    const current = await readOwnerProfile(context);
    if (!current.path) {
      return NextResponse.json(
        { ok: false, error: "Este perfil no tiene una foto privada." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, error } = await context.admin.storage
      .from(OWNER_PROFILE_BUCKET)
      .download(current.path);
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "La foto del perfil no esta disponible." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return new Response(data, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300, must-revalidate",
        "Content-Disposition": 'inline; filename="profile-avatar"',
        "Content-Length": String(data.size),
        "Content-Type": data.type || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo leer la foto.") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let uploadedPath = "";
  try {
    const context = await requireProfileContext(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Selecciona una imagen." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
      return NextResponse.json(
        { ok: false, error: "Usa una imagen PNG, JPG o WebP." },
        { status: 415 },
      );
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "La imagen debe pesar entre 1 byte y 2 MB." },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = detectedImageType(bytes);
    if (!detectedType || detectedType !== file.type) {
      return NextResponse.json(
        { ok: false, error: "El contenido del archivo no coincide con una imagen valida." },
        { status: 415 },
      );
    }

    const current = await readOwnerProfile(context);
    const version = crypto.randomUUID();
    uploadedPath = `${context.businessId}/${context.userId}/avatar-${version}.${extensionFor(detectedType)}`;
    const upload = await context.admin.storage
      .from(OWNER_PROFILE_BUCKET)
      .upload(uploadedPath, bytes, {
        contentType: detectedType,
        cacheControl: "300",
        upsert: false,
      });
    if (upload.error) throw upload.error;

    const updatedAt = new Date().toISOString();
    const update = await context.admin
      .from("profiles")
      .update({
        metadata: avatarMetadata(current.row.metadata, {
          avatar_path: uploadedPath,
          avatar_url: "",
          avatar_version: version,
        }),
        updated_at: updatedAt,
      })
      .eq("id", context.userId);
    if (update.error) {
      await context.admin.storage.from(OWNER_PROFILE_BUCKET).remove([uploadedPath]);
      uploadedPath = "";
      throw update.error;
    }

    if (current.path && current.path !== uploadedPath) {
      await context.admin.storage.from(OWNER_PROFILE_BUCKET).remove([current.path]);
    }

    const saved = await readOwnerProfile(context);
    return NextResponse.json({ ok: true, profile: saved.profile });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo subir la foto.") },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireProfileContext(request);
    const current = await readOwnerProfile(context);
    if (!current.path) {
      return NextResponse.json({ ok: true, profile: current.profile });
    }

    const updatedAt = new Date().toISOString();
    const update = await context.admin
      .from("profiles")
      .update({
        metadata: avatarMetadata(current.row.metadata, {
          avatar_path: null,
          avatar_url: "",
          avatar_version: null,
        }),
        updated_at: updatedAt,
      })
      .eq("id", context.userId);
    if (update.error) throw update.error;

    await context.admin.storage.from(OWNER_PROFILE_BUCKET).remove([current.path]);
    const saved = await readOwnerProfile(context);
    return NextResponse.json({ ok: true, profile: saved.profile });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo eliminar la foto.") },
      { status: 500 },
    );
  }
}
