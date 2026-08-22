import { NextResponse } from "next/server";
import { createLumenitePlan } from "@/lib/ai/lumenite/action-engine";
import { cleanString, isRecord, type LumeniteActionSource } from "@/lib/ai/lumenite/core";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "Solicitud no valida." }, { status: 400 });
    }
    const result = await createLumenitePlan({
      request: req,
      agent: cleanString(body.agent, 80) || "panel",
      instruction: cleanString(body.instruction || body.message, 2400),
      source: cleanString(body.source, 40) as LumeniteActionSource,
      context: isRecord(body.context) ? body.context : {},
      signalId: cleanString(
        body.signalId || (isRecord(body.context) ? body.context.signalId : null),
        80,
      ) || null,
      requestKey:
        cleanString(req.headers.get("idempotency-key"), 220) || cleanString(body.requestKey, 220),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo generar el plan.") },
      { status: safeErrorStatus(error) },
    );
  }
}
