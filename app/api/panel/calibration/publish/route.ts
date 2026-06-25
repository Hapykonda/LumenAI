import { NextResponse } from "next/server";
import { ensureShape } from "@/app/panel/calibration/defaults";
import {
  getOrCreateCalibrationRow,
  jsonError,
  requireUserBusiness,
} from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHex(value: unknown, fallback: string) {
  const raw = clean(value);
  if (!raw) return fallback;

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function normalizePosition(value: unknown) {
  const p = clean(value).toLowerCase();

  if (p === "br" || p === "bl" || p === "tr" || p === "tl") return p;

  return "br";
}

function compileCalibration(draft: ReturnType<typeof ensureShape>) {
  const identity = draft.calibration.identity;
  const personality = draft.calibration.personality;
  const brandBrief = draft.calibration.brandBrief;
  const lexicon = draft.calibration.lexicon;
  const sales = draft.calibration.sales;
  const guardrails = draft.calibration.guardrails;
  const widget = draft.widget;
  const theme = widget.theme || {};

  const primaryColor = normalizeHex(theme.primaryColor, "#2F7CFF");
  const gradientFrom = normalizeHex(theme.gradientFrom, primaryColor);
  const gradientTo = normalizeHex(theme.gradientTo, "#8A63FF");

  const brandMemory = [
    identity.brandName ? `Marca: ${identity.brandName}` : "",
    identity.assistantName ? `Asistente: ${identity.assistantName}` : "",
    identity.tagline ? `Tagline: ${identity.tagline}` : "",
    Array.isArray(identity.values) && identity.values.length
      ? `Valores: ${identity.values.join(", ")}`
      : "",
    brandBrief.story ? `Historia: ${brandBrief.story}` : "",
    brandBrief.differentiation ? `Diferenciación: ${brandBrief.differentiation}` : "",
    brandBrief.idealCustomer ? `Cliente ideal: ${brandBrief.idealCustomer}` : "",
    brandBrief.howToSound ? `Cómo debe sonar: ${brandBrief.howToSound}` : "",
    brandBrief.howNotToSound ? `Cómo no debe sonar: ${brandBrief.howNotToSound}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const doRules = [
    personality.rules.reflectUnderstandingFirst
      ? "Primero refleja comprensión antes de responder."
      : "",
    personality.rules.endWithQuestionOrCTA
      ? "Termina con una pregunta útil o un llamado a la acción."
      : "",
    `No mostrar más de ${personality.rules.maxOptions} opciones principales a la vez.`,
    sales.allowUrgency
      ? "Puedes usar urgencia comercial solo si es real y no manipuladora."
      : "No uses urgencia falsa ni presión artificial.",
    guardrails?.escalate?.enabled
      ? `Deriva a humano cuando ocurra: ${(guardrails.escalate.when || []).join(", ")}.`
      : "",
  ]
    .filter(Boolean);

  const dontRules = [
    ...(Array.isArray(guardrails.dontDo) ? guardrails.dontDo : []),
    ...(Array.isArray(lexicon.forbiddenPhrases)
      ? lexicon.forbiddenPhrases.map((x: string) => `Evitar frase: ${x}`)
      : []),
    "No inventar precios, servicios, horarios, garantías ni políticas.",
    "No prometer descuentos o condiciones que no estén en Knowledge.",
  ].filter(Boolean);

  const examplePhrases = Array.isArray(lexicon.allowedPhrases)
    ? lexicon.allowedPhrases
    : [];

  const salesStrategy = [
    `Perfil psicológico: ${clean(sales?.profileId) || "elite-consultive"}`,
    `Calificación: ${clean(sales?.qualification) || "high"}`,
    `Proactividad: ${Number.isFinite(Number(sales?.proactivity)) ? Number(sales.proactivity) : 78}%`,
    `Cierre: ${Number.isFinite(Number(sales?.closing)) ? Number(sales.closing) : 82}%`,
    sales?.discoveryModel
      ? `Descubrimiento: ${clean(sales.discoveryModel)}`
      : "Descubrimiento: SPIN ligero con una pregunta clave por turno.",
    sales?.closingStyle
      ? `Cierre: ${clean(sales.closingStyle)}`
      : "Cierre: micro-compromiso claro, sin presión falsa.",
    sales?.objectionPlaybook
      ? `Objeciones: ${clean(sales.objectionPlaybook)}`
      : "Objeciones: validar, reencuadrar, probar con datos reales y pedir siguiente paso.",
  ];

  return ensureShape({
    ...draft,
    widget: {
      ...widget,
      position: normalizePosition(widget.position || "br"),
      theme: {
        ...theme,
        primaryColor,
        gradientFrom,
        gradientTo,
      },
    },
    compiled: {
      ...(draft.compiled || {}),
      brandMemory,
      salesStrategy,
      doRules,
      dontRules,
      examplePhrases,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function POST() {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const { draft } = await getOrCreateCalibrationRow({
      admin: ctx.admin,
      businessId: ctx.business.id,
      publicKey: ctx.business.public_key,
    });

    const published = compileCalibration(ensureShape(draft));
    const now = new Date().toISOString();

    const widget = published.widget || {};
    const theme = widget.theme || {};
    const identity = published.calibration.identity;

    const primaryColor = normalizeHex(theme.primaryColor, "#2F7CFF");
    const gradientFrom = normalizeHex(theme.gradientFrom, primaryColor);
    const gradientTo = normalizeHex(theme.gradientTo, "#8A63FF");

    const { error } = await ctx.admin
      .from("widget_settings")
      .update({
        public_key: ctx.business.public_key,
        widget_enabled:
          typeof widget.widgetEnabled === "boolean" ? widget.widgetEnabled : true,
        greeting:
          clean(widget.greeting) ||
          "Hola 👋 Soy {assistant}. ¿En qué puedo ayudarte?",
        assistant_name: clean(identity.assistantName) || "LumenAI",
        tone: clean(published.calibration.lexicon.formality) || "tu",
        position: normalizePosition(widget.position || "br"),
        primary_color: primaryColor,
        gradient_from: gradientFrom,
        gradient_to: gradientTo,
        font_family: clean(theme.fontFamily) || null,
        whatsapp: clean(widget.whatsapp) || null,
        email: clean(widget.email) || null,
        draft_settings: published,
        published_settings: published,
        draft_updated_at: now,
        published_at: now,
        updated_at: now,
      })
      .eq("business_id", ctx.business.id);

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      ok: true,
      publicKey: ctx.business.public_key,
      businessId: ctx.business.id,
      published,
      publishedAt: now,
    });
  } catch (error: any) {
    return jsonError(error?.message || "Error publicando calibración", 500);
  }
}
