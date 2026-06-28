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
    const name = cleanText(body?.name, 140);

    if (!name) {
      return NextResponse.json({ ok: false, error: "Falta nombre del playbook." }, { status: 400 });
    }

    const { data, error } = await ctx.admin
      .from("lumenai_growth_playbooks")
      .insert({
        business_id: ctx.businessId,
        name,
        description: cleanText(body?.description, 600),
        trigger_type: cleanText(body?.trigger_type, 80) || "manual",
        channel: cleanText(body?.channel, 60) || "panel",
        message_template: cleanText(body?.message_template, 1600),
        rules: isObject(body?.rules) ? body.rules : {},
        enabled: body?.enabled !== false,
      })
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Growth Engine Agent",
      actionName: "growth.playbook.create",
      payload: body,
      result: data,
      status: "success",
    });

    return NextResponse.json({ ok: true, playbook: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo crear playbook.") },
      { status: safeErrorStatus(error) }
    );
  }
}
