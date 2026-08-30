import type { PulseRadarAction } from "@/lib/pulse-radar/types";

export type PulseSectionGuide = {
  id: string;
  label: string;
  title: string;
  summary: string;
  prompt: string;
  expression: string;
  actions: PulseRadarAction[];
};

const GUIDES: Array<{ prefix: string; guide: PulseSectionGuide }> = [
  guide("/panel/overview", "overview", "Overview", "Tu centro de mando", "Aquí reúno salud operativa, actividad reciente y prioridades para que sepas qué requiere atención primero.", "¿Qué debería priorizar hoy?", "greeting", "/panel/radar", "Revisar señales"),
  guide("/panel/lumenite", "lumenite", "LumenAI Action OS", "Convierte decisiones en acciones", "Desde aquí puedes preparar, revisar y ejecutar flujos operativos con trazabilidad y aprobación humana.", "Explícame cómo crear mi primera acción", "recommendation", "/panel/system-health", "Comprobar conexiones"),
  guide("/panel/calibration", "calibration", "Calibration Studio", "Define cómo debe responder LumenAI", "Calibra tono, objetivos, límites y criterios de calidad antes de publicar cambios en producción.", "Guíame para calibrar el asistente", "analyzing", "/panel/widget", "Ver el widget"),
  guide("/panel/autoconfig", "autoconfig", "Config IA", "Configura conversando conmigo", "Describe tu negocio en lenguaje natural y transformaré esa información en una configuración revisable, nunca en cambios críticos silenciosos.", "Ayúdame a configurar mi empresa", "thinking", "/panel/knowledge", "Revisar conocimiento"),
  guide("/panel/knowledge", "knowledge", "Knowledge", "La memoria verificable del sistema", "Organiza fuentes, documentos y respuestas para que el asistente trabaje con información aprobada y rastreable.", "¿Qué conocimiento me falta cargar?", "reading", "/panel/chat", "Probar respuestas"),
  guide("/panel/chat", "chat", "Chat", "Prueba conversaciones reales", "Ensaya preguntas, revisa fuentes y valida el comportamiento del asistente antes de exponerlo a clientes.", "Dame una prueba recomendada para este chat", "curious", "/panel/calibration", "Ajustar comportamiento"),
  guide("/panel/leads", "leads", "Leads", "Del interés a una oportunidad", "Aquí puedes revisar contactos, contexto de conversación, estado y próximos pasos sin perder trazabilidad.", "Resume los leads que necesitan seguimiento", "opportunity", "/panel/campaigns", "Abrir campañas"),
  guide("/panel/widget", "widget", "Widget", "La experiencia visible para tus clientes", "Personaliza, prueba y publica el widget manteniendo identidad, accesibilidad y conexión con tus datos reales.", "Hazme un recorrido por la configuración del widget", "greeting", "/panel/calibration", "Calibrar respuestas"),
  guide("/panel/radar", "radar", "Radar", "Señales antes que ruido", "Pulse prioriza anomalías, oportunidades y recomendaciones usando las señales disponibles en tu workspace.", "Explícame la señal más importante", "discovery", "/panel/system-health", "Ver salud técnica"),
  guide("/panel/lumen-eye", "lumen-eye", "Lumen Eye", "Observabilidad comprensible", "Inspecciona comportamiento, recorridos y eventos para entender qué ocurre y por qué.", "¿Qué patrón debería revisar aquí?", "analyzing", "/panel/radar", "Cruzar con Radar"),
  guide("/panel/research", "research", "Research", "Investiga con un objetivo claro", "Convierte preguntas de negocio en hallazgos estructurados, fuentes y decisiones accionables.", "Ayúdame a formular una investigación", "reading", "/panel/knowledge", "Guardar conocimiento"),
  guide("/panel/growth", "growth", "Growth", "Detecta palancas de crecimiento", "Relaciona adquisición, conversión y operación para identificar mejoras medibles.", "¿Dónde está la mayor oportunidad de crecimiento?", "opportunity", "/panel/campaigns", "Activar campaña"),
  guide("/panel/twin", "twin", "Business Twin", "Una lectura viva de tu empresa", "El gemelo sintetiza configuración, actividad y salud para simular escenarios y apoyar decisiones.", "Explícame el estado actual del Business Twin", "thinking", "/panel/overview", "Volver al centro"),
  guide("/panel/campaigns", "campaigns", "Campaigns", "Orquesta mensajes y seguimiento", "Diseña campañas, audiencias y resultados manteniendo control sobre cada envío y automatización.", "Guíame para preparar una campaña segura", "recommendation", "/panel/leads", "Revisar audiencia"),
  guide("/panel/settings", "settings", "Settings", "Control de cuenta y preferencias", "Administra identidad, equipo, seguridad y comportamiento general del workspace.", "¿Qué ajustes debería completar primero?", "reassuring", "/panel/system-health", "Validar configuración"),
  guide("/panel/color-mix", "color-mix", "Color Mix", "Una identidad consistente", "Define la expresión visual del sistema y comprueba contraste antes de aplicarla al widget y al panel.", "Ayúdame a elegir una combinación accesible", "curious", "/panel/widget", "Aplicar al widget"),
  guide("/panel/system-health", "system-health", "System Health", "Comprueba que todo esté listo", "Revisa servicios, credenciales e integraciones. Te explicaré el impacto de cada advertencia sin exponer secretos.", "Explícame los errores y cómo resolverlos", "analyzing", "/panel/settings", "Abrir ajustes"),
];

function guide(
  prefix: string,
  id: string,
  label: string,
  title: string,
  summary: string,
  prompt: string,
  expression: string,
  actionHref: string,
  actionLabel: string,
) {
  return {
    prefix,
    guide: {
      id,
      label,
      title,
      summary,
      prompt,
      expression,
      actions: [
        {
          id: `guide-${id}-action`,
          label: actionLabel,
          href: actionHref,
          kind: "secondary" as const,
        },
      ],
    },
  };
}

export function pulseSectionGuideFromPath(pathname: string): PulseSectionGuide {
  return (
    GUIDES.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.guide ?? GUIDES[0].guide
  );
}
