import type { adminClient } from "@/app/api/panel/calibration/_lib";
import { cleanText } from "./schemas";

type Admin = ReturnType<typeof adminClient>;

export type LumeniteBusinessSnapshot = {
  business: {
    id: string;
    name: string;
    publicKey: string | null;
  };
  widget: Record<string, unknown> | null;
  knowledge: Array<Record<string, unknown>>;
  leads: Array<Record<string, unknown>>;
  chats: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  opportunities: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  scenarios: Array<Record<string, unknown>>;
  stats: {
    knowledgePublished: number;
    hotLeads: number;
    openOpportunities: number;
    unreadChats: number;
    activeCampaigns: number;
  };
  missingData: string[];
};

export async function buildLumeniteBusinessSnapshot(input: {
  admin: Admin;
  businessId: string;
  businessName?: string | null;
  publicKey?: string | null;
}) {
  const { admin, businessId } = input;

  const [
    widgetResult,
    knowledgeResult,
    leadsResult,
    chatsResult,
    messagesResult,
    opportunitiesResult,
    campaignsResult,
    scenariosResult,
  ] = await Promise.all([
    admin
      .from("widget_settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle(),
    admin
      .from("business_kb")
      .select("id,type,title,content,is_published,metadata,created_at,updated_at")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(80),
    admin
      .from("leads")
      .select("id,chat_id,name,email,phone,source,intent,summary,status,score,metadata,created_at,updated_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(80),
    admin
      .from("chats")
      .select("id,title,channel,visitor_id,unread_owner,human_takeover,metadata,created_at,updated_at")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(80),
    admin
      .from("chat_messages")
      .select("id,chat_id,sender_type,content,metadata,created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(160),
    admin
      .from("lumenai_opportunities")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(60),
    admin
      .from("lumenai_campaigns")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("lumenai_business_scenarios")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const widget = widgetResult.data ?? null;
  const knowledge = Array.isArray(knowledgeResult.data) ? knowledgeResult.data : [];
  const leads = Array.isArray(leadsResult.data) ? leadsResult.data : [];
  const chats = Array.isArray(chatsResult.data) ? chatsResult.data : [];
  const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];
  const opportunities = Array.isArray(opportunitiesResult.data)
    ? opportunitiesResult.data
    : [];
  const campaigns = Array.isArray(campaignsResult.data) ? campaignsResult.data : [];
  const scenarios = Array.isArray(scenariosResult.data) ? scenariosResult.data : [];
  const knowledgePublished = knowledge.filter((item) => item.is_published).length;
  const hotLeads = leads.filter((lead) => Number(lead.score ?? 0) >= 70).length;
  const openOpportunities = opportunities.filter((item) =>
    ["open", "new", "active"].includes(cleanText(item.status, 40))
  ).length;
  const unreadChats = chats.filter((chat) => Boolean(chat.unread_owner)).length;
  const activeCampaigns = campaigns.filter((campaign) =>
    ["active", "ready"].includes(cleanText(campaign.status, 40))
  ).length;
  const hasContact = Boolean(cleanText(widget?.whatsapp, 120) || cleanText(widget?.email, 120));
  const missingData = [
    knowledgePublished ? "" : "Knowledge publicado",
    hasContact ? "" : "Contacto de cierre",
    widget ? "" : "Configuracion de widget",
    leads.length ? "" : "Leads reales",
    messages.length ? "" : "Conversaciones suficientes",
  ].filter(Boolean);

  return {
    business: {
      id: businessId,
      name: cleanText(input.businessName, 120) || "Tu negocio",
      publicKey: input.publicKey ?? null,
    },
    widget,
    knowledge,
    leads,
    chats,
    messages,
    opportunities,
    campaigns,
    scenarios,
    stats: {
      knowledgePublished,
      hotLeads,
      openOpportunities,
      unreadChats,
      activeCampaigns,
    },
    missingData,
  } satisfies LumeniteBusinessSnapshot;
}
