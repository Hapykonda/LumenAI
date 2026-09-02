import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
} from "@/lib/auth/business-context";
import { normalizeInterfacePreferences } from "@/lib/interface-preferences";
import { isRecord } from "@/lib/owner-profile";
import { readOwnerProfile, requireProfileContext, safeProfileError } from "../profile/_lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireProfileContext(request);
    const current = await readOwnerProfile(context);
    const metadata = isRecord(current.row.metadata) ? current.row.metadata : {};
    return NextResponse.json({
      ok: true,
      preferences: normalizeInterfacePreferences(metadata.interface_preferences),
    });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) return businessAuthorizationErrorResponse(error);
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo leer Interface.") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireProfileContext(request);
    const input = await request.json().catch(() => null);
    if (!isRecord(input)) {
      return NextResponse.json({ ok: false, error: "Preferencias inválidas." }, { status: 400 });
    }

    const current = await readOwnerProfile(context);
    const metadata = isRecord(current.row.metadata) ? current.row.metadata : {};
    const preferences = normalizeInterfacePreferences(input);
    const { error } = await context.admin
      .from("profiles")
      .update({
        metadata: { ...metadata, interface_preferences: preferences },
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    if (error) throw error;
    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    if (error instanceof BusinessAuthorizationError) return businessAuthorizationErrorResponse(error);
    return NextResponse.json(
      { ok: false, error: safeProfileError(error, "No se pudo guardar Interface.") },
      { status: 500 },
    );
  }
}
