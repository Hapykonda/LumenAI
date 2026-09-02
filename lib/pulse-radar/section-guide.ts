import type { PulseRadarAction } from "@/lib/pulse-radar/types";
import { pillarFromPath } from "@/lib/lumenai/pillars";

export type PulseSectionGuide = {
  id: string;
  label: string;
  title: string;
  summary: string;
  prompt: string;
  expression: string;
  actions: PulseRadarAction[];
};

const GUIDES: Record<string, PulseSectionGuide> = {
  overview: guide("overview", "Overview", "Tu centro de mando", "Aquí reúno salud empresarial, cambios, actividad, impacto y decisiones pendientes. Cada detalle abre el pilar que realmente lo administra.", "¿Qué debería priorizar hoy?", "greeting", "/panel/radar", "Abrir Pulse Brief"),
  calibration: guide("calibration", "Calibration", "La identidad inteligente de tu empresa", "Calibration define cómo somos, cómo hablamos, cómo vendemos y qué jamás debería decir LumenAI.", "Ayúdame a revisar la Brand Constitution", "analyzing", "/panel/autoconfig", "Optimizar con Config AI"),
  "config-ai": guide("config-ai", "Config AI", "Configura conversando conmigo", "Describe el resultado que quieres; prepararé cambios, detectaré contradicciones y te mostraré una vista previa antes de aplicar nada.", "Quiero mejorar mi configuración", "thinking", "/panel/calibration", "Revisar Calibration"),
  "lumen-eye": guide("lumen-eye", "Lumen Eye", "Inteligencia del negocio hacia dentro", "Aquí observo tráfico, clientes, conversaciones, embudos, campañas y conversiones para encontrar pérdidas, patrones y oportunidades internas.", "¿Qué patrón interno debería revisar?", "analyzing", "/panel/radar", "Interpretar con Pulse"),
  "pulse-radar": guide("pulse-radar", "Pulse Radar", "Tu AI Chief of Staff", "Interpreto señales de todos los pilares, preparo recomendaciones y recuerdo comprobar si las decisiones anteriores funcionaron.", "Dame el Daily Brief", "discovery", "/panel/overview?view=decisions", "Ver decisiones pendientes"),
  research: guide("research", "Research", "Inteligencia del mundo exterior", "Research investiga mercado, competencia, precios y tendencias con fuente, fecha, evidencia, confianza y vigencia.", "Ayúdame a formular una investigación", "reading", "/panel/knowledge", "Guardar en Knowledge"),
  widget: guide("widget", "Widget", "La experiencia que ve el cliente", "Diseña, prueba e instala el asistente público. La personalización de tu propio panel vive separada en Interface.", "Hazme un recorrido por Widget", "greeting", "/panel/chat", "Probar en Chats"),
  chats: guide("chats", "Chats", "Conversaciones omnicanal", "Widget, WhatsApp, Instagram, correo y futuros canales viven aquí con modos AI, Copilot y Human.", "Resume las conversaciones que necesitan seguimiento", "curious", "/panel/chat?view=leads", "Filtrar leads"),
  knowledge: guide("knowledge", "Knowledge", "La memoria verificable del negocio", "Productos, servicios, inventario, políticas, FAQ y documentos alimentan a LumenAI desde una sola fuente empresarial.", "¿Qué conocimiento me falta completar?", "reading", "/panel/calibration", "Alinear la marca"),
  interface: guide("interface", "Interface", "Tu workspace personal", "Personaliza tema, densidad, movimiento y operador del propietario sin cambiar el Widget que ven tus clientes.", "Ayúdame a elegir una interfaz accesible", "curious", "/panel/interface?view=connections", "Gestionar conexiones"),
  access: guide("access", "Access", "Identidad y comienzo seguro", "Aquí viven cuenta, organización, roles, permisos, sesiones y onboarding; por eso Access no ocupa un lugar operativo en el menú.", "¿Qué falta para completar mi cuenta?", "reassuring", "/panel/access?view=security", "Revisar seguridad"),
};

function guide(
  id: string,
  label: string,
  title: string,
  summary: string,
  prompt: string,
  expression: string,
  actionHref: string,
  actionLabel: string,
): PulseSectionGuide {
  return {
    id,
    label,
    title,
    summary,
    prompt,
    expression,
    actions: [{ id: `guide-${id}-action`, label: actionLabel, href: actionHref, kind: "secondary" }],
  };
}

export function pulseSectionGuideFromPath(pathname: string): PulseSectionGuide {
  return GUIDES[pillarFromPath(pathname).id] ?? GUIDES.overview;
}
