import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { cleanText, isObject } from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const actionType = cleanText(body?.action_type || body?.type, 80);
    const scenarioId = cleanText(body?.scenario_id, 80) || null;
    const payload = isObject(body?.payload) ? body.payload : {};
    let result: unknown = { prepared: true };

    if (!actionType) {
      return NextResponse.json({ ok: false, error: "Falta tipo de accion." }, { status: 400 });
    }

    if (actionType === "create_knowledge_draft") {
      const { data, error } = await ctx.admin
        .from("business_kb")
        .insert({
          business_id: ctx.businessId,
          type: cleanText(payload.type, 40) || "other",
          title: cleanText(payload.title, 140) || "Sugerencia Business Twin",
          content: cleanText(payload.content, 2200) || cleanText(payload.prompt, 2200),
          is_published: false,
          metadata: { source: "business_twin", scenario_id: scenarioId },
        })
        .select("id,title,type,is_published")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    const { data: decisionAction, error: actionError } = await ctx.admin
      .from("lumenai_decision_actions")
      .insert({
        business_id: ctx.businessId,
        scenario_id: scenarioId,
        action_type: actionType,
        payload,
        status: actionType === "create_knowledge_draft" ? "completed" : "pending",
        result: result ?? {},
        completed_at: actionType === "create_knowledge_draft" ? new Date().toISOString() : null,
      })
      .select("*")
      .maybeSingle();

    if (actionError) throw new Error(actionError.message);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Business Twin Agent",
      actionName: `twin.${actionType}`,
      payload: body,
      result: decisionAction,
      status: "success",
    });

    return NextResponse.json({ ok: true, action: decisionAction, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo crear accion Twin.") },
      { status: safeErrorStatus(error) }
    );
  }
}
