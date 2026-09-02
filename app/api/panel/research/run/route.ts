import { NextResponse } from "next/server";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText, isObject, safeJson } from "@/lib/ai/lumenite/schemas";
import {
  fallbackResearchOutput,
  fetchResearchNews,
  sanitizeResearchOutput,
} from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceRow = {
  id?: string;
  name?: string | null;
  query?: string | null;
  url?: string | null;
  source_type?: string | null;
};

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const sourceId = cleanText(body?.source_id || body?.sourceId, 80) || null;
    const scope = cleanText(body?.scope, 60) || "business";
    const priority = cleanText(body?.priority, 40) || "medium";
    let source: SourceRow | null = null;

    if (sourceId) {
      const sourceResult = await ctx.admin
        .from("lumenai_research_sources")
        .select("*")
        .eq("business_id", ctx.businessId)
        .eq("id", sourceId)
        .maybeSingle();

      if (sourceResult.error) throw new Error(sourceResult.error.message);
      source = sourceResult.data as SourceRow | null;
    }

    const query =
      cleanText(body?.query || body?.instruction, 900) ||
      cleanText(source?.query || source?.url || source?.name, 900) ||
      "Investiga oportunidades, riesgos y senales comerciales del negocio.";

    const { data: job, error: jobError } = await ctx.admin
      .from("lumenai_research_jobs")
      .insert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        source_id: sourceId,
        query,
        scope,
        priority,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (jobError) throw new Error(jobError.message);

    const snapshot = await buildLumeniteBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      publicKey: ctx.business.public_key,
    });
    const news = await fetchResearchNews(query);
    const fallback = fallbackResearchOutput({ query, snapshot, news });
    const aiText = await callGroqChat({
      purpose: "research",
      responseFormat: "json_object",
      temperature: 0.2,
      maxTokens: 2200,
      messages: [
        {
          role: "system",
          content:
            "Eres LumenAI Research Engine. Investigas con datos disponibles y produces hallazgos accionables. No inventes fuentes ni acciones ya ejecutadas. Devuelve JSON: {findings:[{title,summary,category,impact,confidence,evidence,source_name,source_url,recommended_action,payload}], report:{title,summary,sections,recommendations}}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            scope,
            source,
            business: snapshot.business,
            internalSignals: {
              stats: snapshot.stats,
              missingData: snapshot.missingData,
              leads: snapshot.leads.slice(0, 30),
              chats: snapshot.chats.slice(0, 20),
              messages: snapshot.messages.slice(0, 50),
              opportunities: snapshot.opportunities.slice(0, 25),
              campaigns: snapshot.campaigns.slice(0, 15),
              knowledge: snapshot.knowledge.slice(0, 25),
            },
            externalNews: news,
            rules: [
              "Usa solamente datos entregados en el payload.",
              "Si una fuente externa no tiene URL, dilo como senal interna o hipotesis.",
              "Cada finding debe sugerir un modulo destino: Radar, Growth, Campaigns, Config AI o Lumen Eye.",
            ],
          }),
        },
      ],
    });
    const generated = sanitizeResearchOutput(safeJson(aiText, {}), fallback);

    const { data: findings, error: findingError } = await ctx.admin
      .from("lumenai_research_findings")
      .insert(
        generated.findings.map((finding) => ({
          business_id: ctx.businessId,
          job_id: job?.id ?? null,
          source_id: sourceId,
          title: finding.title,
          summary: finding.summary,
          category: finding.category,
          impact: finding.impact,
          confidence: finding.confidence,
          evidence: finding.evidence,
          source_name: finding.source_name ?? source?.name ?? null,
          source_url: finding.source_url ?? source?.url ?? null,
          recommended_action: finding.recommended_action,
          payload: {
            ...(isObject(finding.payload) ? finding.payload : {}),
            generation_mode: aiText ? "ai" : "evidence_rules",
          },
          status: "new",
        }))
      )
      .select("*");

    if (findingError) throw new Error(findingError.message);

    const { data: report, error: reportError } = await ctx.admin
      .from("lumenai_research_reports")
      .insert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        job_id: job?.id ?? null,
        title: generated.report.title,
        summary: generated.report.summary,
        sections: generated.report.sections,
        recommendations: generated.report.recommendations,
        status: "ready",
      })
      .select("*")
      .maybeSingle();

    if (reportError) throw new Error(reportError.message);

    const finishedAt = new Date().toISOString();
    await ctx.admin
      .from("lumenai_research_jobs")
      .update({
        status: "completed",
        finished_at: finishedAt,
        result: {
          ai: Boolean(aiText),
          findings: findings?.length ?? 0,
          report_id: report?.id ?? null,
          news: news.length,
        },
      })
      .eq("business_id", ctx.businessId)
      .eq("id", job?.id);

    if (sourceId) {
      await ctx.admin
        .from("lumenai_research_sources")
        .update({ last_run_at: finishedAt })
        .eq("business_id", ctx.businessId)
        .eq("id", sourceId);
    }

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Research Engine",
      actionName: "research.run",
      payload: { sourceId, query, scope, priority },
      result: { jobId: job?.id, findings: findings?.length ?? 0, reportId: report?.id },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("research"),
      job: { ...job, status: "completed", finished_at: finishedAt },
      findings: findings ?? [],
      report,
      marketNews: news,
      usedFallback: !aiText,
      generationMode: aiText ? "ai" : "evidence_rules",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar Research.") },
      { status: safeErrorStatus(error) }
    );
  }
}
