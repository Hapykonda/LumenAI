import type { LumeniteAgentKey } from "./env";

export type LumeniteAgentName =
  | "Configurator Agent"
  | "Widget Support Agent"
  | "Executive Panel Agent"
  | "Radar Agent"
  | "Growth Engine Agent"
  | "Business Twin Agent"
  | "Campaign Studio Agent"
  | "Knowledge Architect Agent"
  | "System QA Agent";

export type LumeniteAgent = {
  key: LumeniteAgentKey | "knowledge" | "system";
  name: LumeniteAgentName;
  route: string;
  purpose: string;
  allowedActions: string[];
};

export const LUMENITE_AGENTS: LumeniteAgent[] = [
  {
    key: "autoconfig",
    name: "Configurator Agent",
    route: "/panel/autoconfig",
    purpose: "Configurar Knowledge, widget, calibracion, marca, contacto y reglas.",
    allowedActions: [
      "create_kb_item",
      "update_kb_item",
      "delete_kb_item",
      "update_widget_settings",
      "update_calibration_draft",
      "publish_calibration",
      "update_business_profile",
      "create_config_snapshot",
      "rollback_last_config",
    ],
  },
  {
    key: "widget",
    name: "Widget Support Agent",
    route: "/widget",
    purpose: "Responder a clientes finales con Knowledge real y capturar leads.",
    allowedActions: ["capture_lead", "create_chat_message", "request_human_takeover"],
  },
  {
    key: "panel",
    name: "Executive Panel Agent",
    route: "/panel/overview",
    purpose: "Resumir estado operativo y orientar prioridades del panel.",
    allowedActions: ["create_action_run", "create_market_signal"],
  },
  {
    key: "radar",
    name: "Radar Agent",
    route: "/panel/radar",
    purpose: "Cruzar senales internas con feeds externos y recomendaciones ejecutivas.",
    allowedActions: ["create_market_feed", "refresh_market_items", "create_market_signal"],
  },
  {
    key: "growth",
    name: "Growth Engine Agent",
    route: "/panel/growth",
    purpose: "Detectar oportunidades comerciales desde leads, chats y mensajes.",
    allowedActions: [
      "create_opportunity",
      "update_opportunity_status",
      "generate_followup_message",
      "create_followup_task",
      "create_growth_playbook",
    ],
  },
  {
    key: "twin",
    name: "Business Twin Agent",
    route: "/panel/twin",
    purpose: "Simular decisiones comerciales antes de aplicarlas.",
    allowedActions: [
      "create_business_scenario",
      "create_simulation_report",
      "send_recommendation_to_config_ia",
      "suggest_kb_item",
    ],
  },
  {
    key: "campaigns",
    name: "Campaign Studio Agent",
    route: "/panel/campaigns",
    purpose: "Crear campanas, mensajes, assets, tareas y experimentos comerciales.",
    allowedActions: [
      "create_campaign",
      "create_campaign_asset",
      "create_campaign_task",
      "send_campaign_to_config_ia_as_prompt",
      "create_growth_playbook",
    ],
  },
  {
    key: "knowledge",
    name: "Knowledge Architect Agent",
    route: "/panel/knowledge",
    purpose: "Detectar vacios, duplicados y mejoras en el cerebro del negocio.",
    allowedActions: ["suggest_kb_item", "create_kb_item", "update_kb_item", "publish_kb_item"],
  },
  {
    key: "system",
    name: "System QA Agent",
    route: "/panel/system-health",
    purpose: "Diagnosticar auth, Supabase, widget, Knowledge, keys y rutas criticas.",
    allowedActions: ["create_action_run", "create_audit_log"],
  },
];

export function getLumeniteAgent(nameOrKey: string) {
  return LUMENITE_AGENTS.find(
    (agent) => agent.name === nameOrKey || agent.key === nameOrKey
  );
}
