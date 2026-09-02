import type { LumenAiPillarKey } from "./env";

export type LumeniteAgentName =
  | "Calibration Intelligence"
  | "Config AI"
  | "Lumen Eye Analyst"
  | "Pulse Chief of Staff"
  | "Research Intelligence"
  | "Widget Experience"
  | "Chats Copilot"
  | "Knowledge Architect"
  | "Interface Assistant"
  | "Overview Analyst"
  | "Access Guardian";

export type LumeniteAgent = {
  key: LumenAiPillarKey;
  name: LumeniteAgentName;
  route: string;
  purpose: string;
  allowedActions: string[];
};

const INTERNAL_ACTIONS = ["internal.task.create", "internal.reminder.create"];

export const LUMENITE_AGENTS: LumeniteAgent[] = [
  { key: "calibration", name: "Calibration Intelligence", route: "/panel/calibration", purpose: "Construir y validar la identidad, conducta y estrategia conversacional de la empresa.", allowedActions: INTERNAL_ACTIONS },
  { key: "config-ai", name: "Config AI", route: "/panel/autoconfig", purpose: "Transformar intenciones humanas en configuraciones explicadas, comparables y reversibles.", allowedActions: INTERNAL_ACTIONS },
  { key: "lumen-eye", name: "Lumen Eye Analyst", route: "/panel/lumen-eye", purpose: "Analizar señales internas, embudos, campañas, clientes y rendimiento empresarial.", allowedActions: [...INTERNAL_ACTIONS, "internal.lead.note.add"] },
  { key: "pulse-radar", name: "Pulse Chief of Staff", route: "/panel/radar", purpose: "Interpretar inteligencia y preparar decisiones, recomendaciones y seguimiento ejecutivo.", allowedActions: INTERNAL_ACTIONS },
  { key: "research", name: "Research Intelligence", route: "/panel/research", purpose: "Investigar mercado, competencia y tendencias con fuente, fecha y confianza.", allowedActions: INTERNAL_ACTIONS },
  { key: "widget", name: "Widget Experience", route: "/panel/widget", purpose: "Responder a clientes finales con Knowledge real y operar la experiencia pública.", allowedActions: ["internal.response.prepare", "internal.conversation.tag"] },
  { key: "chats", name: "Chats Copilot", route: "/panel/chat", purpose: "Asistir conversaciones omnicanal y preparar el siguiente movimiento comercial.", allowedActions: ["internal.response.prepare", "internal.conversation.tag", "internal.lead.note.add"] },
  { key: "knowledge", name: "Knowledge Architect", route: "/panel/knowledge", purpose: "Detectar vacíos, contradicciones y mejoras en la memoria del negocio.", allowedActions: ["internal.task.create", "internal.lead.note.add"] },
  { key: "interface", name: "Interface Assistant", route: "/panel/interface", purpose: "Optimizar la experiencia personal del propietario dentro del Design System.", allowedActions: INTERNAL_ACTIONS },
  { key: "overview", name: "Overview Analyst", route: "/panel/overview", purpose: "Resumir salud, cambios, impacto y decisiones pendientes del negocio.", allowedActions: INTERNAL_ACTIONS },
  { key: "access", name: "Access Guardian", route: "/panel/access", purpose: "Proteger identidad, organización, roles, sesiones y onboarding.", allowedActions: INTERNAL_ACTIONS },
];

const LEGACY_AGENT_ALIASES: Record<string, LumenAiPillarKey> = {
  autoconfig: "config-ai",
  panel: "overview",
  radar: "pulse-radar",
  growth: "lumen-eye",
  twin: "calibration",
  campaigns: "config-ai",
  system: "access",
  "Configurator Agent": "config-ai",
  "Executive Panel Agent": "overview",
  "Radar Agent": "pulse-radar",
  "Growth Engine Agent": "lumen-eye",
  "Business Twin Agent": "calibration",
  "Campaign Studio Agent": "config-ai",
  "System QA Agent": "access",
};

export function getLumeniteAgent(nameOrKey: string) {
  const canonicalKey = LEGACY_AGENT_ALIASES[nameOrKey] ?? nameOrKey;
  return LUMENITE_AGENTS.find(
    (agent) => agent.name === nameOrKey || agent.key === canonicalKey,
  );
}
