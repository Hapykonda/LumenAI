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
      savedProfiles?: Array<Record<string, any>>;
    };
    brandBrief: Record<string, string>;
    lexicon: {
      locale: "es-CL" | "es-419";
      formality: "tu" | "usted" | "mixto";
      allowedPhrases: string[];
      forbiddenPhrases: string[];
      dictionary: Record<string, string>;
    };
    sales: any;
    guardrails: any;
  };
  widget: any;
  compiled: any;
};
