import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
} from "@/lib/auth/business-context";
import {
  cleanOwnerProfileText,
  isRecord,
  ownerProfileAvatarEndpoint,
  ownerProfileFromMetadata,
} from "@/lib/owner-profile";
import { readOwnerProfile, requireProfileContext, safeProfileError } from "./_lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireProfileContext(request);
    const result = await readOwnerProfile(context);
    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo leer el perfil.") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireProfileContext(request);
    const input = await request.json().catch(() => null);
    if (!isRecord(input)) {
      return NextResponse.json(
        { ok: false, error: "Datos de perfil invalidos." },
        { status: 400 },
      );
    }

    const current = await readOwnerProfile(context);
    const currentMetadata = isRecord(current.row.metadata) ? current.row.metadata : {};
    const metadata = {
      ...currentMetadata,
      display_name: cleanOwnerProfileText(input.displayName, 80),
      job_title: cleanOwnerProfileText(input.jobTitle, 80),
      bio: cleanOwnerProfileText(input.bio, 240),
    };
    const updatedAt = new Date().toISOString();
    const { data, error } = await context.admin
      .from("profiles")
      .update({ metadata, updated_at: updatedAt })
      .eq("id", context.userId)
      .select("role,metadata,updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      profile: ownerProfileFromMetadata({
        metadata: data.metadata,
        role: data.role,
        email: context.user.email,
        authMetadata: context.user.user_metadata,
        ...(current.path
          ? { avatarUrl: ownerProfileAvatarEndpoint(data.updated_at) }
          : {}),
      }),
    });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo guardar el perfil.") },
      { status: 500 },
    );
  }
}
