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

    return NextResponse.json({
      ok: true,
      publicKey: ctx.business.public_key,
      businessId: ctx.business.id,
      businessName: ctx.business.name || "",
      draft,
      published,
      meta: {
        draftUpdatedAt: (row as any)?.draft_updated_at || null,
        publishedAt: (row as any)?.published_at || null,
        updatedAt: (row as any)?.updated_at || null,
      },
    });
  } catch (error: any) {
    return jsonError(error?.message || "Error cargando calibración", 500);
  }
}