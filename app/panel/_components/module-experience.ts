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

export type ModuleTour = {
  title: string;
  description: string;
  bullets: [string, string, string];
};

const MODULE_TOURS: Record<string, ModuleTour> = {
  overview: {
    title: "Este es el centro de mando de tu negocio.",
    description: "Resume el estado operativo, las señales prioritarias y los movimientos que requieren una decisión.",
    bullets: [
      "Revisa la salud general y las métricas que provienen de actividad real.",
      "Usa Prioridades para resolver primero aquello que más impacto tiene.",
      "Abre Pulse cuando necesites evidencia o una explicación antes de actuar.",
    ],
  },
  lumenite: {
    title: "Lumenite convierte instrucciones en planes controlados.",
    description: "Aquí la IA puede preparar acciones, pero el alcance, el riesgo y la aprobación siempre quedan visibles.",
    bullets: [
      "Describe la acción que necesitas y revisa el plan antes de ejecutarlo.",
      "Comprueba pasos, riesgo, permisos y simulación de resultados.",
      "Conserva recibos, historial y posibilidad de deshacer cuando corresponda.",
    ],
  },
  approvals: {
    title: "Approval Inbox protege las decisiones importantes.",
    description: "Centraliza todo lo que necesita revisión humana antes de que LumenAI actúe sobre el negocio.",
    bullets: [
      "Compara alcance, riesgo, evidencia y resultado esperado.",
      "Aprueba, rechaza o solicita cambios con un comentario trazable.",
      "Consulta el historial y la verificación de cada ejecución.",
    ],
  },
  permissions: {
    title: "Permisos define hasta dónde puede llegar la automatización.",
    description: "Configura autonomía por integración, horario, cantidad y nivel de riesgo.",
    bullets: [
      "Selecciona un nivel de autonomía del 0 al 4 para cada política.",
      "Limita accesos, horarios, días, montos y necesidad de aprobación.",
      "Revoca una política inmediatamente cuando cambie el contexto.",
    ],
  },
  calibration: {
    title: "Calibration Studio entrena cómo piensa y responde tu IA.",
    description: "Ajusta identidad, personalidad, ventas, reglas y límites antes de publicar una nueva versión.",
    bullets: [
      "Define voz, tono, comportamiento comercial y manejo de objeciones.",
      "Prueba escenarios reales en Conversation Lab usando el borrador.",
      "Compara cambios, valida preparación y publica una versión controlada.",
    ],
  },
  autoconfig: {
    title: "Config IA transforma una conversación en configuración.",
    description: "Explica el negocio con lenguaje natural y revisa cada cambio propuesto antes de aplicarlo.",
    bullets: [
      "Describe servicios, clientes, tono, reglas y objetivos comerciales.",
      "Revisa la propuesta separada por capas y los elementos bloqueados.",
      "Publica solamente cuando el resumen y el impacto sean correctos.",
    ],
  },
  radar: {
    title: "Pulse Radar detecta señales antes de que se conviertan en problemas.",
    description: "Cruza conversaciones, leads, configuración y salud técnica para ordenar lo que merece atención.",
    bullets: [
      "Distingue riesgos, oportunidades y cambios relevantes del sistema.",
      "Abre la evidencia para entender de dónde viene cada conclusión.",
      "Convierte una señal en una acción preparada y verificable.",
    ],
  },
  "lumen-eye": {
    title: "Lumen Eye muestra patrones que una lista no revela.",
    description: "Une actividad, geografía aproximada, demanda y anomalías en una lectura visual del negocio.",
    bullets: [
      "Explora actividad y distribución sin exponer direcciones privadas.",
      "Diferencia datos reales, estimaciones y estados sin información.",
      "Envía un hallazgo a Research, Growth o Pulse para profundizarlo.",
    ],
  },
  research: {
    title: "Research convierte preguntas en evidencia reutilizable.",
    description: "Organiza consultas, fuentes, hallazgos e informes conectados con el resto de LumenAI.",
    bullets: [
      "Formula una pregunta y define el alcance de la investigación.",
      "Revisa fuentes, hallazgos y nivel de confianza por separado.",
      "Envía resultados a Knowledge, Growth, Campaigns o Config IA.",
    ],
  },
  growth: {
    title: "Growth descubre oportunidades dentro de la actividad real.",
    description: "Analiza leads, conversaciones y seguimiento para proponer movimientos comerciales medibles.",
    bullets: [
      "Prioriza oportunidades por intención, urgencia e impacto estimado.",
      "Revisa la evidencia antes de aceptar una recomendación.",
      "Convierte la oportunidad en un playbook o seguimiento preparado.",
    ],
  },
  twin: {
    title: "Business Twin permite probar una decisión antes de tomarla.",
    description: "Compara escenarios, supuestos, riesgos e impacto sin aplicar cambios sobre la operación real.",
    bullets: [
      "Describe una decisión y ajusta los supuestos de la simulación.",
      "Compara el escenario base con alternativas y rangos de impacto.",
      "Guarda el informe o conviértelo en una acción sujeta a aprobación.",
    ],
  },
  campaigns: {
    title: "Campaign Studio convierte una idea en un lanzamiento organizado.",
    description: "Construye oferta, mensajes, tareas y experimentos coherentes con la marca y la capacidad del negocio.",
    bullets: [
      "Define objetivo, audiencia y propuesta antes de generar piezas.",
      "Revisa mensajes, canales, tareas y experimentos individualmente.",
      "Prepara el lanzamiento sin enviar contenido automáticamente.",
    ],
  },
  knowledge: {
    title: "Knowledge es la memoria verificable de tu negocio.",
    description: "Reúne servicios, precios, políticas, horarios y respuestas que alimentan al asistente.",
    bullets: [
      "Crea información estructurada y decide si queda en borrador o publicada.",
      "Completa contacto, pagos y horarios para reducir respuestas incompletas.",
      "Revisa el contexto exacto que recibirá la IA antes de probarlo.",
    ],
  },
  chat: {
    title: "Chat es la mesa operativa de conversaciones.",
    description: "Supervisa respuestas, contexto, leads y derivaciones humanas desde una bandeja unificada.",
    bullets: [
      "Filtra conversaciones por estado, canal, lectura y presencia de lead.",
      "Pausa o reanuda la IA cuando una persona deba tomar el control.",
      "Usa respuestas sugeridas conservando siempre el historial visible.",
    ],
  },
  leads: {
    title: "Leads transforma conversaciones en oportunidades gestionables.",
    description: "Ordena intención, score, estado, contacto y próximo movimiento comercial.",
    bullets: [
      "Prioriza leads calientes sin perder la conversación que los originó.",
      "Actualiza etapa, notas y siguiente acción desde la misma ficha.",
      "Analiza distribución y rendimiento usando datos reales disponibles.",
    ],
  },
  widget: {
    title: "Widget lleva LumenAI al lugar donde conversa el cliente.",
    description: "Personaliza, prueba e instala una experiencia pública conectada con Knowledge y Calibración.",
    bullets: [
      "Comprueba identidad, operador, saludo, posición y estado de publicación.",
      "Prueba la experiencia en escritorio y teléfono antes de instalarla.",
      "Copia el script exacto y valida que el dominio público responda.",
    ],
  },
  integrations: {
    title: "Integraciones conecta servicios externos con control visible.",
    description: "Autoriza proveedores, comprueba su estado y revisa qué información puede entrar o salir.",
    bullets: [
      "Conecta únicamente proveedores configurados y revisa su salud.",
      "Prepara acciones externas como borradores sujetos a aprobación.",
      "Desconecta o limita un servicio sin afectar el resto del sistema.",
    ],
  },
  settings: {
    title: "Ajustes reúne la identidad y preferencias del espacio de trabajo.",
    description: "Administra propietario, operador, experiencia pública y configuración general en un solo lugar.",
    bullets: [
      "Separa la identidad del propietario de la identidad pública del asistente.",
      "Revisa los cambios en una vista previa antes de guardarlos.",
      "Mantén sincronizados perfil, operador, widget y preferencias.",
    ],
  },
  appearance: {
    title: "Apariencia adapta LumenAI sin perder consistencia.",
    description: "Controla modo, color base y acentos respetando contraste, estados y legibilidad.",
    bullets: [
      "Elige un preset profesional o crea una combinación propia.",
      "Comprueba contraste y jerarquía en la vista previa en tiempo real.",
      "Aplica el tema de forma global o restaura el sistema recomendado.",
    ],
  },
  health: {
    title: "Salud comprueba si LumenAI está listo para operar.",
    description: "Reúne diagnósticos de configuración, seguridad, servicios, widget, pagos y lanzamiento.",
    bullets: [
      "Filtra diagnósticos por estado y abre la acción correctiva exacta.",
      "Distingue bloqueos reales de recomendaciones y tareas pendientes.",
      "Copia un informe verificable antes de publicar una nueva versión.",
    ],
  },
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

export function getModuleTour(id: string): ModuleTour {
  return MODULE_TOURS[id] ?? MODULE_TOURS.overview;
}
