import { NextResponse } from "next/server";
import { ensureShape } from "@/app/panel/calibration/defaults";
import {
  getOrCreateCalibrationRow,
  jsonError,
  requireUserBusiness,
} from "../_lib";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const body = await req.json().catch(() => null);
    const draft = ensureShape(body?.draft);

    await getOrCreateCalibrationRow({
      admin: ctx.admin,
      businessId: ctx.business.id,
      publicKey: ctx.business.public_key,
    });

    const now = new Date().toISOString();

    const { error } = await ctx.admin
      .from("widget_settings")
      .update({
        public_key: ctx.business.public_key,
        draft_settings: draft,
        draft_updated_at: now,
        updated_at: now,
      })
      .eq("business_id", ctx.business.id);

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      ok: true,
      publicKey: ctx.business.public_key,
      draft,
      draftUpdatedAt: now,
    });
  } catch (caught: unknown) {
    const error = caught instanceof Error ? caught : null;
    return jsonError(error?.message || "Error guardando borrador", 500);
  }
}
