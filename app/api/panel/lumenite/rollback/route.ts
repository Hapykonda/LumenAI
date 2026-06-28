import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ctx = await requireLumeniteBusiness();

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "System QA Agent",
      actionName: "lumenite.rollback.requested",
      payload: { module: "generic" },
      result: {
        message:
          "Rollback generico no aplica cambios directos. Usa rollback de Config IA para revertir configuracion del widget/calibracion.",
      },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      applied: false,
      message:
        "Rollback generico registrado. Para configuracion usa el boton Revertir en Config IA.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo registrar rollback.") },
      { status: safeErrorStatus(error) }
    );
  }
}
