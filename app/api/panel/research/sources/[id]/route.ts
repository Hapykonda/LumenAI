import { NextResponse } from "next/server";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText } from "@/lib/ai/lumenite/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireLumeniteBusiness();
    const params = await context.params;
    const id = cleanText(params?.id, 80);
    const body = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta fuente." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    for (const key of ["name", "source_type", "url", "query", "description", "cadence"]) {
      if (key in body) patch[key] = cleanText(body[key], key === "url" ? 600 : 240) || null;
    }
    if ("enabled" in body) patch.enabled = Boolean(body.enabled);

    const { data, error } = await ctx.admin
      .from("lumenai_research_sources")
      .update(patch)
      .eq("business_id", ctx.businessId)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.id) {
      return NextResponse.json({ ok: false, error: "Fuente no encontrada." }, { status: 404 });
    }

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Research Engine",
      actionName: "research.source.update",
      payload: { id, patch: Object.keys(patch) },
      result: { sourceId: data.id },
      status: "success",
    });

    return NextResponse.json({ ok: true, source: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo actualizar la fuente.") },
      { status: safeErrorStatus(error) }
    );
  }
}
