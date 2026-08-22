import { cleanText, clampNumber, isObject } from "@/lib/ai/lumenite/schemas";
import type { LumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";

export type ResearchNewsItem = {
  headline: string;
  source: string;
  link: string;
  pubDate: string;
  summary?: string;
};

export type ResearchFindingDraft = {
  title: string;
  summary: string;
  category: string;
  impact: string;
  confidence: number;
  evidence: Array<Record<string, unknown>>;
  source_name?: string | null;
  source_url?: string | null;
  recommended_action: string;
  payload?: Record<string, unknown>;
};

export type ResearchReportDraft = {
  title: string;
  summary: string;
  sections: Array<Record<string, unknown>>;
  recommendations: string[];
};

type QueryResult<T> = PromiseLike<{
  data: T[] | null;
  error: { message?: string } | null;
}>;

export function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function optionalQuery<T>(query: QueryResult<T>) {
  const { data, error } = await query;
  if (error) return [];
  return list<T>(data);
}

function decodeXml(value: string) {
  return cleanText(value, 900)
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchResearchNews(query: string) {
  const safeQuery = cleanText(query, 220) || "AI business automation sales";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(safeQuery)}&hl=es-419&gl=US&ceid=US:es-419`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LumenAI-Research/1.0" },
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 900 },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 8)
      .map((match) => {
        const block = match[1] || "";
        const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
        const link = decodeXml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
        const pubDate = decodeXml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
        const description = decodeXml(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");
        const parts = title.split(" - ");
        const source = parts.length > 1 ? parts[parts.length - 1] : "Google News";
        const headline = parts.length > 1 ? parts.slice(0, -1).join(" - ") : title;

        return {
          headline: cleanText(headline || title, 220),
          source: cleanText(source, 90),
          link,
          pubDate,
          summary: cleanText(description.replace(/<[^>]*>/g, " "), 260),
        };
      })
      .filter((item) => item.headline);
  } catch {
    return [];
  }
}

export function fallbackResearchOutput(input: {
  query: string;
  snapshot: LumeniteBusinessSnapshot;
  news: ResearchNewsItem[];
}) {
  const { query, snapshot, news } = input;
  const findings: ResearchFindingDraft[] = [];

  if (snapshot.stats.hotLeads > 0) {
    findings.push({
      title: "Leads calientes detectados para investigar cierre",
      summary:
        "El panel tiene leads con score alto. Conviene analizar objeciones, tiempos de respuesta y propuesta comercial antes de lanzar una campana.",
      category: "lead_signal",
      impact: "high",
      confidence: 82,
      evidence: snapshot.leads.slice(0, 5).map((lead) => ({
        id: lead.id,
        intent: lead.intent,
        score: lead.score,
        summary: cleanText(lead.summary, 220),
      })),
      recommended_action: "Crear oportunidad Growth y preparar follow-up consultivo.",
      payload: { hotLeads: snapshot.stats.hotLeads },
    });
  }

  if (snapshot.stats.unreadChats > 0) {
    findings.push({
      title: "Conversaciones pendientes con potencial comercial",
      summary:
        "Hay chats sin leer o con posible takeover humano. Una demora puede bajar conversion si el lead ya mostro intencion.",
      category: "conversation_signal",
      impact: "medium",
      confidence: 76,
      evidence: snapshot.chats.slice(0, 5).map((chat) => ({
        id: chat.id,
        title: chat.title,
        unread_owner: chat.unread_owner,
        human_takeover: chat.human_takeover,
      })),
      recommended_action: "Enviar a Lumen Eye o Pulse para priorizar zona, caso y respuesta.",
      payload: { unreadChats: snapshot.stats.unreadChats },
    });
  }

  for (const item of news.slice(0, 3)) {
    findings.push({
      title: item.headline,
      summary:
        item.summary ||
        "Noticia externa relevante para comparar con el estado comercial del negocio.",
      category: "market_signal",
      impact: "medium",
      confidence: 68,
      evidence: [{ source: item.source, url: item.link, published_at: item.pubDate }],
      source_name: item.source,
      source_url: item.link,
      recommended_action: "Enviar a Pulse para convertirlo en senal ejecutiva.",
      payload: { query },
    });
  }

  if (!findings.length) {
    findings.push({
      title: "Base de investigacion lista para operar",
      summary:
        "No hay suficientes datos internos aun. El siguiente paso es conectar fuentes, activar widget y acumular conversaciones reales.",
      category: "system_gap",
      impact: "medium",
      confidence: 60,
      evidence: [{ missingData: snapshot.missingData }],
      recommended_action: "Crear fuentes de investigacion y conectar datos reales del negocio.",
      payload: { missingData: snapshot.missingData },
    });
  }

  const recommendations = findings
    .slice(0, 5)
    .map((finding) => finding.recommended_action)
    .filter(Boolean);

  return {
    findings,
    report: {
      title: cleanText(query, 120) || "Investigacion operativa",
      summary:
        "Research Engine cruzo datos internos, senales comerciales y fuentes externas disponibles para preparar decisiones accionables.",
      sections: [
        {
          title: "Estado interno",
          body: {
            hotLeads: snapshot.stats.hotLeads,
            openOpportunities: snapshot.stats.openOpportunities,
            unreadChats: snapshot.stats.unreadChats,
            activeCampaigns: snapshot.stats.activeCampaigns,
          },
        },
        {
          title: "Fuentes externas",
          body: news.slice(0, 5),
        },
      ],
      recommendations,
    } satisfies ResearchReportDraft,
  };
}

export function sanitizeResearchOutput(
  raw: unknown,
  fallback: ReturnType<typeof fallbackResearchOutput>
) {
  const value = isObject(raw) ? raw : {};
  const rawFindings = Array.isArray(value.findings) ? value.findings : [];
  const findings = rawFindings
    .map((item): ResearchFindingDraft | null => {
      if (!isObject(item)) return null;
      const title = cleanText(item.title, 180);
      const summary = cleanText(item.summary, 900);
      if (!title || !summary) return null;

      return {
        title,
        summary,
        category: cleanText(item.category, 80) || "signal",
        impact: cleanText(item.impact, 40) || "medium",
        confidence: clampNumber(item.confidence, 65, 0, 100),
        evidence: Array.isArray(item.evidence)
          ? item.evidence.filter(isObject).slice(0, 8)
          : [],
        source_name: cleanText(item.source_name, 120) || null,
        source_url: cleanText(item.source_url, 600) || null,
        recommended_action:
          cleanText(item.recommended_action, 500) ||
          "Revisar hallazgo y decidir modulo destino.",
        payload: isObject(item.payload) ? item.payload : {},
      };
    })
    .filter(Boolean) as ResearchFindingDraft[];
  const rawReport = isObject(value.report) ? value.report : {};
  const report = {
    title: cleanText(rawReport.title, 160) || fallback.report.title,
    summary: cleanText(rawReport.summary, 1200) || fallback.report.summary,
    sections: Array.isArray(rawReport.sections)
      ? rawReport.sections.filter(isObject).slice(0, 8)
      : fallback.report.sections,
    recommendations: Array.isArray(rawReport.recommendations)
      ? rawReport.recommendations
          .map((item) => cleanText(item, 280))
          .filter(Boolean)
          .slice(0, 8)
      : fallback.report.recommendations,
  };

  return {
    findings: findings.length ? findings.slice(0, 8) : fallback.findings,
    report,
  };
}
