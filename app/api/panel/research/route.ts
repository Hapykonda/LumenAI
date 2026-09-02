import { NextResponse } from "next/server";
import { getGroqStatus } from "@/lib/ai/groq";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText } from "@/lib/ai/lumenite/schemas";
import { fetchResearchNews, optionalQuery } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    const snapshot = await buildLumeniteBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      publicKey: ctx.business.public_key,
    });
    const [sources, jobs, findings, reports, marketNews] = await Promise.all([
      optionalQuery<Row>(
        ctx.admin
          .from("lumenai_research_sources")
          .select("*")
          .eq("business_id", ctx.businessId)
          .order("updated_at", { ascending: false })
          .limit(80)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("lumenai_research_jobs")
          .select("*")
          .eq("business_id", ctx.businessId)
          .order("created_at", { ascending: false })
          .limit(80)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("lumenai_research_findings")
          .select("*")
          .eq("business_id", ctx.businessId)
          .order("created_at", { ascending: false })
          .limit(120)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("lumenai_research_reports")
          .select("*")
          .eq("business_id", ctx.businessId)
          .order("created_at", { ascending: false })
          .limit(40)
      ),
      fetchResearchNews(`${ctx.business.name || "business"} AI sales automation market`),
    ]);
    const openFindings = findings.filter((item) =>
      ["new", "review", "open"].includes(cleanText(item.status, 40))
    );
    const hasRealResearch =
      sources.length > 0 || jobs.length > 0 || findings.length > 0 || reports.length > 0;

    return NextResponse.json({
      ok: true,
      mode: hasRealResearch ? "real" : "preview",
      ai: getGroqStatus("research"),
      business: snapshot.business,
      summary: {
        sources: sources.length,
        activeSources: sources.filter((item) => item.enabled !== false).length,
        jobs: jobs.length,
        runningJobs: jobs.filter((item) => item.status === "running").length,
        findings: findings.length,
        openFindings: openFindings.length,
        reports: reports.length,
        hotLeads: snapshot.stats.hotLeads,
        unreadChats: snapshot.stats.unreadChats,
      },
      sources,
      jobs,
      findings,
      reports,
      marketNews,
      suggestedSources: [
        {
          name: "Google News - industria",
          source_type: "rss",
          query: `${snapshot.business.name} mercado competencia clientes`,
          description: "Noticias y movimientos externos para alimentar Radar.",
        },
        {
          name: "Conversaciones del widget",
          source_type: "internal",
          query: "objeciones, preguntas frecuentes, productos y leads calientes",
          description: "Senales internas para detectar friccion y oportunidades.",
        },
        {
          name: "Competidores y categorias",
          source_type: "query",
          query: "precios, ofertas, posicionamiento y diferenciadores",
          description: "Investigacion estrategica para Growth y Campaigns.",
        },
      ],
      missingData: snapshot.missingData,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo cargar Research.") },
      { status: safeErrorStatus(error) }
    );
  }
}
