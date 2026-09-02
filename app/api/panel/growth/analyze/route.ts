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

type OpportunityDraft = {
  lead_id?: string | null;
  chat_id?: string | null;
  title: string;
  summary: string;
  intent?: string | null;
  product_or_service?: string | null;
  objection?: string | null;
  score: number;
  temperature: "cold" | "warm" | "hot";
  priority: "low" | "medium" | "high";
  recommended_action: string;
  suggested_message: string;
};

function leadTitle(lead: Record<string, unknown>) {
  return (
    cleanText(lead.name, 80) ||
    cleanText(lead.intent, 100) ||
    cleanText(lead.phone, 80) ||
    cleanText(lead.email, 100) ||
    "Oportunidad comercial"
  );
}

function temperature(score: number): "cold" | "warm" | "hot" {
  if (score >= 75) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

function fallbackOpportunities(snapshot: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>) {
  const leads = snapshot.leads.slice(0, 12);
  const drafts: OpportunityDraft[] = leads.map((lead) => {
    const score = clampNumber(lead.score, 50);
    const title = leadTitle(lead);
    const intent = cleanText(lead.intent, 140) || cleanText(lead.summary, 140);

    return {
      lead_id: cleanText(lead.id, 80) || null,
      chat_id: cleanText(lead.chat_id, 80) || null,
      title: `Seguimiento: ${title}`,
      summary:
        cleanText(lead.summary, 420) ||
        `Lead con interes ${intent || "comercial"} y score ${score}%.`,
      intent: intent || null,
      product_or_service: intent || null,
      objection: cleanText(
        isObject(lead.metadata) ? lead.metadata.objection || lead.metadata.objections : "",
        120
      ) || null,
      score,
      temperature: temperature(score),
      priority: score >= 75 ? "high" : score >= 45 ? "medium" : "low",
      recommended_action:
        score >= 75
          ? "Responder hoy con propuesta clara y CTA de cierre."
          : "Enviar seguimiento consultivo y confirmar necesidad.",
      suggested_message: `Hola${cleanText(lead.name, 60) ? ` ${cleanText(lead.name, 60)}` : ""}, vi tu consulta sobre ${intent || "nuestro servicio"}. Puedo ayudarte con una recomendacion clara y los siguientes pasos. Â¿Quieres que lo revisemos ahora?`,
    };
  });

  if (!drafts.length && snapshot.chats.length) {
    return snapshot.chats.slice(0, 8).map((chat) => ({
      lead_id: null,
      chat_id: cleanText(chat.id, 80) || null,
      title: `Revisar chat: ${cleanText(chat.title, 80) || "Cliente del widget"}`,
      summary: "Conversacion reciente sin oportunidad registrada. Conviene revisar contexto y capturar datos.",
      intent: "seguimiento",
      product_or_service: null,
      objection: null,
      score: chat.unread_owner ? 62 : 42,
      temperature: chat.unread_owner ? "warm" : "cold",
      priority: chat.unread_owner ? "medium" : "low",
      recommended_action: "Abrir conversacion y confirmar datos de contacto.",
      suggested_message: "Hola, gracias por escribir. Para ayudarte mejor, cuentame que necesitas y te dejo una recomendacion concreta.",
    })) satisfies OpportunityDraft[];
  }

  return drafts;
}

function sanitizeDrafts(raw: unknown, fallback: OpportunityDraft[]) {
  const items = isObject(raw) && Array.isArray(raw.opportunities)
    ? raw.opportunities
    : Array.isArray(raw)
    ? raw
    : [];

  const drafts = items
    .map((item): OpportunityDraft | null => {
      if (!isObject(item)) return null;
      const title = cleanText(item.title, 140);
      const summary = cleanText(item.summary, 600);
      if (!title || !summary) return null;
      const score = clampNumber(item.score, 50);

      return {
        lead_id: cleanText(item.lead_id, 80) || null,
        chat_id: cleanText(item.chat_id, 80) || null,
        title,
        summary,
        intent: cleanText(item.intent, 140) || null,
        product_or_service: cleanText(item.product_or_service, 140) || null,
        objection: cleanText(item.objection, 160) || null,
        score,
        temperature: temperature(score),
        priority:
          cleanText(item.priority, 30) === "high"
            ? "high"
            : cleanText(item.priority, 30) === "low"
            ? "low"
            : score >= 75
            ? "high"
            : "medium",
        recommended_action:
          cleanText(item.recommended_action, 420) ||
          "Crear seguimiento comercial manual.",
        suggested_message:
          cleanText(item.suggested_message, 1200) ||
          "Hola, vi tu consulta y puedo ayudarte con una recomendacion concreta.",
      };
    })
    .filter(Boolean) as OpportunityDraft[];

  return drafts.length ? drafts.slice(0, 12) : fallback;
}

export async function POST() {
  try {
    const ctx = await requireLumeniteBusiness();
    const snapshot = await buildLumeniteBusinessSnapshot({
      admin: ctx.admin,
      businessId: ctx.businessId,
      businessName: ctx.business.name,
      publicKey: ctx.business.public_key,
    });
    const fallback = fallbackOpportunities(snapshot);
    const aiText = await callGroqChat({
      purpose: "lumen-eye",
      responseFormat: "json_object",
      temperature: 0.18,
      maxTokens: 1600,
      messages: [
        {
          role: "system",
          content:
            "Eres LumenAI Growth Engine. Detecta oportunidades comerciales desde datos reales. Devuelve JSON con opportunities: [{lead_id, chat_id, title, summary, intent, product_or_service, objection, score, priority, recommended_action, suggested_message}]. No inventes integraciones externas.",
        },
        {
          role: "user",
          content: JSON.stringify({
            business: snapshot.business,
            leads: snapshot.leads.slice(0, 30),
            chats: snapshot.chats.slice(0, 20),
            messages: snapshot.messages.slice(0, 80),
            knowledge: snapshot.knowledge.slice(0, 24),
            existingOpportunities: snapshot.opportunities.slice(0, 30),
          }),
        },
      ],
    });
    const drafts = sanitizeDrafts(safeJson(aiText, {}), fallback);
    const inserted: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const draft of drafts) {
      const existing = await ctx.admin
        .from("lumenai_opportunities")
        .select("id")
        .eq("business_id", ctx.businessId)
        .eq("title", draft.title)
        .in("status", ["open", "active", "new"])
        .limit(1)
        .maybeSingle();

      if (existing.data?.id) continue;

      const { data, error } = await ctx.admin
        .from("lumenai_opportunities")
        .insert({
          business_id: ctx.businessId,
          lead_id: draft.lead_id,
          chat_id: draft.chat_id,
          title: draft.title,
          summary: draft.summary,
          intent: draft.intent,
          product_or_service: draft.product_or_service,
          objection: draft.objection,
          score: draft.score,
          temperature: draft.temperature,
          priority: draft.priority,
          status: "open",
          recommended_action: draft.recommended_action,
          suggested_message: draft.suggested_message,
          source: aiText ? "lumenite_ai" : "heuristic",
          metadata: { analyzed_at: now },
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) inserted.push(data);
    }

    if (inserted.length) {
      await ctx.admin.from("lumenai_signal_events").insert(
        inserted.slice(0, 6).map((item) => ({
          business_id: ctx.businessId,
          lead_id: item.lead_id ?? null,
          chat_id: item.chat_id ?? null,
          type: "growth_opportunity",
          title: item.title,
          description: item.summary,
          severity: Number(item.score ?? 0) >= 75 ? "warning" : "info",
          payload: item,
        }))
      );
    }

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "Growth Engine Agent",
      actionName: "growth.analyze",
      payload: { leads: snapshot.leads.length, chats: snapshot.chats.length },
      result: { inserted: inserted.length, proposed: drafts.length },
      status: "success",
    });

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("lumen-eye"),
      generationMode: aiText ? "ai" : "evidence_rules",
      inserted,
      proposed: drafts,
      message: inserted.length
        ? `LumenAI detecto ${inserted.length} oportunidad(es) nueva(s).`
        : "No se detectaron oportunidades nuevas sin duplicar.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo analizar Growth.") },
      { status: safeErrorStatus(error) }
    );
  }
}


