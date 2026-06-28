import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { cleanText, isObject } from "@/lib/ai/lumenite/schemas";
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
      return NextResponse.json({ ok: false, error: "Falta campana." }, { status: 400 });
    }

    const { data: campaign, error: readError } = await ctx.admin
      .from("lumenai_campaigns")
      .select("*")
      .eq("business_id", ctx.businessId)
      .eq("id", id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!campaign?.id) {
      return NextResponse.json({ ok: false, error: "Campana no encontrada." }, { status: 404 });
    }

    let result: unknown = campaign;
    const now = new Date().toISOString();

    if (action === "status") {
      const status = cleanText(body?.status, 40) || "draft";
      const { data, error } = await ctx.admin
        .from("lumenai_campaigns")
        .update({ status, updated_at: now })
        .eq("business_id", ctx.businessId)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    if (action === "copy_asset") {
      const assetId = cleanText(body?.asset_id, 80);
      await ctx.admin.from("lumenai_signal_events").insert({
        business_id: ctx.businessId,
        type: "campaign_asset_copied",
        title: "Asset de campana copiado",
        description: cleanText(body?.asset_title, 200) || campaign.title,
        severity: "info",
        payload: { campaign_id: id, asset_id: assetId },
      });
      result = { copied: true, assetId };
    }

    if (action === "send_to_config") {
      const payload = isObject(body?.payload) ? body.payload : {};
      const prompt =
        cleanText(payload.prompt, 2400) ||
        `Ajusta LumenAI para apoyar la campana "${campaign.title}". Oferta: ${campaign.offer || ""}. CTA: WhatsApp. Refuerza objeciones y greeting temporal.`;
      const { data, error } = await ctx.admin
        .from("lumenai_campaign_tasks")
        .insert({
          business_id: ctx.businessId,
          campaign_id: id,
          title: "Enviar campana a Config IA",
          description: prompt,
          channel: "Config IA",
          priority: "medium",
          payload: { prompt },
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Campaign Studio Agent",
      actionName: `campaigns.${action || "action"}`,
      payload: { id, body },
      result,
      status: "success",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar accion de campana.") },
      { status: safeErrorStatus(error) }
    );
  }
}
