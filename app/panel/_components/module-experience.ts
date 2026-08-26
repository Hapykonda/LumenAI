import {
  BotMessageSquare,
  BrainCircuit,
  Eye,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessagesSquare,
  Paintbrush,
  Palette,
  PlugZap,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type ModuleExperience = {
  id: string;
  path: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  status: string;
  actionLabel: string;
  actionHref: string;
  visual:
    | "command"
    | "flow"
    | "approval"
    | "shield"
    | "spectrum"
    | "conversation"
    | "radar"
    | "eye"
    | "research"
    | "growth"
    | "twin"
    | "campaign"
    | "knowledge"
    | "chat"
    | "leads"
    | "widget"
    | "integration"
    | "settings"
    | "appearance"
    | "health";
  accentColor: string;
  index: string;
  icon: LucideIcon;
  signals: [string, string, string];
};

const EXPERIENCES: ModuleExperience[] = [
  {
    id: "overview",
    path: "/panel/overview",
    eyebrow: "LumenAI · Command",
    title: "Tu negocio está en movimiento.",
    accent: "Aquí ves hacia dónde.",
    description:
      "Una lectura ejecutiva de conversaciones, demanda, conocimiento y operación. Pulse ordena la señal; tú conservas la decisión.",
    status: "Lectura en vivo",
    actionLabel: "Configurar con IA",
    actionHref: "/panel/autoconfig",
    visual: "command",
    accentColor: "#4f7cff",
    index: "00",
    icon: LayoutDashboard,
    signals: ["OPERACIÓN", "SEÑALES", "SIGUIENTE ACCIÓN"],
  },
  {
    id: "lumenite",
    path: "/panel/lumenite",
    eyebrow: "Lumenite · Action OS",
    title: "De intención a ejecución.",
    accent: "Con control humano.",
    description:
      "Diseña planes, prepara acciones, solicita aprobación y conserva evidencia de cada cambio realizado por la inteligencia.",
    status: "Motor preparado",
    actionLabel: "Ver aprobaciones",
    actionHref: "/panel/approvals",
    visual: "flow",
    accentColor: "#765cff",
    index: "01",
    icon: Workflow,
    signals: ["PLAN", "APROBACIÓN", "EJECUCIÓN"],
  },
  {
    id: "approvals",
    path: "/panel/approvals",
    eyebrow: "Governance · Decisions",
    title: "Nada crítico ocurre",
    accent: "sin una decisión visible.",
    description:
      "Revisa alcance, riesgo y evidencia antes de permitir que LumenAI ejecute una acción sobre el negocio.",
    status: "Trazabilidad activa",
    actionLabel: "Configurar permisos",
    actionHref: "/panel/permissions",
    visual: "approval",
    accentColor: "#ff7b58",
    index: "02",
    icon: ListChecks,
    signals: ["SOLICITUD", "EVIDENCIA", "DECISIÓN"],
  },
  {
    id: "permissions",
    path: "/panel/permissions",
    eyebrow: "Policy Engine · Guardrails",
    title: "Autonomía suficiente.",
    accent: "Límites inequívocos.",
    description:
      "Define qué puede sugerir, preparar o ejecutar la IA, por nivel de riesgo y por contexto empresarial.",
    status: "Políticas aplicadas",
    actionLabel: "Revisar salud",
    actionHref: "/panel/system-health",
    visual: "shield",
    accentColor: "#28a77a",
    index: "03",
    icon: ShieldCheck,
    signals: ["REGLAS", "RIESGO", "AUTONOMÍA"],
  },
  {
    id: "calibration",
    path: "/panel/calibration",
    eyebrow: "AI Studio · Calibration",
    title: "Tu IA debe sonar",
    accent: "como tu mejor equipo.",
    description:
      "Ajusta personalidad, ventas, límites, lenguaje y comportamiento con una vista previa antes de publicar.",
    status: "Estudio activo",
    actionLabel: "Abrir configuración IA",
    actionHref: "/panel/autoconfig",
    visual: "spectrum",
    accentColor: "#2c9cff",
    index: "04",
    icon: SlidersHorizontal,
    signals: ["TONO", "REGLAS", "PUBLICACIÓN"],
  },
  {
    id: "autoconfig",
    path: "/panel/autoconfig",
    eyebrow: "Conversational Setup · AI",
    title: "Configura el sistema",
    accent: "hablando con él.",
    description:
      "Describe tu negocio en lenguaje natural. LumenAI estructura la propuesta y te muestra cada cambio antes de aplicarlo.",
    status: "Sesión inteligente",
    actionLabel: "Ver calibración",
    actionHref: "/panel/calibration",
    visual: "conversation",
    accentColor: "#6078ff",
    index: "05",
    icon: WandSparkles,
    signals: ["CONVERSACIÓN", "PROPUESTA", "CONFIRMACIÓN"],
  },
  {
    id: "radar",
    path: "/panel/radar",
    eyebrow: "Pulse Radar · Executive Signals",
    title: "Detecta antes.",
    accent: "Decide con contexto.",
    description:
      "Pulse cruza actividad, riesgo, demanda y estado del sistema para explicar qué cambió y qué merece atención ahora.",
    status: "Radar observando",
    actionLabel: "Revisar centro de mando",
    actionHref: "/panel/overview",
    visual: "radar",
    accentColor: "#2d76ff",
    index: "06",
    icon: HeartPulse,
    signals: ["RIESGO", "OPORTUNIDAD", "PRIORIDAD"],
  },
  {
    id: "lumen-eye",
    path: "/panel/lumen-eye",
    eyebrow: "Lumen Eye · Intelligent Vision",
    title: "Observa patrones.",
    accent: "Encuentra lo que falta.",
    description:
      "Una capa de observación que convierte actividad dispersa en anomalías, relaciones y oportunidades explicables.",
    status: "Visión sincronizada",
    actionLabel: "Abrir Research",
    actionHref: "/panel/research",
    visual: "eye",
    accentColor: "#00a6b8",
    index: "07",
    icon: Eye,
    signals: ["PATRÓN", "ANOMALÍA", "CONTEXTO"],
  },
  {
    id: "research",
    path: "/panel/research",
    eyebrow: "Research · Evidence Engine",
    title: "Investiga con fuentes.",
    accent: "Conserva la evidencia.",
    description:
      "Organiza consultas, hallazgos, fuentes y reportes para transformar información externa en conocimiento accionable.",
    status: "Fuentes trazables",
    actionLabel: "Abrir Knowledge",
    actionHref: "/panel/knowledge",
    visual: "research",
    accentColor: "#7b5cff",
    index: "08",
    icon: Search,
    signals: ["PREGUNTA", "FUENTE", "HALLAZGO"],
  },
  {
    id: "growth",
    path: "/panel/growth",
    eyebrow: "Growth · Opportunity Engine",
    title: "Convierte señales",
    accent: "en crecimiento medible.",
    description:
      "Identifica oportunidades, estima impacto y prepara playbooks conectados con conversaciones, leads y campañas.",
    status: "Oportunidades activas",
    actionLabel: "Revisar leads",
    actionHref: "/panel/leads",
    visual: "growth",
    accentColor: "#19a86b",
    index: "09",
    icon: TrendingUp,
    signals: ["DEMANDA", "IMPACTO", "PLAYBOOK"],
  },
  {
    id: "twin",
    path: "/panel/twin",
    eyebrow: "Business Twin · Simulation",
    title: "Prueba decisiones",
    accent: "antes de asumir el riesgo.",
    description:
      "Simula escenarios comerciales y operativos con supuestos claros, comparables y preparados para aprobación.",
    status: "Modelo listo",
    actionLabel: "Ver aprobaciones",
    actionHref: "/panel/approvals",
    visual: "twin",
    accentColor: "#ca5fa6",
    index: "10",
    icon: GitBranch,
    signals: ["SUPUESTO", "ESCENARIO", "IMPACTO"],
  },
  {
    id: "campaigns",
    path: "/panel/campaigns",
    eyebrow: "Campaign Studio · Launch",
    title: "Ideas listas",
    accent: "para convertirse en campaña.",
    description:
      "Genera, revisa y organiza campañas coherentes con la marca, los datos del negocio y la capacidad real del equipo.",
    status: "Estudio creativo",
    actionLabel: "Explorar Growth",
    actionHref: "/panel/growth",
    visual: "campaign",
    accentColor: "#ff6657",
    index: "11",
    icon: Megaphone,
    signals: ["CONCEPTO", "PIEZA", "LANZAMIENTO"],
  },
  {
    id: "knowledge",
    path: "/panel/knowledge",
    eyebrow: "Knowledge · Business Memory",
    title: "Una empresa que recuerda",
    accent: "responde mejor.",
    description:
      "Convierte servicios, precios, políticas y documentos en memoria empresarial publicable y verificable.",
    status: "Memoria conectada",
    actionLabel: "Calibrar respuestas",
    actionHref: "/panel/calibration",
    visual: "knowledge",
    accentColor: "#e29b2f",
    index: "12",
    icon: BrainCircuit,
    signals: ["FUENTE", "VERSIÓN", "RESPUESTA"],
  },
  {
    id: "chat",
    path: "/panel/chat",
    eyebrow: "Conversations · Live Desk",
    title: "Cada conversación",
    accent: "mantiene su contexto.",
    description:
      "Atiende clientes, supervisa la IA, deriva a personas y conserva el historial comercial en una sola mesa operativa.",
    status: "Canales conectados",
    actionLabel: "Revisar leads",
    actionHref: "/panel/leads",
    visual: "chat",
    accentColor: "#168ccf",
    index: "13",
    icon: MessagesSquare,
    signals: ["MENSAJE", "CONTEXTO", "DERIVACIÓN"],
  },
  {
    id: "leads",
    path: "/panel/leads",
    eyebrow: "Revenue · Opportunity Desk",
    title: "De interés a oportunidad.",
    accent: "Sin perder la historia.",
    description:
      "Prioriza contactos por intención, estado y evidencia de conversación para que el seguimiento ocurra a tiempo.",
    status: "Pipeline sincronizado",
    actionLabel: "Abrir conversaciones",
    actionHref: "/panel/chat",
    visual: "leads",
    accentColor: "#1cab73",
    index: "14",
    icon: UsersRound,
    signals: ["INTENCIÓN", "SCORE", "SEGUIMIENTO"],
  },
  {
    id: "widget",
    path: "/panel/widget",
    eyebrow: "Widget · Public Experience",
    title: "LumenAI, instalado",
    accent: "donde ocurre la conversación.",
    description:
      "Diseña, publica y prueba un asistente de marca conectado al conocimiento, los leads y el historial del negocio.",
    status: "Preview disponible",
    actionLabel: "Configurar operador",
    actionHref: "/panel/settings",
    visual: "widget",
    accentColor: "#3b70ff",
    index: "15",
    icon: BotMessageSquare,
    signals: ["MARCA", "INSTALACIÓN", "CONVERSIÓN"],
  },
  {
    id: "integrations",
    path: "/panel/integrations",
    eyebrow: "Integrations · Connected Stack",
    title: "Conecta herramientas.",
    accent: "Mantén el control.",
    description:
      "Autoriza servicios externos, revisa su estado y conserva una visión clara de qué datos entran o salen del sistema.",
    status: "Conectores seguros",
    actionLabel: "Revisar salud",
    actionHref: "/panel/system-health",
    visual: "integration",
    accentColor: "#6a64ff",
    index: "16",
    icon: PlugZap,
    signals: ["AUTORIZACIÓN", "SINCRONÍA", "ESTADO"],
  },
  {
    id: "settings",
    path: "/panel/settings",
    eyebrow: "Workspace · Preferences",
    title: "Tu operación.",
    accent: "Tu identidad.",
    description:
      "Administra perfil, operador, comportamiento del widget y preferencias del espacio de trabajo desde una sola superficie.",
    status: "Preferencias activas",
    actionLabel: "Ver apariencia",
    actionHref: "/panel/color-mix",
    visual: "settings",
    accentColor: "#457cff",
    index: "17",
    icon: Palette,
    signals: ["PERFIL", "OPERADOR", "PREFERENCIAS"],
  },
  {
    id: "appearance",
    path: "/panel/color-mix",
    eyebrow: "Brand System · Appearance",
    title: "Una interfaz coherente",
    accent: "con tu forma de trabajar.",
    description:
      "Ajusta modo y acentos sin comprometer legibilidad, estados o consistencia entre módulos.",
    status: "Sistema adaptable",
    actionLabel: "Abrir ajustes",
    actionHref: "/panel/settings",
    visual: "appearance",
    accentColor: "#935dff",
    index: "18",
    icon: Paintbrush,
    signals: ["MODO", "ACENTO", "CONTRASTE"],
  },
  {
    id: "health",
    path: "/panel/system-health",
    eyebrow: "Reliability · System Health",
    title: "Antes de publicar,",
    accent: "todo debe responder.",
    description:
      "Comprueba configuración, servicios, seguridad y preparación de lanzamiento con señales trazables.",
    status: "Diagnóstico activo",
    actionLabel: "Volver al centro",
    actionHref: "/panel/overview",
    visual: "health",
    accentColor: "#1fa479",
    index: "19",
    icon: HeartPulse,
    signals: ["SERVICIO", "SEGURIDAD", "RELEASE"],
  },
];

const FALLBACK = EXPERIENCES[0];

export function getModuleExperience(pathname: string): ModuleExperience {
  if (pathname === "/panel") return FALLBACK;
  return (
    EXPERIENCES.filter(
      (experience) =>
        pathname === experience.path || pathname.startsWith(`${experience.path}/`),
    ).sort((a, b) => b.path.length - a.path.length)[0] ?? FALLBACK
  );
}

