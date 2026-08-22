import { NextResponse } from "next/server";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import {
  COUNTRY_COORDS,
  resolveCountryDisplay,
  resolveCountryKey,
} from "@/lib/geo/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & {
  metadata?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
};
type SignalKind = "conversation" | "lead" | "opportunity" | "alert" | "research";

type Zone = {
  key: string;
  label: string;
  country: string;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  location?: [number, number] | null;
  conversations: number;
  leads: number;
  opportunities: number;
  alerts: number;
  critical: number;
  lastEvent: string | null;
  intent: string;
  channels: string[];
  kind: SignalKind;
};

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nested(...values: unknown[]) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
}

function readGeo(row: Row) {
  const meta = asObj(row.metadata);
  const geo = nested(meta.geo, meta.location, meta.lastDetection && asObj(meta.lastDetection).geo);
  const signal = nested(meta.signals, meta.lastDetection);
  const country =
    meta.country ??
    meta.country_name ??
    meta.geo_country ??
    meta.location_country ??
    meta.ip_country ??
    geo.country ??
    geo.country_name;
  const code =
    meta.countryCode ??
    meta.country_code ??
    meta.ip_country_code ??
    geo.countryCode ??
    geo.country_code;
  const countryKey = resolveCountryKey(country, code);

  if (!countryKey || countryKey === "sin datos" || countryKey === "unknown") {
    return null;
  }

  const coords = COUNTRY_COORDS[countryKey] ?? null;

  return {
    countryKey,
    country: resolveCountryDisplay(country, code) || clean(country) || countryKey,
    city: clean(meta.city ?? meta.city_name ?? geo.city) || null,
    region: clean(meta.region ?? meta.region_name ?? geo.region) || null,
    timezone: clean(meta.timezone ?? meta.timeZone ?? geo.timezone) || null,
    location: coords,
    intent:
      clean(row.intent) ||
      clean(row.title) ||
      clean(signal.intent) ||
      clean(signal.nextBestAction) ||
      "Senal detectada",
  };
}

function severity(row: Row) {
  const value = clean(row.severity ?? row.priority ?? row.temperature).toLowerCase();
  if (["critical", "high", "hot", "risk", "alta"].includes(value)) return "critical";
  if (Number(row.score ?? 0) >= 75) return "critical";
  return "normal";
}

function newer(a?: string | null, b?: string | null) {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}

function zoneKey(geo: NonNullable<ReturnType<typeof readGeo>>) {
  const parts = [geo.countryKey, clean(geo.region).toLowerCase(), clean(geo.city).toLowerCase()]
    .filter(Boolean)
    .slice(0, 3);
  return parts.join(":");
}

function addZone(
  map: Map<string, Zone>,
  row: Row,
  kind: SignalKind,
  countField: "conversations" | "leads" | "opportunities" | "alerts"
) {
  const geo = readGeo(row);
  if (!geo) return;

  const key = zoneKey(geo);
  const current =
    map.get(key) ??
    ({
      key,
      label: [geo.city, geo.region, geo.country].filter(Boolean).join(", "),
      country: geo.country,
      city: geo.city,
      region: geo.region,
      timezone: geo.timezone,
      location: geo.location,
      conversations: 0,
      leads: 0,
      opportunities: 0,
      alerts: 0,
      critical: 0,
      lastEvent: null,
      intent: geo.intent,
      channels: [],
      kind,
    } satisfies Zone);

  current[countField] += 1;
  current.kind = current.kind === "alert" || kind === "alert" ? "alert" : current.kind;
  current.lastEvent = newer(current.lastEvent, row.updated_at ?? row.created_at);
  current.intent = current.intent || geo.intent;

  const channel = clean(row.channel ?? row.source ?? asObj(row.metadata).channel);
  if (channel && !current.channels.includes(channel)) current.channels.push(channel);
  if (severity(row) === "critical") current.critical += 1;

  map.set(key, current);
}

async function optionalQuery<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const { data, error } = await query;
  if (error) return [];
  return list<T>(data);
}

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

    const [chats, messages, leads, opportunities, signals] = await Promise.all([
      optionalQuery<Row>(
        ctx.admin
          .from("chats")
          .select("id,title,channel,metadata,created_at,updated_at,unread_owner,human_takeover")
          .eq("business_id", ctx.businessId)
          .gte("updated_at", since)
          .order("updated_at", { ascending: false })
          .limit(180)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("chat_messages")
          .select("id,chat_id,sender_type,content,metadata,created_at,business_id")
          .eq("business_id", ctx.businessId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(240)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("leads")
          .select("id,chat_id,name,source,intent,summary,status,score,metadata,created_at,updated_at")
          .eq("business_id", ctx.businessId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(180)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("lumenai_opportunities")
          .select("id,lead_id,chat_id,title,summary,intent,score,priority,status,metadata,created_at,updated_at")
          .eq("business_id", ctx.businessId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(120)
      ),
      optionalQuery<Row>(
        ctx.admin
          .from("lumenai_signal_events")
          .select("id,lead_id,chat_id,type,title,description,severity,payload,created_at")
          .eq("business_id", ctx.businessId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(120)
      ),
    ]);

    const zones = new Map<string, Zone>();
    for (const chat of chats) addZone(zones, chat, "conversation", "conversations");
    for (const message of messages) addZone(zones, message, "conversation", "conversations");
    for (const lead of leads) addZone(zones, lead, "lead", "leads");
    for (const opportunity of opportunities) addZone(zones, opportunity, "opportunity", "opportunities");
    for (const signal of signals.map((item) => ({ ...item, metadata: item.payload }))) {
      addZone(zones, signal, "alert", "alerts");
    }

    const realZones = [...zones.values()].sort(
      (a, b) =>
        b.conversations +
        b.leads * 2 +
        b.opportunities * 3 +
        b.alerts * 2 -
        (a.conversations + a.leads * 2 + a.opportunities * 3 + a.alerts * 2)
    );
    const hasRealGeo = realZones.length > 0;
    const activeZones = realZones;
    const markerZones = activeZones.filter((zone) => zone.location);

    const importantSignals = [
      ...leads
        .filter((lead) => Number(lead.score ?? 0) >= 70)
        .slice(0, 4)
        .map((lead) => ({
          id: `lead-${lead.id}`,
          category: "Lead caliente",
          title: clean(lead.intent || lead.summary || lead.name) || "Lead con alta intencion",
          impact: `${Number(lead.score ?? 0)}%`,
          time: lead.updated_at ?? lead.created_at,
          action: "Crear oportunidad Growth",
          href: "/panel/growth",
        })),
      ...signals.slice(0, 4).map((signal) => ({
        id: `signal-${signal.id}`,
        category: clean(signal.type) || "Senal",
        title: clean(signal.title || signal.description) || "Senal importante",
        impact: clean(signal.severity) || "info",
        time: signal.created_at,
        action: "Enviar a Pulse",
        href: "/panel/radar",
      })),
    ].slice(0, 6);

    const cases = [
      ...leads.slice(0, 4).map((lead) => ({
        id: `case-lead-${lead.id}`,
        title: clean(lead.intent || lead.summary) || "Lead con alta intencion",
        score: Math.max(45, Math.min(100, Number(lead.score ?? 55))),
        priority: Number(lead.score ?? 0) >= 75 ? "alta" : "media",
        source: "leads",
      })),
      ...chats
        .filter((chat) => chat.unread_owner || chat.human_takeover)
        .slice(0, 3)
        .map((chat) => ({
          id: `case-chat-${chat.id}`,
          title: chat.human_takeover
            ? "Conversacion con IA pausada"
            : "Conversacion requiere respuesta del equipo",
          score: chat.human_takeover ? 82 : 68,
          priority: chat.human_takeover ? "alta" : "media",
          source: "chat",
        })),
    ].slice(0, 5);

    return NextResponse.json({
      ok: true,
      mode: hasRealGeo ? "real" : "preview",
      badge: hasRealGeo ? "Live" : "Preview",
      refreshedAt: new Date().toISOString(),
      business: {
        id: ctx.businessId,
        name: ctx.business.name,
      },
      summary: {
        conversations: chats.length + messages.length,
        geoConversations: realZones.reduce((acc, zone) => acc + zone.conversations, 0),
        leads: leads.length,
        geoLeads: realZones.reduce((acc, zone) => acc + zone.leads, 0),
        opportunities: opportunities.length,
        critical: realZones.reduce((acc, zone) => acc + zone.critical, 0),
      },
      zones: activeZones,
      markers: markerZones.map((zone) => ({
        id: zone.key.replace(/[^a-z0-9-]/gi, "-"),
        location: zone.location,
        label: zone.city || zone.country,
      })),
      arcs: markerZones.slice(1, 6).map((zone, index) => ({
        id: `arc-${index}-${zone.key.replace(/[^a-z0-9-]/gi, "-")}`,
        from: markerZones[0].location,
        to: zone.location,
        label: "senal",
      })),
      importantSignals,
      cases,
      aiSummary: hasRealGeo
        ? "Lumen Eye detecta actividad aproximada por zona desde metadata de conversaciones, leads y senales internas. Prioriza zonas con leads calientes, chats sin responder y oportunidades activas."
        : "Aun no hay metadata geografica real para dibujar zonas. Conecta el widget, captura conversaciones con contexto de origen y Lumen Eye activara el mapa sin inventar actividad.",
      privacy:
        "Lumen Eye muestra ubicacion aproximada por pais, region o ciudad cuando existe metadata. Nunca expone direccion exacta, IP completa ni coordenadas personales.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo cargar Lumen Eye.") },
      { status: safeErrorStatus(error) }
    );
  }
}
