import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { cleanText } from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireLumeniteBusiness();
    const params = await context.params;
    const id = cleanText(params?.id, 80);
    const body = await req.json().catch(() => ({}));
    const action = cleanText(body?.action, 80);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta oportunidad." }, { status: 400 });
    }

    const { data: opportunity, error: readError } = await ctx.admin
      .from("lumenai_opportunities")
      .select("*")
      .eq("business_id", ctx.businessId)
      .eq("id", id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!opportunity?.id) {
      return NextResponse.json({ ok: false, error: "Oportunidad no encontrada." }, { status: 404 });
    }

    let result: unknown = opportunity;
    const now = new Date().toISOString();

    if (action === "status" || action === "mark_won" || action === "mark_lost") {
      const status =
        action === "mark_won"
          ? "won"
          : action === "mark_lost"
          ? "lost"
          : cleanText(body?.status, 40) || "open";
      const { data, error } = await ctx.admin
        .from("lumenai_opportunities")
        .update({ status, updated_at: now })
        .eq("business_id", ctx.businessId)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;

      if (opportunity.lead_id && (status === "won" || status === "lost")) {
        await ctx.admin
          .from("leads")
          .update({ status, updated_at: now })
          .eq("business_id", ctx.businessId)
          .eq("id", opportunity.lead_id);
      }
    }

    if (action === "create_followup") {
      const { data, error } = await ctx.admin
        .from("lumenai_followup_tasks")
        .insert({
          business_id: ctx.businessId,
          lead_id: opportunity.lead_id ?? null,
          chat_id: opportunity.chat_id ?? null,
          opportunity_id: id,
          title: cleanText(body?.title, 160) || `Seguimiento: ${opportunity.title}`,
          message:
            cleanText(body?.message, 1600) ||
            cleanText(opportunity.suggested_message, 1600),
          due_at: cleanText(body?.due_at, 80) || null,
          priority: cleanText(body?.priority, 40) || opportunity.priority || "medium",
          created_by_ai: true,
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    if (action === "copy_message") {
      await ctx.admin.from("lumenai_signal_events").insert({
        business_id: ctx.businessId,
        lead_id: opportunity.lead_id ?? null,
        chat_id: opportunity.chat_id ?? null,
        type: "growth_message_copied",
        title: "Mensaje de oportunidad copiado",
        description: cleanText(opportunity.suggested_message, 500),
        severity: "info",
        payload: { opportunity_id: id },
      });

      result = { copied: true };
    }

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Growth Engine Agent",
      actionName: `growth.opportunity.${action || "action"}`,
      payload: { id, body },
      result,
      status: "success",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar accion Growth.") },
      { status: safeErrorStatus(error) }
    );
  }
}
