// app/panel/calibration/types.ts
export type CalibrationDoc = {
  schemaVersion: number;
  calibration: {
    identity: {
      brandName: string;
      assistantName: string;
      voicePronoun: "nosotros" | "yo";
      values: string[];
      tagline: string;
      primaryCTA: "whatsapp" | "email" | "agenda" | "comprar";
    };
    personality: {
      mix: Record<string, number>;
      rules: {
        reflectUnderstandingFirst: boolean;
        maxOptions: number;
        endWithQuestionOrCTA: boolean;
      };
      freeNotes: string;
      savedProfiles?: Array<Record<string, unknown>>;
    };
    brandBrief: Record<string, string>;
    lexicon: {
      locale: "es-CL" | "es-419";
      formality: "tu" | "usted" | "mixto";
      allowedPhrases: string[];
      forbiddenPhrases: string[];
      dictionary: Record<string, string>;
    };
    sales: {
      profileId: string;
      psychologyDefault: boolean;
      qualification: string;
      proactivity: number;
      closing: number;
      allowUrgency: boolean;
      discoveryModel: string;
      closingStyle: string;
      objectionPlaybook: string;
      objectionHandling: Record<string, boolean>;
    };
    guardrails: {
      dontDo: string[];
      escalate: { enabled: boolean; when: string[] };
      hours: {
        enabled: boolean;
        timezone: string;
        textOutOfHours: string;
      };
    };
  };
  widget: {
    widgetEnabled: boolean;
    greeting: string;
    whatsapp: string;
    email: string;
    allowedParentOrigin: string | null;
    quickActions: string[];
    position?: "br" | "bl" | "tr" | "tl";
    theme: {
      primaryColor: string;
      gradientFrom: string;
      gradientTo: string;
      fontFamily: string;
      material: string;
      launcherType: string;
      launcherText: string;
      showBranding: boolean;
    };
  };
  compiled: {
    brandMemory: string;
    doRules: string[];
    dontRules: string[];
    examplePhrases: string[];
    updatedAt: string | null;
  };
};
