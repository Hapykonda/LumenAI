import { NextResponse } from "next/server";
import {
  getOrCreateCalibrationRow,
  jsonError,
  requireUserBusiness,
} from "./_lib";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const { draft, published, row } = await getOrCreateCalibrationRow({
      admin: ctx.admin,
      businessId: ctx.business.id,
      publicKey: ctx.business.public_key,
    });

    const timestamps = row as {
      draft_updated_at?: string | null;
      published_at?: string | null;
      updated_at?: string | null;
    };

    return NextResponse.json({
      ok: true,
      publicKey: ctx.business.public_key,
      businessId: ctx.business.id,
      businessName: ctx.business.name || "",
      draft,
      published,
      meta: {
        draftUpdatedAt: timestamps.draft_updated_at || null,
        publishedAt: timestamps.published_at || null,
        updatedAt: timestamps.updated_at || null,
      },
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : null;
    return jsonError(error?.message || "Error cargando calibración", 500);
  }
}
