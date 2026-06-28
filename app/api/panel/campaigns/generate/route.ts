import { NextResponse } from "next/server";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import {
  clampNumber,
  cleanText,
  isObject,
  safeJson,
} from "@/lib/ai/lumenite/schemas";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function fallbackCampaign(input: {
  instruction: string;
  objective: string;
  channel: string;
  durationDays: number;
  businessName: string;
}) {
  const objective = input.objective || "generar consultas";
  const title = cleanText(input.instruction, 80) || `Campana ${objective}`;
  const whatsapp =
    `Hola, soy de ${input.businessName}. Tenemos una propuesta para ayudarte con ${objective}. ` +
    "Si quieres, te explico opciones, precios y siguiente paso en pocos mensajes.";

  return {
    campaign: {
      title,
      objective,
      target_audience: "Leads recientes y clientes con interes comercial.",
      offer: "Propuesta clara con CTA a WhatsApp y seguimiento manual.",
      angle: "Claridad, rapidez y acompanamiento consultivo.",
      channels: input.channel === "todos" ? ["WhatsApp", "Instagram", "Widget"] : [input.channel],
      duration_days: input.durationDays,
      summary: "Campana lista para copiar mensajes y preparar ajustes del widget.",
    },
    assets: [
      {
        asset_type: "whatsapp_message",
        channel: "WhatsApp",
        title: "Mensaje inicial",
        content: whatsapp,
        variant: "A",
      },
      {
        asset_type: "whatsapp_followup",
        channel: "WhatsApp",
        title: "Follow-up",
        content:
          "Te escribo para dar seguimiento. Si todavia te interesa, puedo dejarte una recomendacion concreta y los pasos para avanzar.",
        variant: "A",
      },
      {
        asset_type: "widget_greeting",
        channel: "Widget",
        title: "Greeting temporal",
        content: "Hola, puedo ayudarte a elegir la mejor opcion y dejar todo listo para avanzar.",
        variant: "A",
      },
    ],
    tasks: [
      {
        title: "Copiar mensaje inicial a leads calientes",
        description: "Usar el mensaje de WhatsApp con leads recientes.",
        channel: "WhatsApp",
        priority: "high",
      },
      {
        title: "Enviar campana a Config IA",
        description: "Preparar greeting y CTA temporal del widget.",
        channel: "Widget",
        priority: "medium",
      },
    ],
    experiments: [
      {
        name: "CTA directo vs consultivo",
        hypothesis: "Un CTA claro a WhatsApp puede subir consultas calificadas.",
        metric: "consultas",
        variant_a: { cta: "Hablar por WhatsApp" },
        variant_b: { cta: "Recibir recomendacion" },
      },
    ],
    recommendations: ["No hay envio automatico conectado; las piezas quedan como drafts manuales."],
  };
}

function sanitizeGenerated(raw: unknown, fallback: ReturnType<typeof fallbackCampaign>) {
  const value = isObject(raw) ? raw : {};
  const rawCampaign = isObject(value.campaign) ? value.campaign : {};
  const campaign = {
    title: cleanText(rawCampaign.title, 140) || fallback.campaign.title,
    objective: cleanText(rawCampaign.objective, 200) || fallback.campaign.objective,
    target_audience:
      cleanText(rawCampaign.target_audience, 300) || fallback.campaign.target_audience,
    offer: cleanText(rawCampaign.offer, 500) || fallback.campaign.offer,
    angle: cleanText(rawCampaign.angle, 500) || fallback.campaign.angle,
    channels: asArray(rawCampaign.channels)
      .map((item) => cleanText(item, 40))
      .filter(Boolean)
      .slice(0, 6),
    duration_days: clampNumber(rawCampaign.duration_days, fallback.campaign.duration_days, 1, 90),
    summary: cleanText(rawCampaign.summary, 800) || fallback.campaign.summary,
  };

  if (!campaign.channels.length) campaign.channels = fallback.campaign.channels;

  const assets = asArray(value.assets)
    .map((item) => {
      if (!isObject(item)) return null;
      const content = cleanText(item.content, 2200);
      if (!content) return null;
      return {
        asset_type: cleanText(item.asset_type, 60) || "copy",
        channel: cleanText(item.channel, 60),
        title: cleanText(item.title, 140) || "Pieza de campana",
        content,
        variant: cleanText(item.variant, 30) || "A",
      };
    })
    .filter(Boolean);
  const tasks = asArray(value.tasks)
    .map((item) => {
      if (!isObject(item)) return null;
      const title = cleanText(item.title, 160);
      if (!title) return null;
      return {
        title,
        description: cleanText(item.description, 600),
        channel: cleanText(item.channel, 60),
        priority: cleanText(item.priority, 40) || "medium",
      };
    })
    .filter(Boolean);
  const experiments = asArray(value.experiments)
    .map((item) => {
      if (!isObject(item)) return null;
      const name = cleanText(item.name, 160);
      if (!name) return null;
      return {
        name,
        hypothesis: cleanText(item.hypothesis, 600),
        metric: cleanText(item.metric, 120),
        variant_a: isObject(item.variant_a) ? item.variant_a : {},
        variant_b: isObject(item.variant_b) ? item.variant_b : {},
      };
    })
    .filter(Boolean);

  return {
    campaign,
    assets: assets.length ? assets.slice(0, 18) : fallback.assets,
    tasks: tasks.length ? tasks.slice(0, 10) : fallback.tasks,
    experiments: experiments.length ? experiments.slice(0, 6) : fallback.experiments,
    recommendations: asArray(value.recommendations)
      .map((item) => cleanText(item, 220))
      .filter(Boolean)
      .slice(0, 8),
  };
}

export async function POST(req: Request) {
  try {
    const ctx = await requireLumeniteBusiness();
    const body = await req.json().catch(() => ({}));
    const instruction = cleanText(body?.instruction || body?.message, 2400);
    const objective = cleanText(body?.objective, 120) || "generar consultas";
    const channel = cleanText(body?.channel, 60) || "WhatsApp";
    const durationDays = clampNumber(body?.duration_days, 7, 1, 90);

    if (!instruction) {
      return NextResponse.json({ ok: false, error: "Describe la campana a crear." }, { status: 400 });
    }

    const snapshot = await buildLumeniteBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      publicKey: ctx.business.public_key,
    });
    const fallback = fallbackCampaign({
      instruction,
      objective,
      channel,
      durationDays,
      businessName: snapshot.business.name,
    });
    const aiText = await callGroqChat({
      purpose: "campaigns",
      responseFormat: "json_object",
      temperature: 0.24,
      maxTokens: 2200,
      messages: [
        {
          role: "system",
          content:
            "Eres Lumenite Campaign Studio. Crea campanas comerciales concretas con assets listos para copiar. No digas que enviaste mensajes. Devuelve JSON: {campaign, assets, tasks, experiments, recommendations}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction,
            objective,
            channel,
            durationDays,
            business: snapshot.business,
            knowledge: snapshot.knowledge.slice(0, 30),
            leads: snapshot.leads.slice(0, 30),
            opportunities: snapshot.opportunities.slice(0, 20),
            scenarios: snapshot.scenarios.slice(0, 10),
          }),
        },
      ],
    });
    const generated = sanitizeGenerated(safeJson(aiText, {}), fallback);
    const { data: campaign, error: campaignError } = await ctx.admin
      .from("lumenai_campaigns")
      .insert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        title: generated.campaign.title,
        objective: generated.campaign.objective,
        target_audience: generated.campaign.target_audience,
        offer: generated.campaign.offer,
        angle: generated.campaign.angle,
        channels: generated.campaign.channels,
        duration_days: generated.campaign.duration_days,
        status: "ready",
        summary: generated.campaign.summary,
        metadata: {
          source: aiText ? "lumenite_ai" : "fallback",
          recommendations: generated.recommendations,
        },
      })
      .select("*")
      .maybeSingle();

    if (campaignError) throw new Error(campaignError.message);

    const campaignId = campaign?.id as string | undefined;
    const [assets, tasks, experiments] = await Promise.all([
      campaignId
        ? ctx.admin
            .from("lumenai_campaign_assets")
            .insert(
              generated.assets.map((asset) => ({
                business_id: ctx.businessId,
                campaign_id: campaignId,
                ...asset,
              }))
            )
            .select("*")
        : Promise.resolve({ data: [], error: null }),
      campaignId
        ? ctx.admin
            .from("lumenai_campaign_tasks")
            .insert(
              generated.tasks.map((task) => ({
                business_id: ctx.businessId,
                campaign_id: campaignId,
                ...task,
              }))
            )
            .select("*")
        : Promise.resolve({ data: [], error: null }),
      campaignId
        ? ctx.admin
            .from("lumenai_campaign_experiments")
            .insert(
              generated.experiments.map((experiment) => ({
                business_id: ctx.businessId,
                campaign_id: campaignId,
                ...experiment,
              }))
            )
            .select("*")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (assets.error) throw new Error(assets.error.message);
    if (tasks.error) throw new Error(tasks.error.message);
    if (experiments.error) throw new Error(experiments.error.message);

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Campaign Studio Agent",
      actionName: "campaigns.generate",
      payload: { instruction, objective, channel, durationDays },
      result: {
        campaignId,
        assets: Array.isArray(assets.data) ? assets.data.length : 0,
        tasks: Array.isArray(tasks.data) ? tasks.data.length : 0,
        experiments: Array.isArray(experiments.data) ? experiments.data.length : 0,
      },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("campaigns"),
      campaign,
      assets: assets.data ?? [],
      tasks: tasks.data ?? [],
      experiments: experiments.data ?? [],
      generated,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo generar campana.") },
      { status: safeErrorStatus(error) }
    );
  }
}
