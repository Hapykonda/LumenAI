import { NextResponse } from "next/server";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { cleanText } from "@/lib/ai/lumenite/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Finding = {
  id: string;
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  impact?: string | null;
  confidence?: number | null;
  source_name?: string | null;
  source_url?: string | null;
  recommended_action?: string | null;
  routed_to?: string[] | null;
  payload?: Record<string, unknown> | null;
};

function appendRoute(existing: unknown, route: string) {
  const values = Array.isArray(existing) ? existing.map((item) => cleanText(item, 60)) : [];
  return [...new Set([...values, route].filter(Boolean))];
}

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
      return NextResponse.json({ ok: false, error: "Falta hallazgo." }, { status: 400 });
    }

    const { data: findingRaw, error: readError } = await ctx.admin
      .from("lumenai_research_findings")
      .select("*")
      .eq("business_id", ctx.businessId)
      .eq("id", id)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!findingRaw?.id) {
      return NextResponse.json({ ok: false, error: "Hallazgo no encontrado." }, { status: 404 });
    }

    const finding = findingRaw as Finding;
    const title = cleanText(finding.title, 180) || "Hallazgo Research";
    const summary = cleanText(finding.summary, 900);
    let routeName = "reviewed";
    let result: unknown = { findingId: id };

    if (action === "send_to_radar") {
      routeName = "Radar";
      await ctx.admin.from("market_signals").insert({
        business_id: ctx.businessId,
        title,
        summary,
        impact: cleanText(finding.impact, 80) || "medium",
        severity: cleanText(finding.impact, 40) === "high" ? "warning" : "info",
        recommended_action: cleanText(finding.recommended_action, 500),
        payload: {
          research_finding_id: id,
          source_name: finding.source_name,
          source_url: finding.source_url,
          confidence: finding.confidence,
        },
      });
      result = { routed: routeName };
    }

    if (action === "create_growth") {
      routeName = "Growth";
      const { data, error } = await ctx.admin
        .from("lumenai_opportunities")
        .insert({
          business_id: ctx.businessId,
          title,
          summary,
          intent: cleanText(finding.category, 120) || "research_signal",
          score: Number(finding.confidence ?? 60),
          temperature: Number(finding.confidence ?? 60) >= 75 ? "hot" : "warm",
          priority: cleanText(finding.impact, 40) === "high" ? "high" : "medium",
          status: "open",
          recommended_action:
            cleanText(finding.recommended_action, 500) ||
            "Revisar investigacion y preparar seguimiento.",
          source: "research",
          metadata: { research_finding_id: id, payload: finding.payload ?? {} },
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    if (action === "create_campaign") {
      routeName = "Campaigns";
      const { data, error } = await ctx.admin
        .from("lumenai_campaigns")
        .insert({
          business_id: ctx.businessId,
          user_id: ctx.userId,
          title: `Campana desde Research: ${title}`.slice(0, 140),
          objective: cleanText(finding.recommended_action, 220) || "Activar oportunidad detectada",
          target_audience: "Leads y audiencia relacionada al hallazgo.",
          offer: summary,
          angle: cleanText(finding.category, 180) || "senal de investigacion",
          channels: ["Widget", "WhatsApp"],
          duration_days: 7,
          status: "draft",
          summary,
          metadata: { research_finding_id: id },
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    if (action === "create_investigation") {
      routeName = "Research";
      const { data, error } = await ctx.admin
        .from("lumenai_research_jobs")
        .insert({
          business_id: ctx.businessId,
          user_id: ctx.userId,
          query: `Profundizar: ${title}`,
          scope: "finding",
          priority: cleanText(finding.impact, 40) === "high" ? "high" : "medium",
          status: "queued",
          result: { parent_finding_id: id },
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    if (action === "send_to_config") {
      routeName = "Config AI";
      await ctx.admin.from("lumenai_signal_events").insert({
        business_id: ctx.businessId,
        type: "research_to_config",
        title: "Hallazgo enviado a Config AI",
        description: `${title}. ${cleanText(finding.recommended_action, 420)}`,
        severity: "info",
        payload: {
          research_finding_id: id,
          prompt: `Usa este hallazgo para ajustar LumenAI si aplica: ${title}. ${summary}`,
        },
      });
      result = { routed: routeName };
    }

    if (action === "send_to_eye") {
      routeName = "Lumen Eye";
      await ctx.admin.from("lumenai_signal_events").insert({
        business_id: ctx.businessId,
        type: "research_to_lumen_eye",
        title,
        description: summary,
        severity: cleanText(finding.impact, 40) === "high" ? "warning" : "info",
        payload: { research_finding_id: id, source_url: finding.source_url },
      });
      result = { routed: routeName };
    }

    const routedTo = appendRoute(finding.routed_to, routeName);
    await ctx.admin
      .from("lumenai_research_findings")
      .update({
        routed_to: routedTo,
        status: action === "mark_reviewed" ? "reviewed" : "routed",
      })
      .eq("business_id", ctx.businessId)
      .eq("id", id);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Research Engine",
      actionName: `research.finding.${action || "action"}`,
      payload: { id, action },
      result,
      status: "success",
    });

    return NextResponse.json({ ok: true, result, routedTo });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar la accion del hallazgo.") },
      { status: safeErrorStatus(error) }
    );
  }
}
