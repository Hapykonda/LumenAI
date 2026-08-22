import { NextResponse } from "next/server";
import { decideLumeniteAction, listLumeniteRuns } from "@/lib/ai/lumenite/action-engine";
import { cleanString, isRecord, isUuid } from "@/lib/ai/lumenite/core";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const result = await listLumeniteRuns(req);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo leer el historial.") },
      { status: safeErrorStatus(error) },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const decision = isRecord(body) ? cleanString(body.decision, 20) : "";
    if (!isRecord(body) || !isUuid(body.runId) || !["reject", "cancel", "request_changes"].includes(decision)) {
      return NextResponse.json({ ok: false, error: "Decision no valida." }, { status: 400 });
    }
    const result = await decideLumeniteAction({
      request: req,
      runId: String(body.runId),
      decision: decision as "reject" | "cancel" | "request_changes",
      reason: cleanString(body.reason, 500),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo actualizar la accion.") },
      { status: safeErrorStatus(error) },
    );
  }
}
