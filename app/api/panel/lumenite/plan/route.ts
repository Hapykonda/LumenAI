import { NextResponse } from "next/server";
import { planLumeniteActions, dryRunAction } from "@/lib/ai/lumenite/action-engine";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { cleanText } from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const agent = cleanText(body?.agent, 80) || "panel";
    const instruction = cleanText(body?.instruction || body?.message, 2400);
    const snapshot = await buildLumeniteBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      publicKey: ctx.business.public_key,
    });
    const plan = await planLumeniteActions({
      agent,
      instruction,
      context: snapshot,
    });

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: String(plan.agent),
      actionName: "lumenite.plan",
      payload: { instruction, requestedAgent: agent },
      result: { actions: plan.actions.map((action) => action.action_name) },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      plan,
      dryRun: plan.actions.map(dryRunAction),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo generar plan.") },
      { status: safeErrorStatus(error) }
    );
  }
}
