import { NextResponse } from "next/server";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText, safeJson } from "@/lib/ai/lumenite/schemas";
import { optionalQuery } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const title = cleanText(body?.title, 160) || "Reporte de investigacion";
    const instruction =
      cleanText(body?.instruction, 900) ||
      "Convierte los hallazgos abiertos en un reporte ejecutivo con recomendaciones.";
    const findings = await optionalQuery<Row>(
      ctx.admin
        .from("lumenai_research_findings")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(30)
    );
    const aiText = await callGroqChat({
      purpose: "radar",
      responseFormat: "json_object",
      temperature: 0.18,
      maxTokens: 1700,
      messages: [
        {
          role: "system",
          content:
            "Eres LumenAI Research Engine. Crea un reporte ejecutivo con secciones y recomendaciones. Devuelve JSON: {title, summary, sections, recommendations}. No inventes datos.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction,
            title,
            findings,
          }),
        },
      ],
    });
    const parsed = safeJson<{
      title?: string;
      summary?: string;
      sections?: unknown[];
      recommendations?: unknown[];
    }>(aiText, {});
    const sections = Array.isArray(parsed.sections) && parsed.sections.length
      ? parsed.sections.slice(0, 8)
      : [
          {
            title: "Hallazgos recientes",
            body: findings.slice(0, 8).map((item) => ({
              title: item.title,
              impact: item.impact,
              confidence: item.confidence,
            })),
          },
        ];
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((item) => cleanText(item, 260)).filter(Boolean).slice(0, 8)
      : findings
          .map((item) => cleanText(item.recommended_action, 260))
          .filter(Boolean)
          .slice(0, 8);
    const { data: report, error } = await ctx.admin
      .from("lumenai_research_reports")
      .insert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        title: cleanText(parsed.title, 160) || title,
        summary:
          cleanText(parsed.summary, 1200) ||
          "Reporte generado desde los hallazgos recientes de Research Engine.",
        sections,
        recommendations,
        status: "ready",
      })
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Research Engine",
      actionName: "research.report.create",
      payload: { title, instruction, findings: findings.length },
      result: { reportId: report?.id },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("radar"),
      report,
      usedFallback: !aiText,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo generar el reporte.") },
      { status: safeErrorStatus(error) }
    );
  }
}
