import { NextResponse } from "next/server";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText } from "@/lib/ai/lumenite/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const name = cleanText(body?.name, 140);
    const sourceType = cleanText(body?.source_type || body?.sourceType, 40) || "query";
    const url = cleanText(body?.url, 600) || null;
    const query = cleanText(body?.query, 600) || null;
    const description = cleanText(body?.description, 600) || null;
    const cadence = cleanText(body?.cadence, 60) || "manual";

    if (!name) {
      return NextResponse.json({ ok: false, error: "Agrega un nombre de fuente." }, { status: 400 });
    }

    if (!url && !query && sourceType !== "internal") {
      return NextResponse.json(
        { ok: false, error: "Agrega una URL, query o marca la fuente como interna." },
        { status: 400 }
      );
    }

    const { data, error } = await ctx.admin
      .from("lumenai_research_sources")
      .insert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        name,
        source_type: sourceType,
        url,
        query,
        description,
        cadence,
        enabled: body?.enabled !== false,
        metadata: { created_from: "panel" },
      })
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Research Engine",
      actionName: "research.source.create",
      payload: { name, sourceType, url: Boolean(url), query: Boolean(query) },
      result: { sourceId: data?.id },
      status: "success",
    });

    return NextResponse.json({ ok: true, source: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo crear la fuente.") },
      { status: safeErrorStatus(error) }
    );
  }
}
