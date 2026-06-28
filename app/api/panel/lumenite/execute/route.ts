import { NextResponse } from "next/server";
import { executeLumeniteAction } from "@/lib/ai/lumenite/action-engine";
import { cleanText, isObject } from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const agent = cleanText(body?.agent, 80) || "Executive Panel Agent";
    const rawAction = isObject(body?.action) ? body.action : {};
    const action = {
      action_name: cleanText(rawAction.action_name, 120),
      payload: isObject(rawAction.payload) ? rawAction.payload : {},
      reason: cleanText(rawAction.reason, 400),
      rollback_available: Boolean(rawAction.rollback_available),
    };

    if (!action.action_name) {
      return NextResponse.json({ ok: false, error: "Falta action_name." }, { status: 400 });
    }

    const result = await executeLumeniteAction({ agent, action });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar accion.") },
      { status: safeErrorStatus(error) }
    );
  }
}
