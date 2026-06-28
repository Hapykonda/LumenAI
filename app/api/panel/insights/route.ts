import { NextResponse } from "next/server";
import {
  getOrCreateCalibrationRow,
  jsonError,
  requireUserBusiness,
} from "../calibration/_lib";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignalTone = "good" | "warn" | "risk" | "info";

type RadarSignal = {
  label: string;
  value: string;
  tone: SignalTone;
};

type RadarAction = {
  title: string;
  detail: string;
  href: string;
};

function clean(value: unknown, max = 700) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function pct(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

function countStatus(items: Array<{ status?: string | null }>, status: string) {
  return items.filter((item) => item.status === status).length;
}

function fallbackNarrative(input: {
  launchPercent: number;
  businessName: string;
  hotLeads: number;
  unreadChats: number;
  publishedKb: number;
  missing: string[];
}) {
  if (input.launchPercent < 60) {
    return {
      headline: "El sistema todavia necesita base antes de vender fuerte.",
      brief:
        "Prioriza Knowledge, contacto y publicacion del widget. Con eso LumenAI puede responder con mas precision y captar leads sin improvisar.",
    };
  }

  if (input.hotLeads > 0 || input.unreadChats > 0) {
    return {
      headline: "Hay oportunidades activas que conviene revisar ahora.",
      brief:
        "El panel detecta actividad comercial reciente. Revisa chats, leads calientes y objeciones antes de ajustar campanas o automatizaciones.",
    };
  }

  return {
    headline: `${input.businessName} esta listo para optimizar conversion.`,
    brief:
      "La base operativa esta estable. El siguiente salto es mejorar cierre, objeciones, seguimiento y microcopy del widget.",
  };
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function decodeXml(value: string) {
  return clean(value, 500)
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchMarketNews() {
  const query = encodeURIComponent("AI ecommerce sales automation market");
  const url = `https://news.google.com/rss/search?q=${query}&hl=es-419&gl=US&ceid=US:es-419`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LumenAI-Radar/1.0",
      },
      signal: AbortSignal.timeout(4200),
      next: { revalidate: 900 },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 5)
      .map((match) => {
        const block = match[1] || "";
        const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
        const link = decodeXml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
        const pubDate = decodeXml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
        const [headline, source] = title.split(" - ").reduce(
          (acc, part, index, arr) => {
            if (index === arr.length - 1 && arr.length > 1) return [acc[0], part];
            return [acc[0] ? `${acc[0]} - ${part}` : part, acc[1]];
          },
          ["", ""] as [string, string]
        );

        return {
          headline: clean(headline || title, 180),
          source: clean(source || "Google News", 80),
          link,
          pubDate,
        };
      })
      .filter((item) => item.headline);

    return items;
  } catch {
    return [];
  }
}

async function readPersistedMarketItems(input: {
  admin: Awaited<ReturnType<typeof requireUserBusiness>>["admin"];
  businessId: string;
}) {
  const { admin, businessId } = input;
  if (!admin) return [];

  try {
    const { data, error } = await admin
      .from("market_items")
      .select("title,url,summary,source,published_at,created_at")
      .eq("business_id", businessId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !Array.isArray(data)) return [];

    return data
      .map((item) => ({
        headline: clean(item.title, 180),
        source: clean(item.source || "Fuente conectada", 80),
        link: clean(item.url, 500),
        pubDate: clean(item.published_at || item.created_at, 80),
        summary: clean(item.summary, 240),
        persisted: true,
      }))
      .filter((item) => item.headline);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const businessId = ctx.business.id as string;

    const [
      calibration,
      kbResult,
      leadsResult,
      chatsResult,
      messagesResult,
      automationResult,
    ] = await Promise.all([
      getOrCreateCalibrationRow({
        admin: ctx.admin,
        businessId,
        publicKey: ctx.business.public_key,
      }),
      ctx.admin
        .from("business_kb")
        .select("type,title,is_published,updated_at")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(120),
      ctx.admin
        .from("leads")
        .select("status,score,intent,summary,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(80),
      ctx.admin
        .from("chats")
        .select("channel,unread_owner,human_takeover,updated_at")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(80),
      ctx.admin
        .from("chat_messages")
        .select("sender_type,content,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(40),
      ctx.admin
        .from("lumenai_automation_rules")
        .select("enabled")
        .eq("business_id", businessId)
        .limit(40),
    ]);

    const kb = Array.isArray(kbResult.data) ? kbResult.data : [];
    const leads = Array.isArray(leadsResult.data) ? leadsResult.data : [];
    const chats = Array.isArray(chatsResult.data) ? chatsResult.data : [];
    const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];
    const automations = Array.isArray(automationResult.data)
      ? automationResult.data
      : [];
    const publishedKb = kb.filter((item) => item.is_published);
    const draft = calibration.draft;
    const widgetEnabled = Boolean(draft.widget?.widgetEnabled);
    const hasContact = Boolean(clean(draft.widget?.whatsapp) || clean(draft.widget?.email));
    const enabledAutomations = automations.filter((item) => item.enabled).length;
    const hotLeads = leads.filter((lead) => Number(lead.score ?? 0) >= 70).length;
    const unreadChats = chats.filter((chat) => Boolean(chat.unread_owner)).length;
    const wonLeads = countStatus(leads, "won");
    const missing = [
      publishedKb.length ? "" : "Knowledge publicado",
      hasContact ? "" : "contacto de cierre",
      widgetEnabled ? "" : "widget activo",
      enabledAutomations ? "" : "automatizaciones",
    ].filter(Boolean);
    const launchPercent = pct(4 - missing.length, 4);
    const fallback = fallbackNarrative({
      launchPercent,
      businessName: clean(ctx.business.name, 80) || "Tu negocio",
      hotLeads,
      unreadChats,
      publishedKb: publishedKb.length,
      missing,
    });
    const signals: RadarSignal[] = [
      {
        label: "Sistema",
        value: `${launchPercent}%`,
        tone: launchPercent >= 75 ? "good" : launchPercent >= 50 ? "warn" : "risk",
      },
      {
        label: "Leads hot",
        value: String(hotLeads),
        tone: hotLeads ? "warn" : "info",
      },
      {
        label: "Knowledge",
        value: `${publishedKb.length}/${Math.max(kb.length, 1)}`,
        tone: publishedKb.length ? "good" : "risk",
      },
      {
        label: "Chats",
        value: unreadChats ? `${unreadChats} sin leer` : "al dia",
        tone: unreadChats ? "warn" : "good",
      },
    ];
    const actions: RadarAction[] = [];

    if (!publishedKb.length) {
      actions.push({
        title: "Completar Knowledge",
        detail: "Carga servicios, precios, pagos y politicas para que LumenAI responda sin inventar.",
        href: "/panel/knowledge",
      });
    }

    if (!widgetEnabled || !hasContact) {
      actions.push({
        title: "Dejar widget publicable",
        detail: "Activa canal publico, contacto y saludo antes de llevar trafico real.",
        href: "/panel/widget",
      });
    }

    if (hotLeads || unreadChats) {
      actions.push({
        title: "Revisar oportunidades",
        detail: "Hay actividad que puede necesitar respuesta humana, cierre o seguimiento.",
        href: hotLeads ? "/panel/leads" : "/panel/chat",
      });
    }

    if (!actions.length) {
      actions.push({
        title: "Optimizar calibracion",
        detail: "Ajusta objeciones, tono y cierre para mejorar conversion sin cambiar estructura.",
        href: "/panel/calibration",
      });
    }

    const persistedMarket = await readPersistedMarketItems({
      admin: ctx.admin,
      businessId,
    });
    const marketNews = persistedMarket.length ? persistedMarket : await fetchMarketNews();

    const aiText = await callGroqChat({
      purpose: "panel",
      responseFormat: "json_object",
      temperature: 0.22,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Eres Lumen Radar, asistente ejecutivo de panel potenciado por Lumenite. Das insights breves, accionables y honestos. Usa noticias externas solo si vienen en marketNews. Responde JSON: {headline, brief, marketNotes}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            business: ctx.business.name || "Tu negocio",
            readiness: launchPercent,
            missing,
            signals,
            leads: {
              total: leads.length,
              hot: hotLeads,
              won: wonLeads,
              recentIntents: leads.slice(0, 8).map((lead) => ({
                intent: lead.intent,
                summary: clean(lead.summary, 180),
              })),
            },
            chats: {
              total: chats.length,
              unread: unreadChats,
              recentMessages: messages.slice(0, 8).map((item) => ({
                from: item.sender_type,
                content: clean(item.content, 180),
              })),
            },
            knowledge: kb.slice(0, 12).map((item) => ({
              type: item.type,
              title: item.title,
              published: item.is_published,
            })),
            marketNews,
            currentAdvice:
              marketNews.length > 0
                ? "Cruza las noticias externas con el estado del panel. No exageres ni inventes datos."
                : "Si no hay noticias externas disponibles, explica que Radar usa senales internas y mejores practicas.",
          }),
        },
      ],
    });

    const ai = safeJson<{
      headline?: string;
      brief?: string;
      marketNotes?: string[];
    }>(aiText, {});

    return NextResponse.json({
      ok: true,
      assistant: {
        name: "Lumen Radar",
        role: "Asistente de insights del panel",
        ai: getGroqStatus("panel"),
      },
      headline: clean(ai.headline, 140) || fallback.headline,
      brief: clean(ai.brief, 460) || fallback.brief,
      signals,
      actions: actions.slice(0, 3),
      marketNotes:
        Array.isArray(ai.marketNotes) && ai.marketNotes.length
          ? ai.marketNotes.map((item) => clean(item, 220)).filter(Boolean).slice(0, 3)
          : marketNews.length
          ? marketNews
              .slice(0, 3)
              .map((item) => `${item.headline}${item.source ? ` (${item.source})` : ""}`)
          : [
              "Radar operativo activo: usa datos internos del panel.",
              "Noticias externas no disponibles en este momento; se mantiene lectura interna del sistema.",
            ],
      marketNews,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "Error cargando Radar",
      500
    );
  }
}
