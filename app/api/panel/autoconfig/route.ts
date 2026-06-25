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

function isObj(value: unknown): value is JsonObj {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown, max = 1400) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
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

  const parsed = JSON.parse(content) as JsonObj;
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

export async function GET() {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const snapshot = await readSnapshot(ctx);

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("autoconfig"),
      snapshot: compactSnapshot(snapshot),
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

    if (!message) {
      return jsonError("Falta la indicacion para configurar LumenAI.", 400);
    }

    const snapshot = await readSnapshot(ctx);
    const proposal = await buildAiProposal(message, snapshot);

    if (!hasPatch(proposal.patch)) {
      return NextResponse.json({
        ok: true,
        applied: false,
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
        ai: getGroqStatus("autoconfig"),
        proposal,
        preview: ensureShape(deepMerge(snapshot.draft, proposal.patch)),
      });
    }

    const applied = await applyProposal({ ctx, snapshot, proposal, message });

    return NextResponse.json({
      ok: true,
      applied: true,
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
