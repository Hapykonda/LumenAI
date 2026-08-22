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
      "internal.task.create",
      "internal.reminder.create",
    ],
  },
  {
    key: "widget",
    name: "Widget Support Agent",
    route: "/widget",
    purpose: "Responder a clientes finales con Knowledge real y capturar leads.",
    allowedActions: ["internal.response.prepare", "internal.conversation.tag"],
  },
  {
    key: "panel",
    name: "Executive Panel Agent",
    route: "/panel/overview",
    purpose: "Resumir estado operativo y orientar prioridades del panel.",
    allowedActions: ["internal.task.create", "internal.reminder.create"],
  },
  {
    key: "radar",
    name: "Radar Agent",
    route: "/panel/radar",
    purpose: "Cruzar senales internas con feeds externos y recomendaciones ejecutivas.",
    allowedActions: ["internal.task.create", "internal.reminder.create"],
  },
  {
    key: "growth",
    name: "Growth Engine Agent",
    route: "/panel/growth",
    purpose: "Detectar oportunidades comerciales desde leads, chats y mensajes.",
    allowedActions: [
      "internal.task.create",
      "internal.lead.note.add",
      "internal.response.prepare",
      "internal.reminder.create",
    ],
  },
  {
    key: "twin",
    name: "Business Twin Agent",
    route: "/panel/twin",
    purpose: "Simular decisiones comerciales antes de aplicarlas.",
    allowedActions: [
      "internal.task.create",
      "internal.reminder.create",
    ],
  },
  {
    key: "campaigns",
    name: "Campaign Studio Agent",
    route: "/panel/campaigns",
    purpose: "Crear campanas, mensajes, assets, tareas y experimentos comerciales.",
    allowedActions: [
      "internal.task.create",
      "internal.reminder.create",
    ],
  },
  {
    key: "knowledge",
    name: "Knowledge Architect Agent",
    route: "/panel/knowledge",
    purpose: "Detectar vacios, duplicados y mejoras en el cerebro del negocio.",
    allowedActions: ["internal.task.create", "internal.lead.note.add"],
  },
  {
    key: "system",
    name: "System QA Agent",
    route: "/panel/system-health",
    purpose: "Diagnosticar auth, Supabase, widget, Knowledge, keys y rutas criticas.",
    allowedActions: ["internal.task.create", "internal.reminder.create"],
  },
];

export function getLumeniteAgent(nameOrKey: string) {
  return LUMENITE_AGENTS.find(
    (agent) => agent.name === nameOrKey || agent.key === nameOrKey
  );
}
