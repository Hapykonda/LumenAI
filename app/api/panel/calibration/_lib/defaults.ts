// app/api/panel/calibration/_lib/defaults.ts
export type CalibrationSettings = any;

/** Default calibración para inicializar DB */
export function defaultDraft(): CalibrationSettings {
  return {
    schemaVersion: 1,
    calibration: {
      identity: {
        brandName: "",
        assistantName: "LumenAI",
        voicePronoun: "nosotros",
        values: ["Profesionalismo", "Cercanía", "Claridad"],
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
        qualification: "medium",
        proactivity: 70,
        closing: 75,
        allowUrgency: false,
        objectionHandling: {
          price: true,
          time: true,
          trust: true,
          comparison: true,
        },
      },
      guardrails: {
        dontDo: [],
        escalate: { enabled: true, when: ["pide_humano", "enojo", "urgente"] },
        hours: {
          enabled: false,
          timezone: "America/Santiago",
          textOutOfHours:
            "Ahora mismo no estamos disponibles, pero te ayudo igual y si quieres te derivamos.",
        },
      },
    },
    widget: {
      widgetEnabled: true,
      greeting: "HOLA 👋\n¿En qué puedo ayudarte hoy?",
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
