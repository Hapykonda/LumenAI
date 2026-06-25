import type { CalibrationDoc } from "./types";

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(a: unknown, b: unknown): unknown {
  if (!isObj(a) || !isObj(b)) return b;
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = isObj(out[k]) && isObj(b[k]) ? deepMerge(out[k], b[k]) : b[k];
  }
  return out;
}

export function defaultDraft(): CalibrationDoc {
  return {
    schemaVersion: 1,
    calibration: {
      identity: {
        brandName: "",
        assistantName: "LumenAI",
        voicePronoun: "nosotros",
        values: ["Profesionalismo", "Cercanía", "Claridad", "Velocidad"],
        tagline: "",
        primaryCTA: "whatsapp",
      },
      personality: {
        mix: {
          joy: 45,
          energy: 55,
          sobriety: 40,
          elegance: 60,
          closeness: 65,
          empathy: 70,
          brevity: 60,
          directivity: 70,
          humor: 15,
          audacity: 35,
        },
        rules: {
          reflectUnderstandingFirst: true,
          maxOptions: 2,
          endWithQuestionOrCTA: true,
        },
        freeNotes: "",
        savedProfiles: [],
      },
      brandBrief: {
        story: "",
        differentiation: "",
        idealCustomer: "",
        objections: "",
        promises: "",
        howToSound: "",
        howNotToSound: "",
        extraRules: "",
      },
      lexicon: {
        locale: "es-CL",
        formality: "tu",
        allowedPhrases: [],
        forbiddenPhrases: [],
        dictionary: {},
      },
      sales: {
        profileId: "elite-consultive",
        psychologyDefault: true,
        qualification: "high",
        proactivity: 78,
        closing: 82,
        allowUrgency: false,
        discoveryModel:
          "SPIN ligero: situación, problema, impacto y resultado esperado. Una sola pregunta clave por turno.",
        closingStyle:
          "Cierre suave con micro-compromiso: pedir contacto, agenda o el dato mínimo para avanzar.",
        objectionPlaybook:
          "Validar la objeción, reencuadrar con valor real, reducir riesgo y pedir un siguiente paso claro.",
        objectionHandling: { price: true, time: true, trust: true, comparison: true },
      },
      guardrails: {
        dontDo: [],
        escalate: { enabled: true, when: ["pide_humano", "enojo", "urgente"] },
        hours: {
          enabled: false,
          timezone: "America/Santiago",
          textOutOfHours: "Ahora mismo no estamos disponibles, pero te ayudo igual y si quieres te derivamos.",
        },
      },
    },
    widget: {
      widgetEnabled: true,
      greeting: "Hola, soy LumenAI.\n¿En qué puedo ayudarte hoy?",
      whatsapp: "",
      email: "",
      allowedParentOrigin: null,
      quickActions: ["Quiero cotizar", "¿Qué servicios ofrecen?", "Horarios", "Hablar con un humano"],
      theme: {
        primaryColor: "#00E5FF",
        gradientFrom: "#00E5FF",
        gradientTo: "#1B43FF",
        fontFamily:
          `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, system-ui, Segoe UI, Roboto, Arial`,
        material: "dark",
        launcherType: "orb",
        launcherText: "¿En qué te ayudo?",
        showBranding: true,
      },
    },
    compiled: {
      brandMemory: "",
      doRules: [],
      dontRules: [],
      examplePhrases: [],
      updatedAt: null,
    },
  };
}

export function ensureShape(input: unknown): CalibrationDoc {
  return deepMerge(defaultDraft(), input ?? {}) as CalibrationDoc;
}
