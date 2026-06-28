import { NextResponse } from "next/server";
import { ensureShape } from "@/app/panel/calibration/defaults";
import type { CalibrationDoc } from "@/app/panel/calibration/types";
import {
  getOrCreateCalibrationRow,
  jsonError,
  requireUserBusiness,
} from "../calibration/_lib";
import { callGroqChat, getGroqStatus } from "@/lib/ai/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObj = Record<string, unknown>;

type Snapshot = {
  business: { id: string; name: string; publicKey: string | null };
  checks: Record<string, boolean>;
  stats: Record<string, number>;
  draft: CalibrationDoc;
  published: CalibrationDoc | null;
  knowledge: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    is_published: boolean;
  }>;
  leads: Array<{
    status: string;
    score: number;
    intent: string | null;
    summary: string | null;
  }>;
  recentMessages: Array<{
    sender_type: string;
    content: string;
  }>;
  automations: Array<{
    key: string;
    name: string;
    enabled: boolean;
    trigger_type: string;
    action_type: string;
  }>;
};

type Proposal = {
  title: string;
  summary: string;
  confidence: number;
  patch: Partial<CalibrationDoc>;
  actions: string[];
  knowledgeItems: Array<{ type: string; title: string; content: string }>;
  automationRules: Array<{
    key: string;
    name: string;
    trigger_type: string;
    action_type: string;
    enabled: boolean;
    requires_human_approval: boolean;
    config: JsonObj;
  }>;
  blocked: string[];
};

type AutoconfigMode = "chat" | "proposal" | "executed";

type OperationalAction =
  | {
      type: "knowledge_upsert";
      kbType: "services" | "pricing" | "faq" | "policy" | "contact" | "payment" | "other";
      title: string;
      content: string;
      publish?: boolean;
      source?: string;
    }
  | {
      type: "knowledge_delete";
      query: string;
    }
  | {
      type: "widget_patch";
      patch: {
        primaryColor?: string;
        gradientFrom?: string;
        gradientTo?: string;
        greeting?: string;
        assistantName?: string;
        avatarUrl?: string;
        brandLogoUrl?: string;
        widgetEnabled?: boolean;
      };
    }
  | {
      type: "profile_patch";
      whatsapp?: string;
      email?: string;
      avatarUrl?: string;
      logoUrl?: string;
    }
  | {
      type: "hours_patch";
      hours: JsonObj;
    }
  | {
      type: "automation_upsert";
      key: string;
      name: string;
      trigger_type: string;
      action_type: string;
      config?: JsonObj;
    };

type OperationalResult = {
  type: string;
  title: string;
  detail: string;
};

type SnapshotRecord = {
  id: string;
  previous_config: unknown;
  new_config: unknown;
  user_prompt: string | null;
  action_type: string | null;
  created_at: string;
};

function isObj(value: unknown): value is JsonObj {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value: unknown, max = 1400) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function titleCaseWords(value: string) {
  return clean(value, 140)
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : word.slice(0, 1).toUpperCase() + word.slice(1)
    )
    .join(" ")
    .trim();
}

function parsePrice(message: string) {
  const match =
    message.match(
      /(?:precio\s*(?:de|es|:)?\s*|cuesta\s*|vale\s*|por\s*)?(?:usd\s*)?\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:usd|dolares|dólares|dolar|dólar|us\$)?/i
    ) || null;

  if (!match) return null;

  const numeric = match[1]?.replace(",", ".");
  if (!numeric || Number.isNaN(Number(numeric))) return null;

  const hasUsd = /usd|dolares|dólares|dolar|dólar|us\$|\$/.test(match[0].toLowerCase());
  return `${numeric}${hasUsd ? " USD" : ""}`.trim();
}

function parseCommercialPrice(message: string) {
  const match = message.match(
    /(?:precio\s*(?:de|es|:)?\s*|cuesta\s*|vale\s*|por\s*)?(?:clp|usd|us\$)?\s*\$?\s*(\d[\d.,]*)(?:\s*(clp|usd|dolares|dolar|pesos|us\$))?/i
  );

  if (!match) return parsePrice(message);

  const numeric = clean(match[1], 40);
  if (!numeric || !/\d/.test(numeric)) return parsePrice(message);

  const rawCurrency = `${match[2] || ""} ${message}`.toLowerCase();
  const currency = /clp|peso/.test(rawCurrency)
    ? "CLP"
    : /usd|dolares|dolar|us\$/.test(rawCurrency)
    ? "USD"
    : /\$/.test(match[0])
    ? "$"
    : "";

  return `${numeric}${currency ? ` ${currency}` : ""}`.trim();
}

function parseProductName(message: string) {
  const patterns = [
    /(?:producto|servicio|item|articulo|artículo)\s+(?:nuevo\s+)?(?:que\s+)?(?:se\s+llama|llamado|nombre|de\s+nombre)\s+(.+?)(?:,|\.|;|\s+que\s+esta|\s+que\s+está|\s+disponible|\s+precio|\s+cuesta|\s+vale|\s+por\s+\$|$)/i,
    /(?:agrega|añade|anade|crea|incorpora|registra|sube)\s+(?:un\s+|una\s+|el\s+|la\s+)?(?:nuevo\s+|nueva\s+)?(?:producto|servicio|item|articulo|artículo)\s+(.+?)(?:,|\.|;|\s+que\s+esta|\s+que\s+está|\s+disponible|\s+precio|\s+cuesta|\s+vale|\s+por\s+\$|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const raw = clean(match?.[1], 140)
      .replace(/^(que\s+se\s+llama|llamado|nombre)\s+/i, "")
      .replace(/\s+(con|a|en)\s*$/i, "");

    if (raw) return titleCaseWords(raw);
  }

  return null;
}

function parseColors(message: string) {
  const normalized = normText(message);
  if (/todos los colores|todo color|colores disponibles|cualquier color/.test(normalized)) {
    return "Disponible en todos los colores.";
  }

  const match = message.match(/colores?\s*(?:disponibles|:|son|en)?\s+(.+?)(?:,|\.|;|\s+precio|\s+cuesta|\s+vale|$)/i);
  const value = clean(match?.[1], 220);
  return value ? `Colores disponibles: ${value}.` : "";
}

function buildDeterministicActions(message: string): OperationalAction[] {
  const normalized = normText(message);
  const actions: OperationalAction[] = [];
  const isDelete = /(elimina|borra|quita|remueve|despublica)/.test(normalized);
  const mentionsProduct = /(producto|servicio|item|articulo|artículo|zapatilla|sneaker|nocta|snide)/.test(normalized);
  const wantsProductWrite =
    mentionsProduct &&
    /(agrega|añade|anade|crea|incorpora|registra|sube|nuevo|nueva|actualiza|edita|cambia|modifica)/.test(
      normalized
    );

  if (isDelete && mentionsProduct) {
    const name = parseProductName(message) || clean(message.replace(/^(elimina|borra|quita|remueve)\s+/i, ""), 120);
    if (name) {
      actions.push({
        type: "knowledge_delete",
        query: name,
      });
    }
    return actions;
  }

  if (wantsProductWrite) {
    const name = parseProductName(message);
    const price = parseCommercialPrice(message);
    const colors = parseColors(message);

    if (name) {
      const productContent = [
        `Producto: ${name}.`,
        colors || null,
        price ? `Precio informado: ${price}.` : null,
        "Estado: disponible para venta y respuesta del asistente.",
      ]
        .filter(Boolean)
        .join("\n");

      actions.push({
        type: "knowledge_upsert",
        kbType: "services",
        title: `Producto - ${name}`,
        content: productContent,
        publish: true,
        source: "product_command",
      });

      if (price) {
        actions.push({
          type: "knowledge_upsert",
          kbType: "pricing",
          title: `Precio - ${name}`,
          content: [`${name}: ${price}.`, colors || null].filter(Boolean).join("\n"),
          publish: true,
          source: "product_price_command",
        });
      }
    }
  }

  if (/(transferencia|paypal|mercado\s*pago|stripe|tarjeta|efectivo|pago)/.test(normalized)) {
    const paymentLines = [
      /transferencia/.test(normalized) ? "Aceptar pago por transferencia." : null,
      /paypal/.test(normalized) ? "Aceptar pago por PayPal." : null,
      /mercado\s*pago/.test(normalized) ? "Aceptar pago por Mercado Pago." : null,
      /stripe|tarjeta/.test(normalized) ? "Aceptar pago con tarjeta." : null,
      /efectivo/.test(normalized) ? "Aceptar pago en efectivo si el negocio lo confirma." : null,
    ].filter(Boolean);

    if (paymentLines.length) {
      actions.push({
        type: "knowledge_upsert",
        kbType: "payment",
        title: "Metodos de pago",
        content: paymentLines.join("\n"),
        publish: true,
        source: "payment_command",
      });
    }
  }

  if (/(horario|lunes a viernes|lun a vie|lunes.*viernes)/.test(normalized)) {
    actions.push({
      type: "hours_patch",
      hours: {
        mon: { open: true, from: "09:00", to: "18:00" },
        tue: { open: true, from: "09:00", to: "18:00" },
        wed: { open: true, from: "09:00", to: "18:00" },
        thu: { open: true, from: "09:00", to: "18:00" },
        fri: { open: true, from: "09:00", to: "18:00" },
        sat: { open: false, from: "10:00", to: "14:00" },
        sun: { open: false, from: "10:00", to: "14:00" },
      },
    });
  }

  const hexColors = message.match(/#[0-9a-fA-F]{6}/g) ?? [];
  if (/(color|colores|tema|panel|widget|marca|branding)/.test(normalized) && hexColors.length) {
    actions.push({
      type: "widget_patch",
      patch: {
        primaryColor: hexColors[0],
        gradientFrom: hexColors[0],
        gradientTo: hexColors[1] ?? hexColors[0],
      },
    });
  }

  const email = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = message.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0];
  const imageUrl = message.match(
    /https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s"'<>]+)?/i
  )?.[0];

  if (imageUrl && /(avatar|foto|logo|imagen|perfil|marca)/.test(normalized)) {
    actions.push({
      type: "profile_patch",
      ...(/(logo|marca)/.test(normalized)
        ? { logoUrl: imageUrl }
        : { avatarUrl: imageUrl }),
    });
  }

  if (/(whatsapp|telefono|teléfono|email|correo|contacto|perfil)/.test(normalized) && (email || phone)) {
    actions.push({
      type: "profile_patch",
      ...(email ? { email } : {}),
      ...(phone ? { whatsapp: phone.replace(/[^\d+]/g, "") } : {}),
    });
  }

  if (/(agenda|agendar|reunion|reunión|cita|calendario)/.test(normalized)) {
    actions.push({
      type: "automation_upsert",
      key: "meeting-request-intake",
      name: "Capturar solicitudes de reunion",
      trigger_type: "message_intent",
      action_type: "panel_recommendation",
      config: {
        intent: "meeting_request",
        instruction:
          "Cuando un cliente pida reunion, capturar nombre, contacto, motivo, fecha ideal y derivar al operador.",
      },
    });
  }

  return actions;
}

function asNumber(value: unknown, fallback: number, min = 0, max = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function asStringArray(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clean(item, 120))
    .filter(Boolean)
    .slice(0, maxItems);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isObj(base) || !isObj(patch)) return (patch ?? base) as T;

  const out: JsonObj = { ...(base as JsonObj) };

  for (const key of Object.keys(patch)) {
    const next = patch[key];
    const current = out[key];
    out[key] =
      isObj(current) && isObj(next) ? deepMerge(current, next) : next;
  }

  return out as T;
}

function normalizeHex(value: unknown, fallback: string) {
  const raw = clean(value, 24);
  if (!raw) return fallback;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function sanitizePatch(raw: unknown, fallback: CalibrationDoc): Partial<CalibrationDoc> {
  if (!isObj(raw)) return {};

  const patch: Partial<CalibrationDoc> = {};

  if (isObj(raw.calibration)) {
    const calibration: JsonObj = {};

    if (isObj(raw.calibration.identity)) {
      const identity = raw.calibration.identity;
      calibration.identity = {
        ...(clean(identity.brandName) ? { brandName: clean(identity.brandName, 120) } : {}),
        ...(clean(identity.assistantName) ? { assistantName: clean(identity.assistantName, 80) } : {}),
        ...(identity.voicePronoun === "yo" || identity.voicePronoun === "nosotros"
          ? { voicePronoun: identity.voicePronoun }
          : {}),
        ...(Array.isArray(identity.values) ? { values: asStringArray(identity.values, 6) } : {}),
        ...(clean(identity.tagline) ? { tagline: clean(identity.tagline, 160) } : {}),
        ...(identity.primaryCTA === "whatsapp" ||
        identity.primaryCTA === "email" ||
        identity.primaryCTA === "agenda" ||
        identity.primaryCTA === "comprar"
          ? { primaryCTA: identity.primaryCTA }
          : {}),
      };
    }

    if (isObj(raw.calibration.personality)) {
      const personality = raw.calibration.personality;
      const mix = isObj(personality.mix) ? personality.mix : {};
      const rules = isObj(personality.rules) ? personality.rules : {};
      calibration.personality = {
        ...(Object.keys(mix).length
          ? {
              mix: Object.fromEntries(
                Object.entries(mix).map(([key, value]) => [
                  key,
                  asNumber(value, Number(fallback.calibration.personality.mix[key] ?? 50)),
                ])
              ),
            }
          : {}),
        ...(Object.keys(rules).length
          ? {
              rules: {
                ...(typeof rules.reflectUnderstandingFirst === "boolean"
                  ? { reflectUnderstandingFirst: rules.reflectUnderstandingFirst }
                  : {}),
                ...(typeof rules.endWithQuestionOrCTA === "boolean"
                  ? { endWithQuestionOrCTA: rules.endWithQuestionOrCTA }
                  : {}),
                ...(rules.maxOptions
                  ? { maxOptions: asNumber(rules.maxOptions, 2, 1, 5) }
                  : {}),
              },
            }
          : {}),
        ...(clean(personality.freeNotes)
          ? { freeNotes: clean(personality.freeNotes, 1200) }
          : {}),
      };
    }

    for (const key of ["brandBrief", "sales", "guardrails"] as const) {
      const value = raw.calibration[key];
      if (isObj(value)) calibration[key] = value;
    }

    if (isObj(raw.calibration.lexicon)) {
      const lexicon = raw.calibration.lexicon;
      calibration.lexicon = {
        ...(lexicon.locale === "es-CL" || lexicon.locale === "es-419"
          ? { locale: lexicon.locale }
          : {}),
        ...(lexicon.formality === "tu" ||
        lexicon.formality === "usted" ||
        lexicon.formality === "mixto"
          ? { formality: lexicon.formality }
          : {}),
        ...(Array.isArray(lexicon.allowedPhrases)
          ? { allowedPhrases: asStringArray(lexicon.allowedPhrases, 12) }
          : {}),
        ...(Array.isArray(lexicon.forbiddenPhrases)
          ? { forbiddenPhrases: asStringArray(lexicon.forbiddenPhrases, 12) }
          : {}),
        ...(isObj(lexicon.dictionary) ? { dictionary: lexicon.dictionary } : {}),
      };
    }

    patch.calibration = calibration as CalibrationDoc["calibration"];
  }

  if (isObj(raw.widget)) {
    const widget = raw.widget;
    patch.widget = {
      ...(typeof widget.widgetEnabled === "boolean"
        ? { widgetEnabled: widget.widgetEnabled }
        : {}),
      ...(clean(widget.greeting) ? { greeting: clean(widget.greeting, 500) } : {}),
      ...(clean(widget.whatsapp) ? { whatsapp: clean(widget.whatsapp, 80) } : {}),
      ...(clean(widget.email) ? { email: clean(widget.email, 120) } : {}),
      ...(Array.isArray(widget.quickActions)
        ? { quickActions: asStringArray(widget.quickActions, 6) }
        : {}),
      ...(widget.position === "br" ||
      widget.position === "bl" ||
      widget.position === "tr" ||
      widget.position === "tl"
        ? { position: widget.position }
        : {}),
      ...(isObj(widget.theme)
        ? {
            theme: {
              ...(widget.theme.primaryColor
                ? {
                    primaryColor: normalizeHex(
                      widget.theme.primaryColor,
                      fallback.widget.theme.primaryColor
                    ),
                  }
                : {}),
              ...(widget.theme.gradientFrom
                ? {
                    gradientFrom: normalizeHex(
                      widget.theme.gradientFrom,
                      fallback.widget.theme.gradientFrom
                    ),
                  }
                : {}),
              ...(widget.theme.gradientTo
                ? {
                    gradientTo: normalizeHex(
                      widget.theme.gradientTo,
                      fallback.widget.theme.gradientTo
                    ),
                  }
                : {}),
              ...(clean(widget.theme.fontFamily, 260)
                ? { fontFamily: clean(widget.theme.fontFamily, 260) }
                : {}),
              ...(clean(widget.theme.material, 60)
                ? { material: clean(widget.theme.material, 60) }
                : {}),
              ...(clean(widget.theme.launcherType, 60)
                ? { launcherType: clean(widget.theme.launcherType, 60) }
                : {}),
              ...(clean(widget.theme.launcherText, 100)
                ? { launcherText: clean(widget.theme.launcherText, 100) }
                : {}),
              ...(typeof widget.theme.showBranding === "boolean"
                ? { showBranding: widget.theme.showBranding }
                : {}),
            },
          }
        : {}),
    };
  }

  return patch;
}

function sanitizeKnowledgeItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isObj(item)) return null;
      const title = clean(item.title, 120);
      const content = clean(item.content, 1800);
      if (!title || !content) return null;

      return {
        type: clean(item.type, 40) || "other",
        title,
        content,
      };
    })
    .filter(Boolean)
    .slice(0, 5) as Array<{ type: string; title: string; content: string }>;
}

function sanitizeAutomationRules(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isObj(item)) return null;
      const key = clean(item.key, 80)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const name = clean(item.name, 120);
      if (!key || !name) return null;

      return {
        key,
        name,
        trigger_type: clean(item.trigger_type, 80) || "lead_created",
        action_type: clean(item.action_type, 80) || "panel_recommendation",
        enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        requires_human_approval:
          typeof item.requires_human_approval === "boolean"
            ? item.requires_human_approval
            : true,
        config: isObj(item.config) ? item.config : {},
      };
    })
    .filter(Boolean)
    .slice(0, 4) as Proposal["automationRules"];
}

function hasPatch(patch: Partial<CalibrationDoc>) {
  return Object.keys(patch.calibration ?? {}).length > 0 || Object.keys(patch.widget ?? {}).length > 0;
}

function buildFallbackProposal(message: string, snapshot: Snapshot): Proposal {
  const draft = snapshot.draft;
  const lower = message.toLowerCase();
  const wantsCompleteSetup =
    /configura|calibra|optimiza|listo|presentable|completo|todo|ventas|widget|panel/.test(
      lower
    );
  const missingKb = snapshot.stats.kb_published === 0;
  const missingAutomations = snapshot.automations.length === 0;

  const patch: Partial<CalibrationDoc> = {
    calibration: {
      identity: {
        brandName:
          draft.calibration.identity.brandName || snapshot.business.name || "Tu negocio",
        assistantName: draft.calibration.identity.assistantName || "LumenAI",
        voicePronoun: draft.calibration.identity.voicePronoun || "nosotros",
        values: ["Claridad", "Velocidad", "Confianza", "Precision comercial"],
        tagline:
          draft.calibration.identity.tagline ||
          "Atencion inteligente, clara y orientada a conversion.",
        primaryCTA: draft.calibration.identity.primaryCTA || "whatsapp",
      },
      personality: {
        mix: {
          ...draft.calibration.personality.mix,
          sobriety: 78,
          elegance: 84,
          empathy: 76,
          brevity: 70,
          directivity: 78,
          humor: 10,
        },
        rules: {
          reflectUnderstandingFirst: true,
          maxOptions: 2,
          endWithQuestionOrCTA: true,
        },
        freeNotes:
          "Interpretar primero la intencion del cliente, resumir lo entendido y avanzar con una pregunta o accion concreta. No saturar con opciones.",
      },
      brandBrief: {
        ...draft.calibration.brandBrief,
        howToSound:
          "Profesional, directo, elegante y humano. Debe sonar como un asesor experto que entiende el contexto antes de vender.",
        howNotToSound:
          "No sonar generico, desesperado por vender, robotico ni prometer datos no publicados.",
        extraRules:
          "Si faltan datos, pedir el dato minimo necesario. Si hay interes comercial, capturar contacto y siguiente paso.",
      },
      lexicon: {
        ...draft.calibration.lexicon,
        formality: draft.calibration.lexicon.formality || "tu",
        allowedPhrases: [
          "Entiendo lo que buscas.",
          "Para orientarte mejor, dime esto:",
          "El siguiente paso recomendado es",
        ],
        forbiddenPhrases: ["No lo se", "Como IA", "No puedo ayudarte"],
      },
      sales: {
        ...draft.calibration.sales,
        qualification: "high",
        proactivity: 84,
        closing: 86,
        allowUrgency: false,
        discoveryModel:
          "Diagnostico breve: necesidad, presupuesto aproximado, urgencia y resultado esperado. Una pregunta por turno.",
        closingStyle:
          "Cierre consultivo: proponer siguiente paso claro sin presion falsa.",
        objectionPlaybook:
          "Validar la objecion, explicar valor real, reducir riesgo y pedir un micro-compromiso.",
      },
      guardrails: {
        ...draft.calibration.guardrails,
        dontDo: [
          "Inventar precios, horarios, garantias o politicas.",
          "Prometer resultados sin datos publicados.",
          "Presionar al cliente con urgencia falsa.",
        ],
        escalate: {
          enabled: true,
          when: ["pide_humano", "enojo", "urgente", "reclamo", "pago"],
        },
      },
    },
    widget: {
      ...draft.widget,
      widgetEnabled: wantsCompleteSetup ? true : draft.widget.widgetEnabled,
      greeting:
        draft.widget.greeting ||
        "Hola, soy {assistant}. Te ayudo a resolver dudas y encontrar el siguiente paso.",
      quickActions: [
        "Quiero cotizar",
        "Ver servicios",
        "Precios y pagos",
        "Hablar con un humano",
      ],
      theme: {
        ...draft.widget.theme,
        primaryColor: "#00E5FF",
        gradientFrom: "#00E5FF",
        gradientTo: "#1B43FF",
        material: "obsidian-glass",
        launcherType: "dock",
        launcherText: "Hablar con LumenAI",
      },
    },
  };

  return {
    title: "Calibracion ejecutiva recomendada",
    summary:
      "Prepare un ajuste seguro para que LumenAI sea mas claro, elegante y comercial: tono consultivo, widget activo, reglas de venta, guardrails y acciones rapidas.",
    confidence: 82,
    patch,
    actions: [
      "Aplicar borrador de calibracion",
      "Publicar calibracion cuando el preview sea correcto",
      "Completar Knowledge con servicios, precios, pagos y politicas",
    ],
    knowledgeItems: missingKb
      ? [
          {
            type: "faq",
            title: "Base minima para LumenAI",
            content:
              "Completar servicios, precios, horarios, formas de pago, garantias, politicas y datos de contacto antes de depender del asistente en produccion.",
          },
        ]
      : [],
    automationRules: missingAutomations
      ? [
          {
            key: "lead-follow-up-priority",
            name: "Priorizar seguimiento de leads nuevos",
            trigger_type: "lead_created",
            action_type: "panel_recommendation",
            enabled: true,
            requires_human_approval: true,
            config: {
              priority: "high",
              instruction:
                "Avisar al operador que revise leads nuevos y preparar siguiente paso sugerido.",
            },
          },
        ]
      : [],
    blocked: [],
  };
}

async function readSnapshot(ctx: Awaited<ReturnType<typeof requireUserBusiness>>) {
  if (!ctx.admin || !ctx.business) {
    throw new Error("No hay negocio activo");
  }

  const { draft, published } = await getOrCreateCalibrationRow({
    admin: ctx.admin,
    businessId: ctx.business.id,
    publicKey: ctx.business.public_key,
  });

  const [kbResult, leadsResult, messagesResult, automationsResult] =
    await Promise.all([
      ctx.admin
        .from("business_kb")
        .select("id,type,title,content,is_published")
        .eq("business_id", ctx.business.id)
        .order("updated_at", { ascending: false })
        .limit(80),
      ctx.admin
        .from("leads")
        .select("status,score,intent,summary")
        .eq("business_id", ctx.business.id)
        .order("created_at", { ascending: false })
        .limit(60),
      ctx.admin
        .from("chat_messages")
        .select("sender_type,content")
        .eq("business_id", ctx.business.id)
        .order("created_at", { ascending: false })
        .limit(40),
      ctx.admin
        .from("lumenai_automation_rules")
        .select("key,name,enabled,trigger_type,action_type")
        .eq("business_id", ctx.business.id)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

  const knowledge = Array.isArray(kbResult.data) ? kbResult.data : [];
  const leads = Array.isArray(leadsResult.data) ? leadsResult.data : [];
  const recentMessages = Array.isArray(messagesResult.data)
    ? messagesResult.data
    : [];
  const automations = Array.isArray(automationsResult.data)
    ? automationsResult.data
    : [];
  const publishedKb = knowledge.filter((item) => item.is_published);
  const stats = {
    kb_total: knowledge.length,
    kb_published: publishedKb.length,
    kb_services: knowledge.filter((item) => item.type === "services").length,
    kb_pricing: knowledge.filter((item) => item.type === "pricing").length,
    leads_total: leads.length,
    leads_hot: leads.filter((lead) => Number(lead.score ?? 0) >= 70).length,
    messages_total: recentMessages.length,
    automations_total: automations.length,
  };

  const checks = {
    calibration: Boolean(draft.calibration.identity.assistantName),
    widget: Boolean(draft.widget?.widgetEnabled),
    knowledge: stats.kb_published > 0,
    services: stats.kb_services > 0,
    pricing: stats.kb_pricing > 0,
    automations: stats.automations_total > 0,
  };

  return {
    business: {
      id: ctx.business.id as string,
      name: String(ctx.business.name || "Tu negocio"),
      publicKey: (ctx.business.public_key as string | null) ?? null,
    },
    checks,
    stats,
    draft,
    published,
    knowledge,
    leads,
    recentMessages: recentMessages.reverse(),
    automations,
  } satisfies Snapshot;
}

function compactSnapshot(snapshot: Snapshot) {
  return {
    business: snapshot.business,
    checks: snapshot.checks,
    stats: snapshot.stats,
    currentCalibration: {
      identity: snapshot.draft.calibration.identity,
      personality: snapshot.draft.calibration.personality,
      sales: snapshot.draft.calibration.sales,
      guardrails: snapshot.draft.calibration.guardrails,
      widget: snapshot.draft.widget,
    },
    knowledge: snapshot.knowledge.slice(0, 20).map((item) => ({
      type: item.type,
      title: item.title,
      published: item.is_published,
      preview: clean(item.content, 260),
    })),
    leads: snapshot.leads.slice(0, 12),
    recentMessages: snapshot.recentMessages.slice(-10).map((item) => ({
      from: item.sender_type,
      content: clean(item.content, 320),
    })),
    automations: snapshot.automations,
  };
}

function isConversationalOnly(message: string) {
  const normalized = normText(message);
  const words = normalized.split(" ").filter(Boolean);
  const actionable =
    /(config|calibr|optim|mejor|cambi|ajust|modific|crea|public|activa|desactiva|widget|knowledge|venta|tono|color|lead|chat|panel|automat|precio|servicio|politica|guardrail|regla|demo|presentable|audita|arregla)/.test(
      normalized
    );

  if (actionable) return false;

  if (
    /^(hola|hol+?a+|ola|buenas|buenos dias|buenas tardes|buenas noches|hey|hello|hi|saludos|que tal|estas ahi|funciona|test|prueba|ok|okay|dale)$/.test(
      normalized
    )
  ) {
    return true;
  }

  return words.length <= 4;
}

function buildFallbackChatReply(snapshot: Snapshot) {
  const ready = Object.values(snapshot.checks).filter(Boolean).length;
  const total = Object.values(snapshot.checks).length || 1;
  const score = Math.round((ready / total) * 100);
  const businessName = snapshot.business.name || "tu negocio";

  return [
    `Hola, estoy conectado al panel de ${businessName} y puedo leer su estado operativo.`,
    `Ahora mismo veo el sistema al ${score}%: calibracion, widget, Knowledge, precios y automatizaciones son las areas que puedo revisar.`,
    "Dime que quieres cambiar y te preparo una propuesta aplicable. Por ejemplo: deja LumenAI listo para una demo premium, mejora el tono de ventas o optimiza el widget para captar leads.",
  ].join("\n\n");
}

async function buildAutoconfigChatReply(message: string, snapshot: Snapshot) {
  const fallback = buildFallbackChatReply(snapshot);

  const content = await callGroqChat({
    purpose: "autoconfig",
    temperature: 0.24,
    maxTokens: 360,
    messages: [
      {
        role: "system",
        content: [
          "Eres LumenAI Configurator dentro del panel.",
          "Estas conectado al sistema de configuracion del negocio y puedes leer snapshot, checks, stats y calibracion actual.",
          "Cuando el usuario saluda o pregunta algo general, responde como asistente conectado, no generes propuesta ni digas que aplicaste cambios.",
          "Explica brevemente que puedes modificar calibracion, widget, knowledge sugerido y automatizaciones cuando reciba una instruccion concreta.",
          "Responde en espanol, maximo 90 palabras, tono premium, claro y directo.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          userMessage: message,
          snapshot: compactSnapshot(snapshot),
          instruction:
            "Contesta conversacionalmente. No devuelvas JSON. No inventes cambios aplicados.",
        }),
      },
    ],
  });

  return clean(content, 700) || fallback;
}

async function buildAiProposal(message: string, snapshot: Snapshot) {
  const fallback = buildFallbackProposal(message, snapshot);

  const content = await callGroqChat({
    purpose: "autoconfig",
    responseFormat: "json_object",
    temperature: 0.16,
    maxTokens: 1800,
    messages: [
      {
        role: "system",
        content: [
          "Eres el motor de autoconfiguracion de LumenAI.",
          "Tu tarea es interpretar lo que pide el suscriptor y proponer cambios concretos al panel.",
          "Solo puedes modificar calibracion y widget mediante un objeto patch compatible con CalibrationDoc.",
          "Tambien puedes sugerir knowledgeItems y automationRules.",
          "No inventes precios, horarios, garantias ni datos operativos. Si faltan, crea recomendaciones o placeholders claros.",
          "Responde solo JSON con esta forma: {title, summary, confidence, patch, actions, knowledgeItems, automationRules, blocked}.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          request: message,
          snapshot: compactSnapshot(snapshot),
        }),
      },
    ],
  });

  if (!content) return fallback;

  let parsed: JsonObj;

  try {
    parsed = JSON.parse(content) as JsonObj;
  } catch {
    return fallback;
  }

  const patch = sanitizePatch(parsed.patch, snapshot.draft);
  const proposal: Proposal = {
    title: clean(parsed.title, 120) || fallback.title,
    summary: clean(parsed.summary, 900) || fallback.summary,
    confidence: asNumber(parsed.confidence, fallback.confidence, 0, 100),
    patch: hasPatch(patch) ? patch : fallback.patch,
    actions: asStringArray(parsed.actions, 8).length
      ? asStringArray(parsed.actions, 8)
      : fallback.actions,
    knowledgeItems: sanitizeKnowledgeItems(parsed.knowledgeItems),
    automationRules: sanitizeAutomationRules(parsed.automationRules),
    blocked: asStringArray(parsed.blocked, 8),
  };

  return proposal;
}

async function readLatestConfigSnapshot(ctx: Awaited<ReturnType<typeof requireUserBusiness>>) {
  if (!ctx.admin || !ctx.business) return null;

  try {
    const { data, error } = await ctx.admin
      .from("lumenai_config_snapshots")
      .select("id,previous_config,new_config,user_prompt,action_type,created_at")
      .eq("business_id", ctx.business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return (data ?? null) as SnapshotRecord | null;
  } catch {
    return null;
  }
}

async function recordActionRun(input: {
  ctx: Awaited<ReturnType<typeof requireUserBusiness>>;
  actionName: string;
  payload?: unknown;
  result?: unknown;
  status?: "pending" | "success" | "error";
  error?: string | null;
}) {
  const { ctx, actionName, payload, result, status = "success", error = null } = input;
  if (!ctx.admin || !ctx.business) return;

  try {
    await ctx.admin.from("lumenai_action_runs").insert({
      business_id: ctx.business.id,
      user_id: ctx.user?.id ?? null,
      action_name: actionName,
      payload: payload ?? null,
      result: result ?? null,
      status,
      error,
    });
  } catch {
    // Optional production table. Never break Config IA if the migration is pending.
  }
}

async function recordConfigSnapshot(input: {
  ctx: Awaited<ReturnType<typeof requireUserBusiness>>;
  previousConfig: unknown;
  newConfig: unknown;
  userPrompt: string;
  actionType: string;
}) {
  const { ctx, previousConfig, newConfig, userPrompt, actionType } = input;
  if (!ctx.admin || !ctx.business) return null;

  try {
    const { data, error } = await ctx.admin
      .from("lumenai_config_snapshots")
      .insert({
        business_id: ctx.business.id,
        user_id: ctx.user?.id ?? null,
        previous_config: previousConfig,
        new_config: newConfig,
        user_prompt: clean(userPrompt, 1200),
        action_type: actionType,
      })
      .select("id,created_at")
      .maybeSingle();

    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

async function rollbackLatestSnapshot(input: {
  ctx: Awaited<ReturnType<typeof requireUserBusiness>>;
  snapshot: Snapshot;
}) {
  const { ctx, snapshot } = input;
  if (!ctx.admin || !ctx.business) throw new Error("No hay negocio activo");

  const latest = await readLatestConfigSnapshot(ctx);
  if (!latest?.previous_config) {
    return {
      restored: false,
      message: "No hay una configuracion anterior disponible para revertir.",
      snapshotId: null as string | null,
    };
  }

  const previousDraft = ensureShape(latest.previous_config);
  const now = new Date().toISOString();

  const { error } = await ctx.admin
    .from("widget_settings")
    .update({
      draft_settings: previousDraft,
      draft_updated_at: now,
      updated_at: now,
    })
    .eq("business_id", ctx.business.id);

  if (error) throw new Error(error.message);

  await recordConfigSnapshot({
    ctx,
    previousConfig: snapshot.draft,
    newConfig: previousDraft,
    userPrompt: `Rollback snapshot ${latest.id}`,
    actionType: "rollback",
  });

  await recordActionRun({
    ctx,
    actionName: "panel_autoconfig.rollback",
    payload: { snapshotId: latest.id },
    result: { restored: true },
  });

  await ctx.admin.from("lumenai_audit_log").insert({
    business_id: ctx.business.id,
    actor_user_id: ctx.user?.id ?? null,
    action: "panel_autoconfig.rollback",
    target_table: "widget_settings",
    target_id: ctx.business.id,
    metadata: {
      snapshotId: latest.id,
      restoredAt: now,
    },
  });

  return {
    restored: true,
    message: "Reverti la ultima configuracion guardada al borrador.",
    snapshotId: latest.id as string,
  };
}

async function applyProposal(input: {
  ctx: Awaited<ReturnType<typeof requireUserBusiness>>;
  snapshot: Snapshot;
  proposal: Proposal;
  message: string;
}) {
  const { ctx, snapshot, proposal, message } = input;

  if (!ctx.admin || !ctx.business) {
    throw new Error("No hay negocio activo");
  }

  const nextDraft = ensureShape(deepMerge(snapshot.draft, proposal.patch));
  const now = new Date().toISOString();

  const { error } = await ctx.admin
    .from("widget_settings")
    .update({
      draft_settings: nextDraft,
      draft_updated_at: now,
      updated_at: now,
    })
    .eq("business_id", ctx.business.id);

  if (error) throw new Error(error.message);

  if (proposal.knowledgeItems.length) {
    await ctx.admin.from("business_kb").insert(
      proposal.knowledgeItems.map((item) => ({
        business_id: ctx.business!.id,
        type: item.type,
        title: item.title,
        content: item.content,
        is_published: false,
        metadata: {
          source: "autoconfig",
          generated_at: now,
        },
      }))
    );
  }

  if (proposal.automationRules.length) {
    await ctx.admin.from("lumenai_automation_rules").upsert(
      proposal.automationRules.map((rule) => ({
        business_id: ctx.business!.id,
        ...rule,
        updated_at: now,
      })),
      { onConflict: "business_id,key" }
    );
  }

  await recordConfigSnapshot({
    ctx,
    previousConfig: snapshot.draft,
    newConfig: nextDraft,
    userPrompt: message,
    actionType: "apply_proposal",
  });

  await recordActionRun({
    ctx,
    actionName: "panel_autoconfig.apply",
    payload: {
      request: clean(message, 1000),
      proposal: proposal.title,
      patchKeys: Object.keys(proposal.patch),
    },
    result: {
      applied: true,
      knowledgeItems: proposal.knowledgeItems.length,
      automationRules: proposal.automationRules.length,
    },
  });

  await ctx.admin.from("lumenai_audit_log").insert({
    business_id: ctx.business.id,
    actor_user_id: ctx.user?.id ?? null,
    action: "panel_autoconfig.apply",
    target_table: "widget_settings",
    target_id: ctx.business.id,
    metadata: {
      request: clean(message, 1000),
      title: proposal.title,
      confidence: proposal.confidence,
      patchKeys: Object.keys(proposal.patch),
      knowledgeItems: proposal.knowledgeItems.length,
      automationRules: proposal.automationRules.length,
      appliedAt: now,
    },
  });

  return { nextDraft, appliedAt: now };
}

async function executeOperationalActions(input: {
  ctx: Awaited<ReturnType<typeof requireUserBusiness>>;
  snapshot: Snapshot;
  message: string;
  actions: OperationalAction[];
}) {
  const { ctx, snapshot, message, actions } = input;

  if (!ctx.admin || !ctx.business) {
    throw new Error("No hay negocio activo");
  }

  const now = new Date().toISOString();
  const businessId = ctx.business.id as string;
  const results: OperationalResult[] = [];

  for (const action of actions) {
    if (action.type === "knowledge_upsert") {
      const title = clean(action.title, 140);
      const content = clean(action.content, 2200);
      if (!title || !content) continue;

      const existing = await ctx.admin
        .from("business_kb")
        .select("id")
        .eq("business_id", businessId)
        .ilike("title", title)
        .maybeSingle();

      const payload = {
        business_id: businessId,
        type: action.kbType,
        title,
        content,
        is_published: action.publish ?? true,
        metadata: {
          source: action.source || "lumenite_autoconfig",
          request: clean(message, 800),
          updated_by: "lumenite",
          updated_at: now,
        },
        updated_at: now,
      };

      if (existing.data?.id) {
        const { error } = await ctx.admin
          .from("business_kb")
          .update(payload)
          .eq("id", existing.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await ctx.admin.from("business_kb").insert({
          ...payload,
          created_at: now,
        });
        if (error) throw new Error(error.message);
      }

      results.push({
        type: action.type,
        title,
        detail: `Knowledge ${existing.data?.id ? "actualizado" : "creado"} y publicado.`,
      });
    }

    if (action.type === "knowledge_delete") {
      const query = clean(action.query, 140);
      if (!query) continue;

      const { data, error } = await ctx.admin
        .from("business_kb")
        .select("id,title")
        .eq("business_id", businessId)
        .ilike("title", `%${query}%`)
        .limit(10);

      if (error) throw new Error(error.message);

      const ids = Array.isArray(data) ? data.map((item) => item.id).filter(Boolean) : [];
      if (ids.length) {
        const { error: deleteError } = await ctx.admin
          .from("business_kb")
          .delete()
          .in("id", ids);
        if (deleteError) throw new Error(deleteError.message);
      }

      results.push({
        type: action.type,
        title: query,
        detail: ids.length
          ? `${ids.length} item(s) de Knowledge eliminados.`
          : "No encontre items coincidentes para eliminar.",
      });
    }

    if (action.type === "widget_patch") {
      const widgetPatch: JsonObj = {};
      const directPatch: JsonObj = {
        updated_at: now,
      };

      if (action.patch.primaryColor) {
        const color = normalizeHex(action.patch.primaryColor, snapshot.draft.widget.theme.primaryColor);
        widgetPatch.theme = {
          ...(isObj(widgetPatch.theme) ? widgetPatch.theme : {}),
          primaryColor: color,
        };
        directPatch.primary_color = color;
      }

      if (action.patch.gradientFrom) {
        const color = normalizeHex(action.patch.gradientFrom, snapshot.draft.widget.theme.gradientFrom);
        widgetPatch.theme = {
          ...(isObj(widgetPatch.theme) ? widgetPatch.theme : {}),
          gradientFrom: color,
        };
        directPatch.gradient_from = color;
      }

      if (action.patch.gradientTo) {
        const color = normalizeHex(action.patch.gradientTo, snapshot.draft.widget.theme.gradientTo);
        widgetPatch.theme = {
          ...(isObj(widgetPatch.theme) ? widgetPatch.theme : {}),
          gradientTo: color,
        };
        directPatch.gradient_to = color;
      }

      if (action.patch.greeting !== undefined) {
        const value = clean(action.patch.greeting, 500);
        widgetPatch.greeting = value;
        directPatch.greeting = value;
      }

      if (action.patch.assistantName !== undefined) {
        const value = clean(action.patch.assistantName, 80);
        widgetPatch.assistantName = value;
        directPatch.assistant_name = value;
      }

      if (action.patch.avatarUrl !== undefined) {
        const value = clean(action.patch.avatarUrl, 500);
        widgetPatch.avatarUrl = value;
        directPatch.avatar_url = value;
      }

      if (action.patch.brandLogoUrl !== undefined) {
        const value = clean(action.patch.brandLogoUrl, 500);
        widgetPatch.brandLogoUrl = value;
        directPatch.logo_url = value;
      }

      if (action.patch.widgetEnabled !== undefined) {
        widgetPatch.widgetEnabled = action.patch.widgetEnabled;
        directPatch.widget_enabled = action.patch.widgetEnabled;
      }

      const nextDraft = ensureShape(
        deepMerge(snapshot.draft, {
          widget: widgetPatch,
        })
      );

      const { error } = await ctx.admin
        .from("widget_settings")
        .update({
          ...directPatch,
          draft_settings: nextDraft,
          draft_updated_at: now,
        })
        .eq("business_id", businessId);

      if (error) throw new Error(error.message);

      results.push({
        type: action.type,
        title: "Widget y panel",
        detail: "Ajustes visuales aplicados al borrador y a la configuracion activa.",
      });
    }

    if (action.type === "profile_patch") {
      const payload: JsonObj = {
        updated_at: now,
      };

      if (action.whatsapp !== undefined) payload.whatsapp = clean(action.whatsapp, 80);
      if (action.email !== undefined) payload.email = clean(action.email, 120);
      if (action.avatarUrl !== undefined) payload.avatar_url = clean(action.avatarUrl, 500);
      if (action.logoUrl !== undefined) payload.logo_url = clean(action.logoUrl, 500);

      const { error } = await ctx.admin
        .from("widget_settings")
        .update(payload)
        .eq("business_id", businessId);

      if (error) throw new Error(error.message);

      results.push({
        type: action.type,
        title: "Perfil del negocio",
        detail: "Datos de contacto o imagen actualizados.",
      });
    }

    if (action.type === "hours_patch") {
      const { error } = await ctx.admin
        .from("widget_settings")
        .update({
          business_hours: action.hours,
          updated_at: now,
        })
        .eq("business_id", businessId);

      if (error) throw new Error(error.message);

      results.push({
        type: action.type,
        title: "Horarios",
        detail: "Horario operativo actualizado.",
      });
    }

    if (action.type === "automation_upsert") {
      const { error } = await ctx.admin.from("lumenai_automation_rules").upsert(
        {
          business_id: businessId,
          key: clean(action.key, 80),
          name: clean(action.name, 120),
          trigger_type: clean(action.trigger_type, 80),
          action_type: clean(action.action_type, 80),
          enabled: true,
          requires_human_approval: true,
          config: action.config ?? {},
          updated_at: now,
        },
        { onConflict: "business_id,key" }
      );

      if (error) throw new Error(error.message);

      results.push({
        type: action.type,
        title: action.name,
        detail: "Regla operativa creada o actualizada.",
      });
    }
  }

  if (results.length) {
    const freshSnapshot = await readSnapshot(ctx);

    await recordConfigSnapshot({
      ctx,
      previousConfig: snapshot.draft,
      newConfig: freshSnapshot.draft,
      userPrompt: message,
      actionType: "execute_actions",
    });

    await recordActionRun({
      ctx,
      actionName: "panel_autoconfig.execute",
      payload: {
        request: clean(message, 1000),
        actions: actions.map((action) => action.type),
      },
      result: results,
    });

    await ctx.admin.from("lumenai_audit_log").insert({
      business_id: businessId,
      actor_user_id: ctx.user?.id ?? null,
      action: "panel_autoconfig.execute",
      target_table: "multi",
      target_id: businessId,
      metadata: {
        request: clean(message, 1000),
        actions: actions.map((action) => action.type),
        results,
        appliedAt: now,
      },
    });
  }

  return {
    appliedAt: now,
    results,
  };
}

export async function GET() {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const snapshot = await readSnapshot(ctx);
    const lastSnapshot = await readLatestConfigSnapshot(ctx);

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("autoconfig"),
      snapshot: compactSnapshot(snapshot),
      lastSnapshot: lastSnapshot
        ? {
            id: lastSnapshot.id,
            actionType: lastSnapshot.action_type,
            userPrompt: lastSnapshot.user_prompt,
            createdAt: lastSnapshot.created_at,
          }
        : null,
      examples: [
        "Configura LumenAI para vender con un tono elegante y consultivo.",
        "Audita todo el panel y dime que falta para publicar.",
        "Haz que el widget sea mas claro, rapido y orientado a captar leads.",
      ],
    });
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "Error cargando Config IA",
      500
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const body = await req.json().catch(() => null);
    const message = clean(body?.message, 2400);
    const apply = Boolean(body?.apply);
    const rollback = Boolean(body?.rollback);

    const snapshot = await readSnapshot(ctx);

    if (rollback) {
      const result = await rollbackLatestSnapshot({ ctx, snapshot });

      return NextResponse.json({
        ok: true,
        applied: result.restored,
        mode: "executed" satisfies AutoconfigMode,
        ai: getGroqStatus("autoconfig"),
        assistantMessage: result.message,
        rollback: result,
      });
    }

    if (!message) {
      return jsonError("Falta la indicacion para configurar LumenAI.", 400);
    }

    if (!apply) {
      const operationalActions = buildDeterministicActions(message);

      if (operationalActions.length) {
        const executed = await executeOperationalActions({
          ctx,
          snapshot,
          message,
          actions: operationalActions,
        });

        const summary =
          executed.results.length > 0
            ? [
                "Listo. Aplique cambios reales en el sistema.",
                ...executed.results.map(
                  (result) => `- ${result.title}: ${result.detail}`
                ),
                "Ya quedan disponibles para Knowledge, widget o reglas operativas segun corresponda.",
              ].join("\n")
            : "No encontre una accion segura para aplicar.";

        return NextResponse.json({
          ok: true,
          applied: executed.results.length > 0,
          mode: "executed" satisfies AutoconfigMode,
          ai: getGroqStatus("autoconfig"),
          assistantMessage: summary,
          executed,
        });
      }
    }

    if (!apply && isConversationalOnly(message)) {
      const assistantMessage = await buildAutoconfigChatReply(message, snapshot);

      await ctx.admin.from("lumenai_audit_log").insert({
        business_id: ctx.business.id,
        actor_user_id: ctx.user?.id ?? null,
        action: "panel_autoconfig.chat",
        target_table: "widget_settings",
        target_id: ctx.business.id,
        metadata: {
          request: message,
          mode: "chat" satisfies AutoconfigMode,
          ai: getGroqStatus("autoconfig"),
        },
      });

      return NextResponse.json({
        ok: true,
        applied: false,
        mode: "chat" satisfies AutoconfigMode,
        ai: getGroqStatus("autoconfig"),
        assistantMessage,
      });
    }

    const proposal = await buildAiProposal(message, snapshot);

    if (!hasPatch(proposal.patch)) {
      return NextResponse.json({
        ok: true,
        applied: false,
        mode: "proposal" satisfies AutoconfigMode,
        ai: getGroqStatus("autoconfig"),
        proposal: {
          ...proposal,
          blocked: [
            ...proposal.blocked,
            "No se detectaron cambios seguros para aplicar.",
          ],
        },
      });
    }

    if (!apply) {
      await ctx.admin.from("lumenai_audit_log").insert({
        business_id: ctx.business.id,
        actor_user_id: ctx.user?.id ?? null,
        action: "panel_autoconfig.propose",
        target_table: "widget_settings",
        target_id: ctx.business.id,
        metadata: {
          request: message,
          title: proposal.title,
          confidence: proposal.confidence,
          patchKeys: Object.keys(proposal.patch),
        },
      });

      return NextResponse.json({
        ok: true,
        applied: false,
        mode: "proposal" satisfies AutoconfigMode,
        ai: getGroqStatus("autoconfig"),
        proposal,
        preview: ensureShape(deepMerge(snapshot.draft, proposal.patch)),
      });
    }

    const applied = await applyProposal({ ctx, snapshot, proposal, message });

    return NextResponse.json({
      ok: true,
      applied: true,
      mode: "proposal" satisfies AutoconfigMode,
      ai: getGroqStatus("autoconfig"),
      proposal,
      draft: applied.nextDraft,
      appliedAt: applied.appliedAt,
    });
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "Error autoconfigurando LumenAI",
      500
    );
  }
}
