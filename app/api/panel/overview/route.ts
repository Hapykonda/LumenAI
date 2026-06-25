import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveCountryDisplay, resolveCountryKey } from "@/lib/geo/countries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearer(req: Request) {
  const raw = req.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

async function getUser(req: Request, admin: ReturnType<typeof supabaseAdmin>) {
  const token = getBearer(req);
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);

  if (error || !data?.user) return null;

  return data.user;
}

function pickBusinessIdFromProfile(profile: any) {
  if (!profile || typeof profile !== "object") return null;

  const keys = [
    "active_business_id",
    "business_id",
    "current_business_id",
    "selected_business_id",
    "default_business_id",
  ];

  for (const key of keys) {
    const value = clean(profile[key]);
    if (value) return value;
  }

  return null;
}

async function readProfile(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const attempts = [
    { table: "profiles", column: "id" },
    { table: "profiles", column: "user_id" },
    { table: "profiles", column: "owner_id" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await admin
      .from(attempt.table)
      .select("*")
      .eq(attempt.column, userId)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function readOwnedBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const attempts = ["owner_id", "user_id", "created_by", "profile_id"];

  for (const column of attempts) {
    const { data, error } = await admin
      .from("businesses")
      .select("id,name,public_key")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  return null;
}

async function resolveBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const profile = await readProfile(admin, userId);
  const profileBusinessId = pickBusinessIdFromProfile(profile);

  if (profileBusinessId) {
    const { data, error } = await admin
      .from("businesses")
      .select("id,name,public_key")
      .eq("id", profileBusinessId)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  const owned = await readOwnedBusiness(admin, userId);
  if (owned?.id) return owned;

  return null;
}

function countByStatus(leads: any[], status: string) {
  return leads.filter((lead) => String(lead.status || "") === status).length;
}

function countKbByType(items: any[], type: string) {
  return items.filter(
    (item) => item.is_published && String(item.type || "").toLowerCase() === type
  ).length;
}

function formatPreview(value: unknown, max = 160) {
  const text = clean(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function readMeta(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeCountry(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readCountryFromMetadata(metaInput: unknown) {
  const meta = readMeta(metaInput);
  const nestedGeo = readMeta(meta.geo);
  const value =
    meta.country ??
    meta.country_name ??
    meta.geo_country ??
    meta.location_country ??
    nestedGeo.country;
  const code =
    meta.countryCode ??
    meta.country_code ??
    nestedGeo.countryCode ??
    nestedGeo.country_code;

  const key = resolveCountryKey(value, code) || normalizeCountry(value);
  if (!key || key === "sin datos" || key === "unknown") return null;

  return {
    key,
    name: resolveCountryDisplay(value, code) || clean(value) || key,
  };
}

function pushBar<T extends { value: number }>(items: T[], total: number) {
  return items.map((item) => ({
    ...item,
    percent: total ? Math.round((item.value / total) * 100) : 0,
  }));
}

function dayKeyFrom(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function buildDayKeys(days = 14) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: date.toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
    };
  });
}

function buildPerformance(input: {
  chats: any[];
  leads: any[];
  kbItems: any[];
  messages: any[];
  chatGeoRows: any[];
}) {
  const { chats, leads, kbItems, messages, chatGeoRows } = input;
  const totalLeads = Math.max(leads.length, 1);
  const totalChats = Math.max(chats.length, 1);

  const leadFunnel = pushBar(
    [
      { key: "new", label: "Nuevos", value: countByStatus(leads, "new") },
      { key: "contacted", label: "Contactados", value: countByStatus(leads, "contacted") },
      { key: "qualified", label: "Calificados", value: countByStatus(leads, "qualified") },
      { key: "won", label: "Ganados", value: countByStatus(leads, "won") },
    ],
    totalLeads
  );

  const channelCounts = chats.reduce((acc: Record<string, number>, chat) => {
    const key = clean(chat.channel || "panel") || "panel";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const channels = pushBar(
    Object.entries(channelCounts)
      .map(([key, value]) => ({
        key,
        label: key === "widget" ? "Widget publico" : key,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    totalChats
  );

  const knowledgeTypes = ["services", "pricing", "payment", "faq", "policy", "contact", "other"];
  const knowledgeMix = pushBar(
    knowledgeTypes.map((type) => ({
      key: type,
      label:
        type === "services"
          ? "Servicios"
          : type === "pricing"
          ? "Precios"
          : type === "payment"
          ? "Pagos"
          : type === "faq"
          ? "FAQ"
          : type === "policy"
          ? "Politicas"
          : type === "contact"
          ? "Contacto"
          : "Otros",
      value: kbItems.filter((item) => String(item.type || "other").toLowerCase() === type).length,
    })),
    Math.max(kbItems.length, 1)
  );

  const hourMap = new Map<number, { hour: number; value: number; customers: number; assistant: number }>();
  for (let hour = 0; hour < 24; hour += 1) {
    hourMap.set(hour, { hour, value: 0, customers: 0, assistant: 0 });
  }

  messages.forEach((message) => {
    const date = message.created_at ? new Date(message.created_at) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const item = hourMap.get(date.getHours());
    if (!item) return;
    item.value += 1;
    if (message.sender_type === "user") item.customers += 1;
    if (message.sender_type === "assistant") item.assistant += 1;
  });

  const hourlyActivity = [...hourMap.values()]
    .filter((item) => item.value > 0)
    .slice(-12)
    .map((item) => ({
      ...item,
      label: `${String(item.hour).padStart(2, "0")}:00`,
    }));

  const daySeeds = buildDayKeys(14);
  const daily = new Map(
    daySeeds.map((day) => [
      day.key,
      {
        date: day.key,
        label: day.label,
        widgetUsers: 0,
        leads: 0,
        buyers: 0,
      },
    ])
  );
  const widgetVisitorsByDay = new Map<string, Set<string>>();

  chats.forEach((chat) => {
    if (String(chat.channel || "").toLowerCase() !== "widget") return;
    const key = dayKeyFrom(chat.created_at);
    if (!key || !daily.has(key)) return;

    const visitors = widgetVisitorsByDay.get(key) ?? new Set<string>();
    visitors.add(String(chat.visitor_id || chat.id));
    widgetVisitorsByDay.set(key, visitors);
  });

  leads.forEach((lead) => {
    const leadKey = dayKeyFrom(lead.created_at);
    if (leadKey && daily.has(leadKey)) {
      daily.get(leadKey)!.leads += 1;
    }

    if (String(lead.status || "").toLowerCase() === "won") {
      const wonKey = dayKeyFrom(lead.updated_at || lead.created_at);
      if (wonKey && daily.has(wonKey)) {
        daily.get(wonKey)!.buyers += 1;
      }
    }
  });

  widgetVisitorsByDay.forEach((visitors, key) => {
    const item = daily.get(key);
    if (item) item.widgetUsers = visitors.size;
  });

  const growthSeries = [...daily.values()];

  const chatCountry = new Map<string, string>();
  const geoMap = new Map<
    string,
    {
      country: string;
      countryKey: string;
      people: number;
      leads: number;
      hot: number;
      messages: number;
    }
  >();

  function ensureCountry(countryKey: string, countryName?: string) {
    const current =
      geoMap.get(countryKey) ?? {
        country: countryName || countryKey,
        countryKey,
        people: 0,
        leads: 0,
        hot: 0,
        messages: 0,
      };

    if (countryName && current.country === countryKey) {
      current.country = countryName;
    }

    geoMap.set(countryKey, current);
    return current;
  }

  chatGeoRows.forEach((chat) => {
    const country = readCountryFromMetadata(chat.metadata);
    if (!country) return;
    chatCountry.set(String(chat.id), country.key);
    ensureCountry(country.key, country.name).people += 1;
  });

  leads.forEach((lead) => {
    const country = readCountryFromMetadata(lead.metadata);
    if (!country) return;
    if (lead.chat_id) chatCountry.set(String(lead.chat_id), country.key);
    const item = ensureCountry(country.key, country.name);
    item.leads += 1;
    item.people += chatGeoRows.length ? 0 : 1;
    if (Number(lead.score || 0) >= 70) item.hot += 1;
  });

  messages.forEach((message) => {
    const country = chatCountry.get(String(message.chat_id));
    if (!country) return;
    ensureCountry(country).messages += 1;
  });

  const geo = [...geoMap.values()].sort((a, b) => {
    const scoreA = a.messages + a.leads * 2 + a.people;
    const scoreB = b.messages + b.leads * 2 + b.people;
    return scoreB - scoreA;
  });

  return {
    leadFunnel,
    channels,
    knowledgeMix,
    hourlyActivity,
    growthSeries,
    geo,
  };
}

export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const business = await resolveBusiness(admin, user.id);

    if (!business?.id) {
      return NextResponse.json({ ok: false, error: "missing_business" }, { status: 403 });
    }

    const businessId = business.id as string;

    const [
      chatsResult,
      leadsResult,
      kbResult,
      widgetResult,
      messagesResult,
    ] = await Promise.all([
      admin
        .from("chats")
        .select(
          "id,title,channel,visitor_id,unread_owner,human_takeover,human_takeover_at,created_at,updated_at"
        )
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(100),

      admin
        .from("leads")
        .select(
          "id,chat_id,name,email,phone,source,intent,summary,status,score,metadata,created_at,updated_at"
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(100),

      admin
        .from("business_kb")
        .select("id,type,title,is_published,created_at,updated_at")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(200),

      admin
        .from("widget_settings")
        .select(
          "business_id,widget_enabled,assistant_name,greeting,whatsapp,email,published_settings,published_at,updated_at"
        )
        .eq("business_id", businessId)
        .maybeSingle(),

      admin
        .from("chat_messages")
        .select("id,chat_id,business_id,sender_type,content,created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(160),
    ]);

    const chats = Array.isArray(chatsResult.data) ? chatsResult.data : [];
    const leads = Array.isArray(leadsResult.data) ? leadsResult.data : [];
    const kbItems = Array.isArray(kbResult.data) ? kbResult.data : [];
    const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];
    const widget = widgetResult.data ?? null;
    let chatGeoRows: any[] = [];

    try {
      const { data, error } = await admin
        .from("chats")
        .select("id,visitor_id,metadata,created_at,updated_at")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data)) {
        chatGeoRows = data;
      }
    } catch {}

    const publishedKb = kbItems.filter((item) => item.is_published);

    const widgetEnabled =
      typeof widget?.widget_enabled === "boolean" ? widget.widget_enabled : false;

    const hasContact = Boolean(clean(widget?.whatsapp) || clean(widget?.email));

    const checks = {
      knowledge: publishedKb.length > 0,
      services: countKbByType(kbItems, "services") > 0,
      pricing: countKbByType(kbItems, "pricing") > 0,
      faq: countKbByType(kbItems, "faq") > 0,
      contact: hasContact,
      widget: widgetEnabled,
    };

    const done = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const launchPercent = Math.round((done / total) * 100);

    const recentLeads = leads.slice(0, 5).map((lead) => ({
      id: lead.id,
      chat_id: lead.chat_id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      score: lead.score,
      intent: lead.intent,
      source: lead.source,
      created_at: lead.created_at,
    }));

    const recentMessages = messages.slice(0, 6).map((message) => ({
      id: message.id,
      chat_id: message.chat_id,
      sender_type: message.sender_type,
      content: formatPreview(message.content),
      created_at: message.created_at,
    }));

    const stats = {
      chats_total: chats.length,
      chats_unread: chats.filter((chat) => Boolean(chat.unread_owner)).length,
      chats_paused: chats.filter((chat) => Boolean(chat.human_takeover)).length,
      chats_widget: chats.filter((chat) => chat.channel === "widget").length,

      leads_total: leads.length,
      leads_new: countByStatus(leads, "new"),
      leads_contacted: countByStatus(leads, "contacted"),
      leads_qualified: countByStatus(leads, "qualified"),
      leads_won: countByStatus(leads, "won"),
      leads_lost: countByStatus(leads, "lost"),

      kb_total: kbItems.length,
      kb_published: publishedKb.length,
      kb_services: countKbByType(kbItems, "services"),
      kb_pricing: countKbByType(kbItems, "pricing"),
      kb_payment: countKbByType(kbItems, "payment"),
      kb_faq: countKbByType(kbItems, "faq"),
      kb_policy: countKbByType(kbItems, "policy"),
      kb_contact: countKbByType(kbItems, "contact"),

      launch_percent: launchPercent,
      launch_done: done,
      launch_total: total,
    };
    const performance = buildPerformance({
      chats,
      leads,
      kbItems,
      messages,
      chatGeoRows,
    });

    return NextResponse.json({
      ok: true,
      business: {
        id: businessId,
        name: business.name ?? "Tu negocio",
        public_key: business.public_key ?? null,
      },
      widget: {
        enabled: widgetEnabled,
        assistant_name: widget?.assistant_name ?? "LumenAI",
        published_at: widget?.published_at ?? null,
        updated_at: widget?.updated_at ?? null,
        has_contact: hasContact,
        whatsapp: widget?.whatsapp ?? null,
        email: widget?.email ?? null,
      },
      checks,
      stats,
      performance,
      recentLeads,
      recentMessages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "overview_error" },
      { status: 500 }
    );
  }
}
