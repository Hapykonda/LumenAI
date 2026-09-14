export type LumenAiPillarId =
  | "calibration"
  | "config-ai"
  | "lumen-eye"
  | "pulse-radar"
  | "research"
  | "widget"
  | "chats"
  | "knowledge"
  | "interface"
  | "overview"
  | "access";

export type LumenAiPillar = {
  number: number;
  id: LumenAiPillarId;
  label: string;
  href: string;
  responsibility: string;
  operational: boolean;
  owns: readonly string[];
};

export const LUMENAI_PILLARS: readonly LumenAiPillar[] = [
  {
    number: 1,
    id: "calibration",
    label: "Identidad",
    href: "/panel/calibration",
    responsibility: "Brand Intelligence",
    operational: true,
    owns: ["Brand Constitution", "voz", "personalidad", "ventas", "autonomía conversacional"],
  },
  {
    number: 2,
    id: "config-ai",
    label: "Configuración",
    href: "/panel/autoconfig",
    responsibility: "Natural Language Configuration",
    operational: true,
    owns: ["configuración conversacional", "versiones", "comparación", "importación", "exportación"],
  },
  {
    number: 3,
    id: "lumen-eye",
    label: "Lumen Eye",
    href: "/panel/lumen-eye",
    responsibility: "Business Intelligence",
    operational: true,
    owns: ["analytics", "tráfico", "clientes", "embudos", "campañas", "crecimiento interno"],
  },
  {
    number: 4,
    id: "pulse-radar",
    label: "Pulse Radar",
    href: "/panel/radar",
    responsibility: "AI Chief of Staff",
    operational: true,
    owns: ["Daily Brief", "alertas", "oportunidades", "recomendaciones", "seguimiento"],
  },
  {
    number: 5,
    id: "research",
    label: "Investigación",
    href: "/panel/research",
    responsibility: "External Intelligence",
    operational: true,
    owns: ["mercado", "competencia", "tendencias", "precios públicos", "evidencia externa"],
  },
  {
    number: 6,
    id: "widget",
    label: "Asistente web",
    href: "/panel/widget",
    responsibility: "Customer Experience Studio",
    operational: true,
    owns: ["diseño del asistente", "preview", "instalación", "dominios", "experiencias"],
  },
  {
    number: 7,
    id: "chats",
    label: "Conversaciones",
    href: "/panel/chat",
    responsibility: "Omnichannel Communication Center",
    operational: true,
    owns: ["conversaciones", "canales", "leads", "copilot", "handoff humano"],
  },
  {
    number: 8,
    id: "knowledge",
    label: "Knowledge",
    href: "/panel/knowledge",
    responsibility: "Business Memory",
    operational: true,
    owns: ["productos", "inventario", "documentos", "FAQ", "políticas", "Knowledge Health"],
  },
  {
    number: 9,
    id: "interface",
    label: "Interfaz",
    href: "/panel/interface",
    responsibility: "LumenAI Personal Workspace",
    operational: true,
    owns: ["tema del propietario", "acento", "densidad", "movimiento", "operador personal"],
  },
  {
    number: 10,
    id: "overview",
    label: "Resumen",
    href: "/panel/overview",
    responsibility: "Business Command Center",
    operational: true,
    owns: ["Business Health", "Pulse Brief", "Pending Decisions", "Lumen Impact", "actividad"],
  },
  {
    number: 11,
    id: "access",
    label: "Cuenta",
    href: "/panel/access",
    responsibility: "Login, Identity & Onboarding",
    operational: false,
    owns: ["login", "registro", "sesiones", "perfil", "organización", "roles", "onboarding"],
  },
] as const;

export const OPERATIONAL_PILLARS = [
  "overview",
  "calibration",
  "config-ai",
  "lumen-eye",
  "pulse-radar",
  "research",
  "widget",
  "chats",
  "knowledge",
  "interface",
] as const satisfies readonly LumenAiPillarId[];

export const LUMENAI_PILLAR_BY_ID = Object.fromEntries(
  LUMENAI_PILLARS.map((pillar) => [pillar.id, pillar]),
) as Record<LumenAiPillarId, LumenAiPillar>;

export const LUMENAI_ABSORBED_ROUTES = {
  "/panel/growth": "/panel/lumen-eye?view=growth",
  "/panel/campaigns": "/panel/autoconfig?view=campaigns",
  "/panel/leads": "/panel/chat?view=leads",
  "/panel/twin": "/panel/calibration?view=simulation",
  "/panel/lumenite": "/panel/radar?view=actions",
  "/panel/approvals": "/panel/overview?view=decisions",
  "/panel/permissions": "/panel/access?view=permissions",
  "/panel/integrations": "/panel/interface?view=connections",
  "/panel/settings": "/panel/access",
  "/panel/color-mix": "/panel/interface",
  "/panel/system-health": "/panel/access?view=security",
} as const;

export function pillarFromPath(pathname: string) {
  const canonical = LUMENAI_PILLARS.find(
    (pillar) => pathname === pillar.href || pathname.startsWith(`${pillar.href}/`),
  );

  if (canonical) return canonical;

  const absorbedTarget = Object.entries(LUMENAI_ABSORBED_ROUTES).find(
    ([legacy]) => pathname === legacy || pathname.startsWith(`${legacy}/`),
  )?.[1];
  const absorbedPath = absorbedTarget?.split("?")[0];

  return (
    LUMENAI_PILLARS.find((pillar) => pillar.href === absorbedPath) ??
    LUMENAI_PILLAR_BY_ID.overview
  );
}
