import { NextResponse } from "next/server";
import { undoLumeniteAction } from "@/lib/ai/lumenite/action-engine";
import { isRecord, isUuid } from "@/lib/ai/lumenite/core";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body) || !isUuid(body.runId)) {
      return NextResponse.json({ ok: false, error: "Falta un runId valido." }, { status: 400 });
    }
    const result = await undoLumeniteAction(String(body.runId), req);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo deshacer la accion.") },
      { status: safeErrorStatus(error) },
    );
  }
}
