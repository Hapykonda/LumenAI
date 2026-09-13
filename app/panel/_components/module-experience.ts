import {
  BotMessageSquare,
  BrainCircuit,
  Eye,
  HeartPulse,
  LayoutDashboard,
  MessagesSquare,
  Palette,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { pillarFromPath } from "@/lib/lumenai/pillars";

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
    | "spectrum"
    | "conversation"
    | "eye"
    | "radar"
    | "research"
    | "widget"
    | "chat"
    | "knowledge"
    | "appearance"
    | "settings"
    | "flow"
    | "approval"
    | "shield"
    | "growth"
    | "twin"
    | "campaign"
    | "leads"
    | "integration"
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
    title: "Tu empresa, explicada en una sola lectura.",
    description: "Overview resume salud, cambios, oportunidades y decisiones pendientes sin crear nuevas aplicaciones para cada tarjeta.",
    bullets: [
      "Lee Business Health y Pulse Brief antes de profundizar.",
      "Resuelve Pending Decisions con evidencia y trazabilidad.",
      "Abre el pilar propietario cuando necesites el detalle completo.",
    ],
  },
  calibration: {
    title: "Define quién es tu empresa antes de automatizarla.",
    description: "Calibration reúne la Brand Constitution, la voz comercial y las reglas de conducta del sistema conversacional.",
    bullets: [
      "Modela personalidad, formalidad, energía y nivel técnico.",
      "Define objeciones, CTA, palabras permitidas y límites.",
      "Simula conversaciones antes de publicar una versión.",
    ],
  },
  "config-ai": {
    title: "Configura LumenAI con lenguaje natural.",
    description: "Config AI convierte una intención humana en cambios estructurados, comparables y reversibles.",
    bullets: [
      "Describe el resultado que quieres en palabras normales.",
      "Revisa conflictos, impacto y vista previa de cada ajuste.",
      "Aprueba, compara, exporta o restaura versiones.",
    ],
  },
  "lumen-eye": {
    title: "Observa lo que ocurre dentro del negocio.",
    description: "Lumen Eye reúne tráfico, clientes, conversaciones, campañas, conversión y rendimiento en una sola capa de inteligencia interna.",
    bullets: [
      "Localiza pérdidas, anomalías y productos con interés sin conversión.",
      "Analiza embudos, campañas, fuentes y comportamiento.",
      "Entrega evidencia a Pulse sin duplicar su interpretación ejecutiva.",
    ],
  },
  "pulse-radar": {
    title: "Tu Chief of Staff de inteligencia empresarial.",
    description: "Pulse interpreta señales de todos los pilares y las convierte en decisiones comprensibles, acciones preparadas y seguimiento.",
    bullets: [
      "Empieza por el Daily Brief y los cambios desde tu última visita.",
      "Abre evidencia, confianza y comparación antes de actuar.",
      "Aprueba acciones y comprueba después si funcionaron.",
    ],
  },
  research: {
    title: "Mira hacia fuera con fuentes y vigencia.",
    description: "Research analiza mercado, competencia, tendencias y señales públicas sin mezclarlas con los datos internos de Lumen Eye.",
    bullets: [
      "Define una pregunta, empresa o producto relacionado.",
      "Revisa fuente, fecha, evidencia y nivel de confianza.",
      "Envía descubrimientos a Knowledge, Calibration, Eye o Pulse.",
    ],
  },
  widget: {
    title: "Diseña la experiencia que verá tu cliente.",
    description: "Widget controla apariencia, modos, mensajes, idiomas, instalación y experiencias por página o producto.",
    bullets: [
      "Configura escritorio, móvil, accesibilidad y comportamiento.",
      "Prueba una conversación real antes de publicar.",
      "Instala por dominio y valida el estado desde el mismo estudio.",
    ],
  },
  chats: {
    title: "Todas las conversaciones, un solo centro.",
    description: "Chats reúne Widget, WhatsApp, Instagram, correo y futuros canales con modos AI, Copilot y Human.",
    bullets: [
      "Filtra clientes, leads, prioridad, sentimiento y canal.",
      "Revisa resumen, intención, objeciones y próxima acción.",
      "Cambia de AI a Copilot o Human conservando trazabilidad.",
    ],
  },
  knowledge: {
    title: "La memoria verificable de tu empresa.",
    description: "Knowledge contiene productos, inventario, políticas, documentos, horarios, promociones y toda la información comercial.",
    bullets: [
      "Estructura productos, servicios, precios y variantes.",
      "Conecta documentos, FAQ, políticas y procesos.",
      "Usa Knowledge Health para corregir vacíos y contradicciones.",
    ],
  },
  interface: {
    title: "Tu espacio personal dentro de LumenAI.",
    description: "Interface personaliza tema, densidad, movimiento y operador del propietario sin modificar la experiencia pública del Widget.",
    bullets: [
      "Elige modo, acentos y fondo dentro del Design System.",
      "Ajusta densidad y movimiento según tu forma de trabajar.",
      "Gestiona conexiones de forma contextual, no como otro pilar.",
    ],
  },
  access: {
    title: "Identidad, organización y comienzo seguro.",
    description: "Access reúne autenticación, perfil, equipo, roles, sesiones y onboarding; por eso no ocupa una entrada operativa en la barra lateral.",
    bullets: [
      "Administra perfil, organización, miembros e invitaciones.",
      "Revisa permisos, sesiones y seguridad de la cuenta.",
      "Completa Knowledge, Calibration y Widget durante el onboarding.",
    ],
  },
};

function experience(
  id: string,
  path: string,
  eyebrow: string,
  title: string,
  accent: string,
  description: string,
  status: string,
  actionLabel: string,
  actionHref: string,
  visual: ModuleExperience["visual"],
  accentColor: string,
  index: string,
  icon: LucideIcon,
  signals: [string, string, string],
): ModuleExperience {
  return { id, path, eyebrow, title, accent, description, status, actionLabel, actionHref, visual, accentColor, index, icon, signals };
}

const EXPERIENCES: Record<string, ModuleExperience> = {
  overview: experience("overview", "/panel/overview", "Command Center · Overview", "Entiende tu empresa.", "Decide qué sigue.", "Salud, cambios, impacto y decisiones en una lectura ejecutiva conectada con los demás pilares.", "Espacio de trabajo", "Abrir Pulse Brief", "/panel/radar", "command", "#1477ff", "10", LayoutDashboard, ["SALUD", "CAMBIOS", "DECISIONES"]),
  calibration: experience("calibration", "/panel/calibration", "Brand Intelligence · Calibration", "Una identidad coherente.", "En cada conversación.", "Construye la Brand Constitution y controla cómo piensa, comunica, vende y protege la reputación de tu empresa.", "Espacio de trabajo", "Configurar con IA", "/panel/autoconfig", "spectrum", "#1477ff", "01", SlidersHorizontal, ["IDENTIDAD", "CONDUCTA", "VENTAS"]),
  "config-ai": experience("config-ai", "/panel/autoconfig", "Natural Language · Config AI", "Dilo como lo piensas.", "LumenAI lo configura.", "Convierte intenciones humanas en cambios explicados, simulados, comparables y sujetos a aprobación.", "Configurador listo", "Revisar Calibration", "/panel/calibration", "conversation", "#1477ff", "02", WandSparkles, ["INTENCIÓN", "PROPUESTA", "APROBACIÓN"]),
  "lumen-eye": experience("lumen-eye", "/panel/lumen-eye", "Business Intelligence · Lumen Eye", "Observa el negocio.", "Encuentra el patrón.", "Analiza tráfico, clientes, productos, campañas, embudos y conversiones para explicar qué funciona y dónde se pierde valor.", "Espacio de trabajo", "Consultar a Pulse", "/panel/radar", "eye", "#1477ff", "03", Eye, ["EVENTOS", "PATRONES", "RENDIMIENTO"]),
  "pulse-radar": experience("pulse-radar", "/panel/radar", "AI Chief of Staff · Pulse Radar", "Detecta lo importante.", "Prepara la decisión.", "Interpreta la inteligencia de todo LumenAI en briefs, alertas, oportunidades, recomendaciones y seguimiento.", "Espacio de trabajo", "Ver Overview", "/panel/overview", "radar", "#1477ff", "04", HeartPulse, ["BRIEF", "EVIDENCIA", "ACCIÓN"]),
  research: experience("research", "/panel/research", "External Intelligence · Research", "Comprende el mercado.", "Con evidencia vigente.", "Investiga competencia, tendencias, precios y oportunidades externas conservando fuente, fecha y confianza.", "Fuentes preparadas", "Guardar en Knowledge", "/panel/knowledge", "research", "#1477ff", "05", Search, ["FUENTES", "HALLAZGOS", "VIGENCIA"]),
  widget: experience("widget", "/panel/widget", "Customer Experience · Widget", "Tu marca conversa.", "En cada punto de contacto.", "Diseña, prueba, instala y personaliza la experiencia pública de LumenAI por canal, página y producto.", "Preview disponible", "Probar conversación", "/panel/chat", "widget", "#1477ff", "06", BotMessageSquare, ["DISEÑO", "EXPERIENCIA", "PUBLICACIÓN"]),
  chats: experience("chats", "/panel/chat", "Omnichannel Center · Chats", "Cada conversación.", "Con contexto completo.", "Opera canales, clientes, leads y derivaciones en modos AI, Copilot y Human desde un solo lugar.", "Espacio de trabajo", "Ver leads", "/panel/chat?view=leads", "chat", "#1477ff", "07", MessagesSquare, ["CLIENTE", "CONTEXTO", "PRÓXIMA ACCIÓN"]),
  knowledge: experience("knowledge", "/panel/knowledge", "Business Memory · Knowledge", "Todo lo que la empresa sabe.", "Siempre verificable.", "Centraliza productos, servicios, inventario, políticas, documentos y salud del conocimiento.", "Espacio de trabajo", "Revisar Calibration", "/panel/calibration", "knowledge", "#1477ff", "08", BrainCircuit, ["INFORMACIÓN", "VIGENCIA", "COBERTURA"]),
  interface: experience("interface", "/panel/interface", "Personal Workspace · Interface", "Un sistema profesional.", "Adaptado a ti.", "Personaliza la experiencia del propietario sin alterar el Widget que ven tus clientes.", "Preferencias locales", "Gestionar cuenta", "/panel/access", "appearance", "#1477ff", "09", Palette, ["TEMA", "DENSIDAD", "MOVIMIENTO"]),
  access: experience("access", "/panel/access", "Identity & Onboarding · Access", "Entra con seguridad.", "Empieza con claridad.", "Gestiona identidad, organización, roles, sesiones y el recorrido inicial de preparación empresarial.", "Identidad protegida", "Volver a Overview", "/panel/overview", "settings", "#1477ff", "11", ShieldCheck, ["IDENTIDAD", "ORGANIZACIÓN", "SEGURIDAD"]),
};

export function getModuleExperience(pathname: string): ModuleExperience {
  return EXPERIENCES[pillarFromPath(pathname).id] ?? EXPERIENCES.overview;
}

export function getModuleTour(id: string): ModuleTour {
  return MODULE_TOURS[id] ?? MODULE_TOURS.overview;
}
