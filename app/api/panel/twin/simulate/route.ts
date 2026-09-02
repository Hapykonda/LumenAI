import { NextResponse } from "next/server";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { recordBusinessSnapshot } from "@/lib/ai/lumenite/snapshots";
import {
  asStringArray,
  clampNumber,
  cleanText,
  isObject,
  safeJson,
} from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectScenarioType(input: string) {
  const text = input.toLowerCase();
  if (/precio|valor|subir|bajar|cobrar/.test(text)) return "pricing_change";
  if (/producto|servicio|agregar|nuevo/.test(text)) return "new_product";
  if (/promocion|promoci[oÃ³]n|descuento|oferta/.test(text)) return "promotion";
  if (/cta|whatsapp|boton|bot[oÃ³]n/.test(text)) return "widget_cta";
  if (/tono|vendedor|cercano|formal/.test(text)) return "tone_strategy";
  if (/objecion|objeci[oÃ³]n|precio caro|confianza/.test(text)) return "objection_handling";
  if (/horario|agenda/.test(text)) return "schedule_change";
  if (/campana|campa[nÃ±]a/.test(text)) return "campaign_idea";
  return "market_response";
}

function fallbackReport(input: string, snapshot: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>) {
  const missing = snapshot.missingData;

  return {
    title: cleanText(input, 80) || "Simulacion comercial",
    scenario_type: detectScenarioType(input),
    summary: "Simulacion razonada con los datos disponibles del negocio.",
    current_state: {
      leads: snapshot.leads.length,
      knowledge_published: snapshot.stats.knowledgePublished,
      opportunities: snapshot.stats.openOpportunities,
    },
    proposed_change: { instruction: input },
    assumptions: [
      "El impacto real debe validarse con conversaciones y leads posteriores.",
      "No hay prediccion exacta; se entrega una recomendacion comercial razonada.",
    ],
    expected_impact:
      missing.length > 1
        ? "Impacto moderado: primero conviene reforzar datos base antes de aplicar fuerte."
        : "Impacto positivo si se prueba por 7 dias y se mide respuesta de leads.",
    risks:
      missing.length > 1
        ? `Riesgo por datos faltantes: ${missing.join(", ")}.`
        : "Riesgo bajo si se aplica como prueba controlada.",
    opportunities:
      "Puede mejorar claridad de oferta, conversion del widget y velocidad de seguimiento.",
    recommendation:
      "Aplicar como experimento por 7 dias, medir leads y preparar rollback si baja la calidad.",
    confidence: Math.max(45, 82 - missing.length * 10),
    missing_data: missing,
    next_actions: [
      {
        type: "send_to_config_ia",
        label: "Enviar a Config AI",
        description: "Preparar cambios como prompt aplicable.",
        payload: { prompt: input },
      },
      {
        type: "save_followup",
        label: "Crear seguimiento",
        description: "Revisar resultados despues de 7 dias.",
        payload: { days: 7 },
      },
    ],
  };
}

function sanitizeReport(raw: unknown, fallback: ReturnType<typeof fallbackReport>) {
  const value = isObject(raw) ? raw : {};

  return {
    title: cleanText(value.title, 120) || fallback.title,
    scenario_type: cleanText(value.scenario_type, 60) || fallback.scenario_type,
    summary: cleanText(value.summary, 800) || fallback.summary,
    current_state: isObject(value.current_state) ? value.current_state : fallback.current_state,
    proposed_change: isObject(value.proposed_change)
      ? value.proposed_change
      : fallback.proposed_change,
    assumptions: Array.isArray(value.assumptions)
      ? value.assumptions
      : fallback.assumptions,
    expected_impact: cleanText(value.expected_impact, 900) || fallback.expected_impact,
    risks: cleanText(value.risks, 900) || fallback.risks,
    opportunities: cleanText(value.opportunities, 900) || fallback.opportunities,
    recommendation: cleanText(value.recommendation, 900) || fallback.recommendation,
    confidence: clampNumber(value.confidence, fallback.confidence),
    missing_data: asStringArray(value.missing_data, 8, 160).length
      ? asStringArray(value.missing_data, 8, 160)
      : fallback.missing_data,
    next_actions: Array.isArray(value.next_actions)
      ? value.next_actions.slice(0, 8)
      : fallback.next_actions,
    raw_result: value,
  };
}

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const input = cleanText(body?.input || body?.scenario || body?.message, 2400);

    if (!input) {
      return NextResponse.json({ ok: false, error: "Describe el escenario a simular." }, { status: 400 });
    }

    const snapshot = await buildLumeniteBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      publicKey: ctx.business.public_key,
    });
    const fallback = fallbackReport(input, snapshot);
    const aiText = await callGroqChat({
      purpose: "calibration",
      responseFormat: "json_object",
      temperature: 0.2,
      maxTokens: 1800,
      messages: [
        {
          role: "system",
          content:
            "Eres LumenAI Business Twin. Simula decisiones comerciales con supuestos, riesgos, oportunidad, confianza y acciones. No prometas predicciones exactas. Devuelve JSON con title, scenario_type, summary, current_state, proposed_change, assumptions, expected_impact, risks, opportunities, recommendation, confidence, missing_data, next_actions.",
        },
        {
          role: "user",
          content: JSON.stringify({
            scenario: input,
            business: snapshot.business,
            stats: snapshot.stats,
            missingData: snapshot.missingData,
            knowledge: snapshot.knowledge.slice(0, 32),
            leads: snapshot.leads.slice(0, 24),
            opportunities: snapshot.opportunities.slice(0, 24),
            campaigns: snapshot.campaigns.slice(0, 12),
          }),
        },
      ],
    });
    const generationMode = aiText ? "ai" : "evidence_rules";
    const sanitizedReport = sanitizeReport(safeJson(aiText, {}), fallback);
    const report = {
      ...sanitizedReport,
      raw_result: {
        ...sanitizedReport.raw_result,
        generation_mode: generationMode,
      },
    };

    await recordBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      snapshot,
      source: "business_twin",
    });

    const { data: scenario, error: scenarioError } = await ctx.admin
      .from("lumenai_business_scenarios")
      .insert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        title: report.title,
        scenario_type: report.scenario_type,
        input,
        current_state: report.current_state,
        proposed_change: report.proposed_change,
        assumptions: report.assumptions,
        confidence: report.confidence,
        status: "simulated",
      })
      .select("*")
      .maybeSingle();

    if (scenarioError) throw new Error(scenarioError.message);

    const { data: simulationReport, error: reportError } = await ctx.admin
      .from("lumenai_simulation_reports")
      .insert({
        business_id: ctx.businessId,
        scenario_id: scenario?.id ?? null,
        summary: report.summary,
        expected_impact: report.expected_impact,
        risks: report.risks,
        opportunities: report.opportunities,
        recommendation: report.recommendation,
        next_actions: report.next_actions,
        missing_data: report.missing_data,
        confidence: report.confidence,
        raw_result: report.raw_result,
      })
      .select("*")
      .maybeSingle();

    if (reportError) throw new Error(reportError.message);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Business Twin Agent",
      actionName: "twin.simulate",
      payload: { input },
      result: { scenarioId: scenario?.id, reportId: simulationReport?.id },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("calibration"),
      generationMode,
      scenario,
      report: simulationReport,
      generated: report,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo simular escenario.") },
      { status: safeErrorStatus(error) }
    );
  }
}


