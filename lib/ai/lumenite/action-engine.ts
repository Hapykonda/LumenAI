import { createHash, randomUUID } from "node:crypto";
import { callGroqChat } from "@/lib/ai/groq";
import { getLumeniteAgent } from "./agents";
import {
  getActionDefinition,
  listActionNames,
  publicActionCatalog,
} from "./action-registry";
import { recordRequiredAudit } from "./audit";
import { buildLumeniteBusinessSnapshot } from "./business-snapshot";
import {
  canCancelStatus,
  canUndoStatus,
  cleanString,
  isRecord,
  isUuid,
  stableSerialize,
  type EffectiveAgentPolicy,
  type LumeniteActionSource,
  type LumeniteActionStatus,
} from "./core";
import type {
  LumeniteApprovalInboxItem,
  LumeniteActionRun,
  LumenitePlan,
  LumenitePlannedAction,
} from "./contracts";
import { LumeniteSafeError } from "./errors";
import { requireLumeniteActionContext } from "./permissions";
import { authorizeRegisteredAction } from "./policy-engine";
import { safeJson, validateLumenitePlan } from "./schemas";
import type { LumeniteAgentKey } from "./env";
import { readPulseSignal, syncPulseSignalForRun } from "@/lib/pulse-radar/lifecycle";

type ActionContext = Awaited<ReturnType<typeof requireLumeniteActionContext>>;

type ActionRunRow = {
  id: string;
  plan_id: string | null;
  signal_id: string | null;
  business_id: string;
  requested_by: string | null;
  approved_by: string | null;
  source: LumeniteActionSource;
  capability: string;
  integration_id: string | null;
  risk_level: "low" | "medium" | "high";
  status: LumeniteActionStatus;
  input_redacted: Record<string, unknown> | null;
  plan_snapshot: Record<string, unknown> | null;
  permission_snapshot: Record<string, unknown> | null;
  idempotency_key: string;
  external_reference: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  revocation_requested_at: string | null;
  revocation_reason: string | null;
  verification_result: Record<string, unknown> | null;
  receipt: Record<string, unknown> | null;
  undo_status: LumeniteActionRun["undoStatus"];
  undo_payload?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const PUBLIC_RUN_COLUMNS =
  "id,plan_id,signal_id,business_id,requested_by,approved_by,source,capability,integration_id,risk_level,status,input_redacted,plan_snapshot,permission_snapshot,idempotency_key,external_reference,started_at,completed_at,failed_at,error_code,error_message,revocation_requested_at,revocation_reason,verification_result,receipt,undo_status,created_at,updated_at";

const PRIVATE_RUN_COLUMNS = `${PUBLIC_RUN_COLUMNS},payload,result,undo_payload`;

function purposeForAgent(agentKey: string): LumeniteAgentKey {
  if (["widget", "autoconfig", "panel", "radar", "growth", "twin", "campaigns"].includes(agentKey)) {
    return agentKey as LumeniteAgentKey;
  }
  return "panel";
}

function asSource(value: unknown): LumeniteActionSource {
  const source = cleanString(value, 40) as LumeniteActionSource;
  return ["command_center", "pulse_radar", "panel", "automation", "api"].includes(source)
    ? source
    : "command_center";
}

function maxRisk(actions: LumenitePlannedAction[]) {
  const weights = { low: 0, medium: 1, high: 2 } as const;
  return actions.reduce<"low" | "medium" | "high">((current, action) => {
    const next = getActionDefinition(action.capability)?.riskLevel ?? "high";
    return weights[next] > weights[current] ? next : current;
  }, "low");
}

function deterministicPlan(input: {
  agentName: string;
  instruction: string;
  source: LumeniteActionSource;
  context?: unknown;
}): LumenitePlan {
  const text = input.instruction.toLowerCase();
  const context = isRecord(input.context) ? input.context : {};
  const suggested = isRecord(context.suggestedAction)
    ? context.suggestedAction
    : cleanString(context.capability, 120)
      ? { capability: context.capability, input: isRecord(context.input) ? context.input : context }
      : null;
  let action: LumenitePlannedAction | null = null;
  const missingData: string[] = [];

  if (suggested) {
    action = {
      capability: cleanString(suggested.capability, 120),
      input: isRecord(suggested.input) ? suggested.input : {},
      reason: cleanString(suggested.reason, 400) || "Accion preparada desde el contexto operativo.",
      expectedResult: cleanString(suggested.expectedResult, 400),
    };
  } else if (/recordatorio|recordar|recu[eé]rdame/.test(text)) {
    action = {
      capability: "internal.reminder.create",
      input: {
        title: input.instruction,
        note: "",
        remindAt: cleanString(context.remindAt, 80),
        resourceType: cleanString(context.resourceType, 24) || "general",
        resourceId: context.resourceId ?? null,
      },
      reason: "Programar el seguimiento solicitado dentro de LumenAI.",
      expectedResult: "Un recordatorio interno programado.",
    };
    if (!context.remindAt) missingData.push("Fecha y hora exactas del recordatorio");
  } else if (/nota/.test(text) && /lead|prospecto|cliente/.test(text)) {
    action = {
      capability: "internal.lead.note.add",
      input: {
        leadId: context.resourceType === "lead" ? context.resourceId : context.leadId,
        content: cleanString(context.content, 2400) || input.instruction,
      },
      reason: "Conservar contexto interno junto al lead seleccionado.",
      expectedResult: "Una nota interna vinculada al lead.",
    };
    if (!action.input.leadId) missingData.push("Lead al que debe añadirse la nota");
  } else if (/etiquet|tag/.test(text)) {
    action = {
      capability: "internal.conversation.tag",
      input: {
        conversationId:
          context.resourceType === "conversation" ? context.resourceId : context.conversationId,
        tag: cleanString(context.tag, 40),
        color: context.color ?? null,
      },
      reason: "Clasificar internamente la conversacion seleccionada.",
      expectedResult: "La etiqueta visible en la conversacion.",
    };
    if (!action.input.conversationId) missingData.push("Conversacion que debe etiquetarse");
    if (!action.input.tag) missingData.push("Nombre de la etiqueta");
  } else if (/respuesta|responder|borrador/.test(text)) {
    action = {
      capability: "internal.response.prepare",
      input: {
        conversationId:
          context.resourceType === "conversation" ? context.resourceId : context.conversationId,
        content: cleanString(context.content, 5000),
        channel: cleanString(context.channel, 20) || "chat",
      },
      reason: "Preparar una respuesta revisable sin enviarla a terceros.",
      expectedResult: "Un borrador interno listo para revision.",
    };
    if (!action.input.conversationId) missingData.push("Conversacion que necesita respuesta");
    if (!action.input.content) missingData.push("Contenido que debe incluir el borrador");
  } else if (/tarea|seguimiento|pendiente/.test(text)) {
    action = {
      capability: "internal.task.create",
      input: {
        title: cleanString(context.title, 160) || input.instruction,
        description: cleanString(context.description, 1600),
        dueAt: context.dueAt ?? null,
        priority: cleanString(context.priority, 20) || "medium",
        leadId: context.leadId ?? null,
        conversationId: context.conversationId ?? null,
      },
      reason: "Convertir la solicitud en una tarea interna trazable.",
      expectedResult: "Una tarea interna pendiente.",
    };
  }

  const actions = action?.capability ? [action] : [];
  return {
    agent: input.agentName,
    intent: input.instruction,
    objective: actions.length ? `Preparar ${getActionDefinition(actions[0].capability)?.name.toLowerCase() ?? "accion"}` : "Comprender la solicitud",
    summary: actions.length
      ? "Se preparo una accion registrada para revisar antes de ejecutarla."
      : "La solicitud no coincide todavia con una de las cinco capacidades internas habilitadas.",
    source: input.source,
    riskLevel: maxRisk(actions),
    dataUsed: suggested ? ["Contexto entregado por Pulse Radar o la seccion actual"] : [],
    integrations: actions.length
      ? [getActionDefinition(actions[0].capability)?.provider === "google_gmail" ? "Google Gmail" : "LumenAI interno"]
      : [],
    expectedResult: action?.expectedResult || "Una solicitud mas concreta o una capacidad compatible.",
    steps: [],
    actions,
    missingData,
    warnings: actions.length ? [] : ["No se ejecutara texto libre fuera del registro de capacidades."],
  };
}

function contextForPlanner(snapshot: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>) {
  return {
    business: { id: snapshot.business.id, name: snapshot.business.name },
    stats: snapshot.stats,
    missingData: snapshot.missingData,
    leads: snapshot.leads.slice(0, 20).map((lead) => ({
      id: lead.id,
      name: lead.name,
      status: lead.status,
      summary: lead.summary,
    })),
    conversations: snapshot.chats.slice(0, 20).map((chat) => ({
      id: chat.id,
      title: chat.title,
      channel: chat.channel,
      unread: chat.unread_owner,
    })),
  };
}

export async function planLumeniteActions(input: {
  agent: string;
  instruction: string;
  source?: LumeniteActionSource;
  context?: unknown;
  businessSnapshot?: Awaited<ReturnType<typeof buildLumeniteBusinessSnapshot>>;
}) {
  const agent = getLumeniteAgent(input.agent) ?? getLumeniteAgent("panel");
  const agentName = agent?.name ?? "Executive Panel Agent";
  const instruction = cleanString(input.instruction, 2400);
  const source = asSource(input.source);
  if (!instruction) {
    return deterministicPlan({ agentName, instruction: "Solicitud vacia", source, context: input.context });
  }

  const fallback = deterministicPlan({ agentName, instruction, source, context: input.context });
  if (isRecord(input.context) && input.context.deterministicAction === true) {
    return fallback;
  }
  const aiText = await callGroqChat({
    purpose: purposeForAgent(String(agent?.key ?? "panel")),
    responseFormat: "json_object",
    temperature: 0.1,
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content:
          "Eres el planificador de Lumenite Action OS. Devuelve solo JSON con agent, intent, objective, summary, dataUsed, integrations, expectedResult, actions, missingData y warnings. Cada action usa capability, input, reason y expectedResult. No ejecutes. No inventes IDs ni datos. Solo usa capacidades registradas. Si falta un ID o fecha critica, deja actions vacio y explica missingData.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction,
          source,
          currentContext: input.context ?? {},
          businessContext: input.businessSnapshot ? contextForPlanner(input.businessSnapshot) : {},
          capabilities: publicActionCatalog().map((item) => ({
            id: item.id,
            name: item.name,
            inputShape: item.inputShape,
            riskLevel: item.riskLevel,
          })),
        }),
      },
    ],
  });

  if (!aiText) return fallback;
  const raw = safeJson<unknown>(aiText, null);
  const proposed = validateLumenitePlan(raw, agentName, source);
  const allowed = new Set(listActionNames());
  const actions = proposed.actions.filter((action) => allowed.has(action.capability));
  const filtered = proposed.actions.length - actions.length;
  const context = isRecord(input.context) ? input.context : {};
  if (!actions.length && context.enforceVersionedAction === true && fallback.actions.length) {
    return {
      ...fallback,
      summary: proposed.summary || fallback.summary,
      expectedResult: proposed.expectedResult || fallback.expectedResult,
      missingData: proposed.missingData,
      warnings: [
        ...proposed.warnings,
        "El comentario no pudo convertirse en parametros estructurados; se conserva la entrada anterior para revision humana.",
      ],
    } satisfies LumenitePlan;
  }
  return {
    ...proposed,
    actions,
    riskLevel: maxRisk(actions),
    integrations: actions.length
      ? Array.from(new Set(actions.map((action) => getActionDefinition(action.capability)?.provider === "google_gmail" ? "Google Gmail" : "LumenAI interno")))
      : [],
    warnings: [
      ...proposed.warnings,
      ...(filtered ? ["Se retiraron capacidades no registradas del plan generado."] : []),
    ],
  } satisfies LumenitePlan;
}

function redactText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email oculto]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[telefono oculto]");
}

export function redactActionInput(
  definition: NonNullable<ReturnType<typeof getActionDefinition>>,
  input: Record<string, unknown>,
) {
  const output = structuredClone(input);
  for (const rule of definition.redactionRules) {
    if (!(rule.field in output)) continue;
    if (rule.strategy === "remove") {
      delete output[rule.field];
    } else if (rule.strategy === "mask") {
      output[rule.field] = "[contenido protegido]";
    } else {
      const text = redactText(String(output[rule.field] ?? ""));
      const visible = rule.visibleCharacters ?? 120;
      output[rule.field] = text.length > visible ? `${text.slice(0, visible)}...` : text;
    }
  }
  return output;
}

function idempotencyKey(input: unknown) {
  return createHash("sha256").update(stableSerialize(input)).digest("hex");
}

function mapRun(row: ActionRunRow): LumeniteActionRun {
  return {
    id: String(row.id),
    planId: row.plan_id ? String(row.plan_id) : null,
    signalId: row.signal_id ? String(row.signal_id) : null,
    businessId: String(row.business_id),
    requestedBy: row.requested_by ? String(row.requested_by) : null,
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    source: row.source,
    capability: String(row.capability),
    integrationId: row.integration_id ? String(row.integration_id) : null,
    riskLevel: row.risk_level,
    status: row.status,
    inputRedacted: isRecord(row.input_redacted) ? row.input_redacted : {},
    planSnapshot: isRecord(row.plan_snapshot) ? row.plan_snapshot : {},
    permissionSnapshot: isRecord(row.permission_snapshot) ? row.permission_snapshot : {},
    idempotencyKey: String(row.idempotency_key),
    externalReference: row.external_reference ? String(row.external_reference) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    failedAt: row.failed_at ? String(row.failed_at) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    revocationRequestedAt: row.revocation_requested_at ? String(row.revocation_requested_at) : null,
    revocationReason: row.revocation_reason ? String(row.revocation_reason) : null,
    verificationResult: isRecord(row.verification_result) ? row.verification_result : {},
    receipt: isRecord(row.receipt) ? row.receipt : {},
    undoStatus: row.undo_status,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function dryRunAction(input: {
  definition: NonNullable<ReturnType<typeof getActionDefinition>>;
  action: LumenitePlannedAction;
  policy: EffectiveAgentPolicy;
  decision: Awaited<ReturnType<typeof authorizeRegisteredAction>>["decision"];
}) {
  return {
    capability: input.definition.id,
    name: input.definition.name,
    description: input.definition.description,
    provider: input.definition.provider,
    resourceType: input.definition.resourceType,
    accessType: input.definition.accessType,
    requiredScopes: input.definition.requiredScopes,
    riskLevel: input.definition.riskLevel,
    approvalMode: input.definition.approvalMode,
    supportsUndo: input.definition.supportsUndo && input.policy.allowsUndo,
    input: redactActionInput(input.definition, input.action.input),
    reason: input.action.reason,
    expectedResult: input.action.expectedResult,
    authorization: input.decision,
  };
}

async function readExistingPlan(ctx: ActionContext, requestKey: string) {
  const { data: plan, error } = await ctx.admin
    .from("lumenai_agent_plans")
    .select("id,plan_snapshot,version,root_plan_id,parent_plan_id,change_request")
    .eq("business_id", ctx.businessId)
    .eq("request_key", requestKey)
    .maybeSingle();
  if (error) throw new LumeniteSafeError("No se pudo revisar la idempotencia del plan.", 503);
  if (!plan?.id) return null;
  const { data: runs, error: runsError } = await ctx.admin
    .from("lumenai_action_runs")
    .select(PUBLIC_RUN_COLUMNS)
    .eq("business_id", ctx.businessId)
    .eq("plan_id", plan.id)
    .order("created_at", { ascending: true });
  if (runsError) throw new LumeniteSafeError("No se pudo recuperar el plan existente.", 503);
  const snapshot = isRecord(plan.plan_snapshot) ? plan.plan_snapshot : {};
  const expectedRuns = Array.isArray(snapshot.actions) && snapshot.actions.length > 0;
  if (expectedRuns && !(runs ?? []).length) {
    await ctx.admin
      .from("lumenai_agent_plans")
      .delete()
      .eq("id", plan.id)
      .eq("business_id", ctx.businessId);
    return null;
  }
  return {
    planId: String(plan.id),
    plan: plan.plan_snapshot as LumenitePlan,
    version: Number(plan.version) || 1,
    rootPlanId: plan.root_plan_id ? String(plan.root_plan_id) : String(plan.id),
    parentPlanId: plan.parent_plan_id ? String(plan.parent_plan_id) : null,
    changeRequest: plan.change_request ? String(plan.change_request) : null,
    runs: (runs ?? []).map((row) => mapRun(row as ActionRunRow)),
    dryRun: (runs ?? []).map((row) => (row as ActionRunRow).plan_snapshot?.dryRun).filter(Boolean),
    deduplicated: true,
  };
}

export async function createLumenitePlan(input: {
  request?: Request;
  agent: string;
  instruction: string;
  source?: LumeniteActionSource;
  context?: unknown;
  requestKey?: string;
  signalId?: string | null;
  versionContext?: {
    rootPlanId: string;
    parentPlanId: string;
    version: number;
    changeRequest: string;
  };
}) {
  const ctx = await requireLumeniteActionContext(input.request);
  const source = asSource(input.source);
  const signalId = cleanString(input.signalId, 80) || null;
  const signal = signalId
    ? await readPulseSignal({ admin: ctx.admin, businessId: ctx.businessId, signalId })
    : null;
  const instruction = signal && !input.versionContext
    ? cleanString(`${signal.title}. ${signal.description}`, 2400)
    : cleanString(input.instruction, 2400);
  if (!instruction) throw new LumeniteSafeError("Escribe una solicitud concreta.", 400);
  const signalAttempt = Number(signal?.resolution?.attempt ?? 1);
  const rawRequestKey = signal && !input.versionContext
    ? `pulse:${signal.id}:attempt:${signalAttempt}`
    : cleanString(input.requestKey, 220) || randomUUID();
  const requestKey = idempotencyKey({ businessId: ctx.businessId, userId: ctx.userId, rawRequestKey });
  const existing = await readExistingPlan(ctx, requestKey);
  if (existing) return existing;
  if (signal && !input.versionContext && !["new", "viewed"].includes(signal.status)) {
    throw new LumeniteSafeError("La senal ya tiene una accion o no esta disponible para preparar.", 409);
  }
  const planningContext = signal && !input.versionContext
    ? {
        ...(isRecord(input.context) ? input.context : {}),
        signalId: signal.id,
        suggestedAction: {
          capability: signal.recommended_capability,
          input: isRecord(signal.recommended_input) ? signal.recommended_input : {},
          reason: `Responder a la senal verificada: ${signal.title}`,
          expectedResult: "Una accion interna verificada que actualiza la senal de Pulse Radar.",
        },
      }
    : input.context;

  const businessSnapshot = await buildLumeniteBusinessSnapshot({
    admin: ctx.admin,
    businessId: ctx.businessId,
    businessName: ctx.business.name,
    publicKey: ctx.business.public_key,
  });
  const generatedPlan = await planLumeniteActions({
    agent: input.agent,
    instruction,
    source,
    context: planningContext,
    businessSnapshot,
  });
  const validActions: Array<{
    action: LumenitePlannedAction;
    definition: NonNullable<ReturnType<typeof getActionDefinition>>;
    parsedInput: Record<string, unknown>;
    policy: EffectiveAgentPolicy;
    decision: Awaited<ReturnType<typeof authorizeRegisteredAction>>["decision"];
    integrationId: string | null;
  }> = [];
  const validationMissing: string[] = [];

  for (const action of generatedPlan.actions.slice(0, 5)) {
    const definition = getActionDefinition(action.capability);
    if (!definition) continue;
    const parsed = definition.inputSchema.safeParse(action.input);
    if (!parsed.success) {
      validationMissing.push(...parsed.issues.map((issue) => `${definition.name}: ${issue.message}`));
      continue;
    }
    const requestedIntegrationId = definition.provider === "lumenai_internal"
      ? null
      : cleanString(isRecord(input.context) ? input.context.integrationId : null, 80) || null;
    if (definition.provider !== "lumenai_internal" && !isUuid(requestedIntegrationId)) {
      validationMissing.push(`${definition.name}: selecciona una integracion valida.`);
      continue;
    }
    const authorization = await authorizeRegisteredAction({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      role: ctx.role,
      capability: definition.id,
      integrationId: requestedIntegrationId,
      resourceType: definition.resourceType,
      approvalMode: definition.approvalMode,
      riskLevel: definition.riskLevel,
      accessType: definition.accessType,
      supportsUndo: definition.supportsUndo,
    });
    if (input.versionContext && authorization.decision.allowed && authorization.decision.canExecute) {
      authorization.decision = {
        ...authorization.decision,
        requiresApproval: true,
        initialStatus: "awaiting_approval",
        reasonCode: "PLAN_REVISION_REAPPROVAL",
        reason: "La nueva version del plan necesita una aprobacion humana independiente.",
      };
    }
    if (!authorization.decision.allowed) {
      validationMissing.push(`${definition.name}: ${authorization.decision.reason}`);
      continue;
    }
    validActions.push({
      action: { ...action, input: parsed.data as Record<string, unknown> },
      definition,
      parsedInput: parsed.data as Record<string, unknown>,
      ...authorization,
      integrationId: requestedIntegrationId,
    });
  }

  const plan: LumenitePlan = {
    ...generatedPlan,
    actions: validActions.map((item) => item.action),
    missingData: Array.from(new Set([...generatedPlan.missingData, ...validationMissing])),
    steps: validActions.map((item, index) => ({
      id: `step-${index + 1}`,
      label: item.definition.name,
      description: item.action.reason || item.definition.description,
      capability: item.definition.id,
      status: item.decision.allowed ? "ready" : "blocked",
    })),
    version: input.versionContext?.version ?? 1,
    rootPlanId: input.versionContext?.rootPlanId ?? null,
    parentPlanId: input.versionContext?.parentPlanId ?? null,
    changeRequest: input.versionContext?.changeRequest ?? null,
  };

  const { data: planRow, error: planError } = await ctx.admin
    .from("lumenai_agent_plans")
    .insert({
      business_id: ctx.businessId,
      requested_by: ctx.userId,
      source,
      request_key: requestKey,
      instruction,
      objective: plan.objective,
      status: validActions.length ? "ready" : "blocked",
      plan_snapshot: plan,
      root_plan_id: input.versionContext?.rootPlanId ?? null,
      parent_plan_id: input.versionContext?.parentPlanId ?? null,
      version: input.versionContext?.version ?? 1,
      change_request: input.versionContext?.changeRequest ?? null,
      signal_id: signalId,
    })
    .select("id")
    .single();
  if (planError || !planRow?.id) {
    if (planError?.code === "23505") {
      const duplicate = await readExistingPlan(ctx, requestKey);
      if (duplicate) return duplicate;
    }
    throw new LumeniteSafeError("No se pudo guardar el plan operativo.", 503);
  }

  const planId = String(planRow.id);
  const rootPlanId = input.versionContext?.rootPlanId ?? planId;
  plan.rootPlanId = rootPlanId;
  const rootUpdate = await ctx.admin
    .from("lumenai_agent_plans")
    .update({ root_plan_id: rootPlanId, plan_snapshot: plan })
    .eq("id", planId)
    .eq("business_id", ctx.businessId);
  if (rootUpdate.error) throw new LumeniteSafeError("No se pudo versionar el plan operativo.", 503);
  const dryRun = validActions.map((item) => dryRunAction(item));
  const runRows = validActions.map((item, index) => ({
    business_id: ctx.businessId,
    user_id: ctx.userId,
    plan_id: planId,
    signal_id: signalId,
    requested_by: ctx.userId,
    approved_by: null,
    agent: plan.agent,
    action_name: item.definition.id,
    capability: item.definition.id,
    source,
    integration_id: item.integrationId,
    risk_level: item.definition.riskLevel,
    status: item.decision.initialStatus,
    payload: item.parsedInput,
    input_redacted: redactActionInput(item.definition, item.parsedInput),
    result: {},
    plan_snapshot: {
      planId,
      version: plan.version ?? 1,
      rootPlanId,
      parentPlanId: plan.parentPlanId ?? null,
      changeRequest: plan.changeRequest ?? null,
      objective: plan.objective,
      step: plan.steps[index],
      dryRun: dryRun[index],
    },
    permission_snapshot: {
      policy: item.policy,
      decision: item.decision,
      requiredScopes: item.definition.requiredScopes,
      evaluatedAt: new Date().toISOString(),
    },
    idempotency_key: idempotencyKey({ requestKey, capability: item.definition.id, index }),
    undo_status: "not_available",
  }));

  let runs: ActionRunRow[] = [];
  if (runRows.length) {
    const { data, error } = await ctx.admin
      .from("lumenai_action_runs")
      .insert(runRows)
      .select(PUBLIC_RUN_COLUMNS);
    if (error) throw new LumeniteSafeError("No se pudieron registrar los pasos del plan.", 503);
    runs = (data ?? []) as ActionRunRow[];
    const approvalRows = runs
      .filter((run) => run.status === "awaiting_approval")
      .map((run) => ({
        business_id: ctx.businessId,
        action_run_id: run.id,
        requested_from: ctx.userId,
        decision: "pending",
        plan_version: plan.version ?? 1,
        permission_snapshot: run.permission_snapshot ?? {},
      }));
    if (approvalRows.length) {
      const { error } = await ctx.admin.from("lumenai_action_approvals").insert(approvalRows);
      if (error) throw new LumeniteSafeError("No se pudo crear la solicitud de aprobacion.", 503);
    }
    await Promise.all(
      runs.map((run) =>
        syncPulseSignalForRun({
          admin: ctx.admin,
          businessId: ctx.businessId,
          signalId: run.signal_id,
          planId,
          runId: run.id,
          status: run.status,
        }),
      ),
    );
  }

  await recordRequiredAudit({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: "lumenite.plan.created",
    targetTable: "lumenai_agent_plans",
    targetId: planId,
    metadata: {
      source,
      capabilities: runs.map((run) => run.capability),
      statuses: runs.map((run) => run.status),
      requestKey,
      signalId,
    },
  });

  return {
    planId,
    plan,
    version: plan.version ?? 1,
    rootPlanId,
    parentPlanId: plan.parentPlanId ?? null,
    changeRequest: plan.changeRequest ?? null,
    signalId,
    runs: runs.map(mapRun),
    dryRun,
    deduplicated: false,
  };
}

async function readPrivateRun(ctx: ActionContext, runId: string) {
  const { data, error } = await ctx.admin
    .from("lumenai_action_runs")
    .select(PRIVATE_RUN_COLUMNS)
    .eq("id", runId)
    .eq("business_id", ctx.businessId)
    .maybeSingle();
  if (error) throw new LumeniteSafeError("No se pudo leer la ejecucion.", 503);
  if (!data?.id) throw new LumeniteSafeError("La ejecucion no existe en este negocio.", 404);
  return data as ActionRunRow;
}

function executionError(error: unknown) {
  if (error instanceof LumeniteSafeError) {
    return { code: "ACTION_REJECTED", message: error.message, status: error.status };
  }
  if (error instanceof Error && error.name === "RESOURCE_NOT_FOUND") {
    return { code: "RESOURCE_NOT_FOUND", message: error.message, status: 404 };
  }
  if (error instanceof Error && error.name === "ACTION_TIMEOUT") {
    return { code: "ACTION_TIMEOUT", message: "La accion supero el tiempo permitido.", status: 504 };
  }
  return { code: "ACTION_EXECUTION_FAILED", message: "No se pudo completar la accion interna.", status: 500 };
}

async function withTimeout<T>(promise: Promise<T>, timeout: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("Action timeout");
          error.name = "ACTION_TIMEOUT";
          reject(error);
        }, timeout);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function updatePlanStatus(ctx: ActionContext, planId: string | null) {
  if (!planId) return;
  const { data } = await ctx.admin
    .from("lumenai_action_runs")
    .select("status")
    .eq("business_id", ctx.businessId)
    .eq("plan_id", planId);
  const statuses = (data ?? []).map((row) => String(row.status));
  if (!statuses.length) return;
  const pending = statuses.some((status) =>
    ["draft", "planning", "awaiting_approval", "approved", "queued", "executing", "verifying"].includes(status),
  );
  const failed = statuses.filter((status) => ["failed", "rejected", "cancelled"].includes(status)).length;
  const success = statuses.filter((status) => ["completed", "undo_available", "reverted"].includes(status)).length;
  const status = pending
    ? "executing"
    : failed && success
      ? "partially_completed"
      : failed
        ? "failed"
        : "completed";
  await ctx.admin
    .from("lumenai_agent_plans")
    .update({ status, completed_at: pending ? null : new Date().toISOString() })
    .eq("id", planId)
    .eq("business_id", ctx.businessId);
}

async function expirePendingApprovals(ctx: ActionContext) {
  const now = new Date().toISOString();
  const { data, error } = await ctx.admin
    .from("lumenai_action_approvals")
    .select("id,action_run_id")
    .eq("business_id", ctx.businessId)
    .eq("decision", "pending")
    .not("expires_at", "is", null)
    .lte("expires_at", now);
  if (error) throw new LumeniteSafeError("No se pudo comprobar la vigencia de las aprobaciones.", 503);
  const approvalIds = (data ?? []).map((approval) => String(approval.id));
  const runIds = (data ?? []).map((approval) => String(approval.action_run_id));
  if (!approvalIds.length) return;

  const approvalUpdate = await ctx.admin
    .from("lumenai_action_approvals")
    .update({ decision: "expired", decided_at: now, reason: "La solicitud de aprobacion expiro." })
    .eq("business_id", ctx.businessId)
    .eq("decision", "pending")
    .in("id", approvalIds);
  if (approvalUpdate.error) throw new LumeniteSafeError("No se pudieron expirar las aprobaciones.", 503);
  const runUpdate = await ctx.admin
    .from("lumenai_action_runs")
    .update({ status: "expired", completed_at: now, error_code: "APPROVAL_EXPIRED", error_message: "La aprobacion expiro antes de ejecutarse." })
    .eq("business_id", ctx.businessId)
    .eq("status", "awaiting_approval")
    .in("id", runIds)
    .select(PUBLIC_RUN_COLUMNS);
  if (runUpdate.error) throw new LumeniteSafeError("No se pudieron cerrar las acciones expiradas.", 503);
  await Promise.all(
    ((runUpdate.data ?? []) as ActionRunRow[]).map((run) =>
      syncPulseSignalForRun({
        admin: ctx.admin,
        businessId: ctx.businessId,
        signalId: run.signal_id,
        planId: run.plan_id,
        runId: run.id,
        status: "expired",
        error: "La aprobacion expiro antes de ejecutarse.",
      }),
    ),
  );
}

async function persistApproval(ctx: ActionContext, run: ActionRunRow) {
  if (!ctx.permissions.includes("permissions:manage")) {
    throw new LumeniteSafeError("No tienes permiso para aprobar acciones.", 403);
  }
  const now = new Date().toISOString();
  const { data, error } = await ctx.admin
    .from("lumenai_action_approvals")
    .update({ decision: "approved", decided_by: ctx.userId, decided_at: now })
    .eq("business_id", ctx.businessId)
    .eq("action_run_id", run.id)
    .eq("decision", "pending")
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();
  if (error) throw new LumeniteSafeError("No se pudo registrar la aprobacion.", 503);
  if (!data?.id) throw new LumeniteSafeError("La aprobacion ya no esta pendiente o ha expirado.", 409);
  const updated = await ctx.admin
    .from("lumenai_action_runs")
    .update({ status: "approved", approved_by: ctx.userId, approved_at: now })
    .eq("id", run.id)
    .eq("business_id", ctx.businessId)
    .eq("status", "awaiting_approval")
    .select(PRIVATE_RUN_COLUMNS)
    .maybeSingle();
  if (updated.error || !updated.data?.id) {
    throw new LumeniteSafeError("La accion ya no esta pendiente de aprobacion.", 409);
  }
  return updated.data as ActionRunRow;
}

export async function executeLumeniteAction(input: { runId: string; approve?: boolean; request?: Request }) {
  const ctx = await requireLumeniteActionContext(input.request);
  await expirePendingApprovals(ctx);
  let run = await readPrivateRun(ctx, input.runId);
  if (run.revocation_requested_at) {
    throw new LumeniteSafeError("La accion fue detenida por una revocacion de permisos.", 409);
  }
  if (["completed", "undo_available", "reverted"].includes(run.status)) {
    await syncPulseSignalForRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      signalId: run.signal_id,
      planId: run.plan_id,
      runId: run.id,
      status: run.status,
      receipt: run.receipt,
      verification: run.verification_result,
    });
    return { run: mapRun(run), receipt: run.receipt ?? {}, deduplicated: true };
  }
  const definition = getActionDefinition(run.capability);
  if (!definition) throw new LumeniteSafeError("La capacidad ya no esta registrada.", 409);
  const parsedInput = definition.inputSchema.safeParse(run.payload);
  if (!parsedInput.success) throw new LumeniteSafeError("La entrada persistida ya no cumple el contrato.", 409);

  const authorization = await authorizeRegisteredAction({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    role: ctx.role,
    capability: definition.id,
    resourceType: definition.resourceType,
    integrationId: run.integration_id,
    approvalMode: definition.approvalMode,
    riskLevel: definition.riskLevel,
    accessType: definition.accessType,
    supportsUndo: definition.supportsUndo,
    currentRunId: run.id,
  });
  if (!authorization.decision.allowed || !authorization.decision.canExecute) {
    throw new LumeniteSafeError(authorization.decision.reason, 403);
  }
  if (run.status === "awaiting_approval") {
    if (!input.approve) throw new LumeniteSafeError("La accion necesita aprobacion explicita.", 409);
    run = await persistApproval(ctx, run);
  }
  if (!['approved', 'queued'].includes(run.status)) {
    throw new LumeniteSafeError("La accion no esta lista para ejecutarse.", 409);
  }

  const startedAt = new Date().toISOString();
  const claim = await ctx.admin
    .from("lumenai_action_runs")
    .update({ status: "executing", started_at: startedAt, execution_attempts: Number((run as unknown as { execution_attempts?: number }).execution_attempts ?? 0) + 1 })
    .eq("id", run.id)
    .eq("business_id", ctx.businessId)
    .in("status", ["approved", "queued"])
    .select(PRIVATE_RUN_COLUMNS)
    .maybeSingle();
  if (claim.error) throw new LumeniteSafeError("No se pudo iniciar la ejecucion.", 503);
  if (!claim.data?.id) {
    const current = await readPrivateRun(ctx, run.id);
    if (["completed", "undo_available", "reverted"].includes(current.status)) {
      return { run: mapRun(current), receipt: current.receipt ?? {}, deduplicated: true };
    }
    throw new LumeniteSafeError("La accion ya esta siendo procesada.", 409);
  }
  run = claim.data as ActionRunRow;
  await syncPulseSignalForRun({
    admin: ctx.admin,
    businessId: ctx.businessId,
    signalId: run.signal_id,
    planId: run.plan_id,
    runId: run.id,
    status: "executing",
  });

  let actionApplied = false;
  try {
    const execution = await withTimeout(
      definition.executor(
        { admin: ctx.admin, businessId: ctx.businessId, userId: ctx.userId, runId: run.id, integrationId: run.integration_id },
        parsedInput.data,
      ),
      definition.timeout,
    );
    const output = definition.outputSchema.safeParse(execution.output);
    if (!output.success) throw new Error("INVALID_ACTION_OUTPUT");
    actionApplied = true;
    const revocationProbe = await readPrivateRun(ctx, run.id);
    if (revocationProbe.revocation_requested_at) {
      const completedAt = new Date().toISOString();
      const reversal =
        definition.supportsUndo && definition.undo && execution.undoPayload
          ? await withTimeout(
              definition.undo(
                { admin: ctx.admin, businessId: ctx.businessId, userId: ctx.userId, runId: run.id, integrationId: run.integration_id },
                execution.undoPayload,
              ),
              definition.timeout,
            )
          : null;
      const reverted = Boolean(reversal?.verified);
      const receipt = {
        auditId: run.id,
        requested: run.plan_snapshot?.objective ?? definition.name,
        performed: definition.name,
        resource: output.data,
        verification: reversal ?? { verified: false, summary: "La revocacion llego durante la ejecucion." },
        reversible: false,
        revokedDuringExecution: true,
        completedAt,
      };
      const { data: stopped, error: stopError } = await ctx.admin
        .from("lumenai_action_runs")
        .update({
          status: reverted ? "reverted" : "partially_completed",
          result: receipt,
          receipt,
          undo_payload: execution.undoPayload ?? {},
          undo_status: reverted ? "reverted" : "failed",
          verification_result: reversal ?? {},
          completed_at: completedAt,
          error_code: reverted ? "POLICY_REVOKED_AND_REVERTED" : "POLICY_REVOKED_DURING_EXECUTION",
          error_message: reverted
            ? "La accion se revirtio al recibir una revocacion de permisos."
            : "La accion recibio una revocacion durante la ejecucion y necesita revision.",
        })
        .eq("id", run.id)
        .eq("business_id", ctx.businessId)
        .in("status", ["executing", "verifying"])
        .select(PUBLIC_RUN_COLUMNS)
        .maybeSingle();
      if (stopError || !stopped?.id) throw new Error("REVOCATION_STATE_FAILED");
      await recordRequiredAudit({
        admin: ctx.admin,
        businessId: ctx.businessId,
        userId: ctx.userId,
        action: reverted ? "lumenite.action.revocation_reverted" : "lumenite.action.revocation_partial",
        targetTable: "lumenai_action_runs",
        targetId: run.id,
        metadata: { capability: definition.id, reversal, reason: revocationProbe.revocation_reason },
      });
      await syncPulseSignalForRun({
        admin: ctx.admin,
        businessId: ctx.businessId,
        signalId: run.signal_id,
        planId: run.plan_id,
        runId: run.id,
        status: reverted ? "reverted" : "partially_completed",
        error: reverted
          ? "La revocacion revirtio la accion."
          : "La revocacion interrumpio parcialmente la accion.",
        receipt,
        verification: reversal ?? {},
      });
      await updatePlanStatus(ctx, run.plan_id);
      return { run: mapRun(stopped as ActionRunRow), receipt, deduplicated: false };
    }
    const verifyingAt = new Date().toISOString();
    const verifyUpdate = await ctx.admin
      .from("lumenai_action_runs")
      .update({
        status: "verifying",
        result: output.data,
        undo_payload: execution.undoPayload ?? {},
        external_reference: execution.externalReference ?? null,
        updated_at: verifyingAt,
      })
      .eq("id", run.id)
      .eq("business_id", ctx.businessId);
    if (verifyUpdate.error) throw new Error("VERIFY_STATE_FAILED");
    const verification = await withTimeout(
      definition.verifier(
        { admin: ctx.admin, businessId: ctx.businessId, userId: ctx.userId, runId: run.id, integrationId: run.integration_id },
        output.data,
      ),
      definition.timeout,
    );
    const completedAt = new Date().toISOString();
    const undoAvailable =
      verification.verified && definition.supportsUndo && authorization.policy.allowsUndo;
    const finalStatus: LumeniteActionStatus = verification.verified
      ? undoAvailable
        ? "undo_available"
        : "completed"
      : "partially_completed";
    const receipt = {
      auditId: run.id,
      requested: run.plan_snapshot?.objective ?? definition.name,
      performed: definition.name,
      provider: definition.provider,
      resource: output.data,
      verification,
      reversible: undoAvailable,
      completedAt,
    };
    const final = await ctx.admin
      .from("lumenai_action_runs")
      .update({
        status: finalStatus,
        result: receipt,
        receipt,
        verification_result: verification,
        undo_status: undoAvailable ? "available" : "not_available",
        completed_at: completedAt,
        error_code: null,
        error_message: null,
      })
      .eq("id", run.id)
      .eq("business_id", ctx.businessId)
      .select(PRIVATE_RUN_COLUMNS)
      .single();
    if (final.error) throw new Error("FINAL_STATE_FAILED");
    await syncPulseSignalForRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      signalId: run.signal_id,
      planId: run.plan_id,
      runId: run.id,
      status: finalStatus,
      receipt,
      verification,
    });
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "lumenite.action.completed",
      targetTable: "lumenai_action_runs",
      targetId: run.id,
      metadata: {
        capability: definition.id,
        source: run.source,
        riskLevel: definition.riskLevel,
        approval: run.approved_by || input.approve ? "human" : "policy",
        verification,
      },
    });
    await updatePlanStatus(ctx, run.plan_id);
    return { run: mapRun(final.data as ActionRunRow), receipt, deduplicated: false };
  } catch (error) {
    const safe = executionError(error);
    const failedAt = new Date().toISOString();
    await ctx.admin
      .from("lumenai_action_runs")
      .update({
        status: actionApplied ? "partially_completed" : "failed",
        failed_at: failedAt,
        completed_at: failedAt,
        error_code: safe.code,
        error_message: safe.message,
      })
      .eq("id", run.id)
      .eq("business_id", ctx.businessId);
    await syncPulseSignalForRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      signalId: run.signal_id,
      planId: run.plan_id,
      runId: run.id,
      status: actionApplied ? "partially_completed" : "failed",
      error: safe.message,
    }).catch(() => undefined);
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "lumenite.action.failed",
      targetTable: "lumenai_action_runs",
      targetId: run.id,
      metadata: { capability: definition.id, errorCode: safe.code },
    }).catch(() => undefined);
    await updatePlanStatus(ctx, run.plan_id);
    throw new LumeniteSafeError(safe.message, safe.status);
  }
}

export async function undoLumeniteAction(runId: string, request?: Request) {
  const ctx = await requireLumeniteActionContext(request);
  const run = await readPrivateRun(ctx, runId);
  if (run.status === "reverted") {
    await syncPulseSignalForRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      signalId: run.signal_id,
      planId: run.plan_id,
      runId: run.id,
      status: "reverted",
      receipt: run.receipt,
      verification: run.verification_result,
    });
    return { run: mapRun(run), verification: run.verification_result, deduplicated: true };
  }
  if (!canUndoStatus(run.status) || run.undo_status !== "available") {
    throw new LumeniteSafeError("Esta accion no esta disponible para deshacer.", 409);
  }
  const definition = getActionDefinition(run.capability);
  if (!definition?.supportsUndo || !definition.undo) {
    throw new LumeniteSafeError("La capacidad no implementa deshacer.", 409);
  }
  const authorization = await authorizeRegisteredAction({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    role: ctx.role,
    capability: definition.id,
    resourceType: definition.resourceType,
    approvalMode: "always",
    riskLevel: definition.riskLevel,
    accessType: definition.accessType,
    supportsUndo: true,
    skipOperationalLimits: true,
  });
  if (!authorization.policy.allowsUndo) {
    throw new LumeniteSafeError("La politica vigente no permite deshacer esta accion.", 403);
  }
    const claim = await ctx.admin
      .from("lumenai_action_runs")
      .update({ undo_status: "requested" })
      .eq("id", run.id)
      .eq("business_id", ctx.businessId)
      .eq("undo_status", "available")
      .select("id")
      .maybeSingle();
  if (claim.error) throw new LumeniteSafeError("No se pudo iniciar la reversion.", 503);
  if (!claim.data?.id) {
    const current = await readPrivateRun(ctx, run.id);
    if (current.status === "reverted") {
      await syncPulseSignalForRun({
        admin: ctx.admin,
        businessId: ctx.businessId,
        signalId: current.signal_id,
        planId: current.plan_id,
        runId: current.id,
        status: "reverted",
        receipt: current.receipt,
        verification: current.verification_result,
      });
      return { run: mapRun(current), verification: current.verification_result, deduplicated: true };
    }
    throw new LumeniteSafeError("La reversion ya esta siendo procesada.", 409);
  }
  try {
    const verification = await withTimeout(
      definition.undo(
        { admin: ctx.admin, businessId: ctx.businessId, userId: ctx.userId, runId: run.id, integrationId: run.integration_id },
        isRecord(run.undo_payload) ? run.undo_payload : {},
      ),
      definition.timeout,
    );
    if (!verification.verified) throw new Error("UNDO_NOT_VERIFIED");
    const { data, error } = await ctx.admin
      .from("lumenai_action_runs")
      .update({
        status: "reverted",
        undo_status: "reverted",
        verification_result: verification,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
      .eq("business_id", ctx.businessId)
      .select(PRIVATE_RUN_COLUMNS)
      .single();
    if (error) throw new Error("UNDO_STATE_FAILED");
    await syncPulseSignalForRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      signalId: run.signal_id,
      planId: run.plan_id,
      runId: run.id,
      status: "reverted",
      receipt: run.receipt,
      verification,
    });
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "lumenite.action.reverted",
      targetTable: "lumenai_action_runs",
      targetId: run.id,
      metadata: { capability: definition.id, verification },
    });
    await updatePlanStatus(ctx, run.plan_id);
    return { run: mapRun(data as ActionRunRow), verification, deduplicated: false };
  } catch {
    const current = await readPrivateRun(ctx, run.id).catch(() => null);
    if (current?.status === "reverted") {
      await ctx.admin
        .from("lumenai_action_runs")
        .update({
          error_code: "AUDIT_WRITE_FAILED",
          error_message: "La accion se revirtio, pero su evento de auditoria no pudo registrarse.",
        })
        .eq("id", run.id)
        .eq("business_id", ctx.businessId);
      throw new LumeniteSafeError(
        "La accion se revirtio, pero su evento de auditoria necesita revision.",
        500,
      );
    }
    await ctx.admin
      .from("lumenai_action_runs")
      .update({ undo_status: "failed", error_code: "UNDO_FAILED", error_message: "No se pudo verificar la reversion." })
      .eq("id", run.id)
      .eq("business_id", ctx.businessId);
    throw new LumeniteSafeError("No se pudo verificar la reversion.", 500);
  }
}

export async function decideLumeniteAction(input: {
  request?: Request;
  runId: string;
  decision: "reject" | "cancel" | "request_changes";
  reason?: string;
}) {
  const ctx = await requireLumeniteActionContext(input.request);
  const run = await readPrivateRun(ctx, input.runId);
  if (!canCancelStatus(run.status)) {
    throw new LumeniteSafeError("La accion ya no puede cancelarse.", 409);
  }

  if (["reject", "request_changes"].includes(input.decision) && !ctx.permissions.includes("permissions:manage")) {
    throw new LumeniteSafeError("No tienes permiso para decidir aprobaciones.", 403);
  }

  if (input.decision === "request_changes") {
    const reason = cleanString(input.reason, 500);
    if (reason.length < 3) throw new LumeniteSafeError("Describe los cambios necesarios.", 400);
    if (run.status !== "awaiting_approval" || !run.plan_id) {
      throw new LumeniteSafeError("Solo una aprobacion pendiente puede solicitar cambios.", 409);
    }
    const { data: previousPlan, error: planError } = await ctx.admin
      .from("lumenai_agent_plans")
      .select("id,root_plan_id,version,instruction,plan_snapshot")
      .eq("id", run.plan_id)
      .eq("business_id", ctx.businessId)
      .maybeSingle();
    if (planError || !previousPlan?.id) throw new LumeniteSafeError("No se encontro el plan original.", 404);

    const previousSnapshot = isRecord(previousPlan.plan_snapshot) ? previousPlan.plan_snapshot : {};
    const replacement = await createLumenitePlan({
      request: input.request,
      agent: cleanString(previousSnapshot.agent, 80) || "panel",
      instruction: `${cleanString(previousPlan.instruction, 2400)}\n\nCambios solicitados: ${reason}`,
      source: run.source,
      context: {
        changeRequest: reason,
        enforceVersionedAction: true,
        suggestedAction: {
          capability: run.capability,
          input: isRecord(run.payload) ? run.payload : {},
          reason: `Nueva version solicitada: ${reason}`,
          expectedResult: cleanString(
            isRecord(run.plan_snapshot?.dryRun) ? run.plan_snapshot.dryRun.expectedResult : "",
            400,
          ),
        },
      },
      requestKey: randomUUID(),
      signalId: run.signal_id,
      versionContext: {
        rootPlanId: String(previousPlan.root_plan_id || previousPlan.id),
        parentPlanId: String(previousPlan.id),
        version: Number(previousPlan.version || 1) + 1,
        changeRequest: reason,
      },
    });

    const now = new Date().toISOString();
    const { data: oldRuns, error: oldRunsError } = await ctx.admin
      .from("lumenai_action_runs")
      .select("id")
      .eq("business_id", ctx.businessId)
      .eq("plan_id", run.plan_id)
      .in("status", ["draft", "planning", "awaiting_approval", "approved", "queued"]);
    if (oldRunsError) throw new LumeniteSafeError("No se pudo preservar la version anterior.", 503);
    const oldRunIds = (oldRuns ?? []).map((item) => String(item.id));
    if (oldRunIds.length) {
      const runUpdate = await ctx.admin
        .from("lumenai_action_runs")
        .update({
          status: "changes_requested",
          completed_at: now,
          error_code: "CHANGES_REQUESTED",
          error_message: reason,
        })
        .eq("business_id", ctx.businessId)
        .in("id", oldRunIds)
        .in("status", ["draft", "planning", "awaiting_approval", "approved", "queued"]);
      if (runUpdate.error) throw new LumeniteSafeError("No se pudo cerrar la version anterior.", 503);
      const approvalUpdate = await ctx.admin
        .from("lumenai_action_approvals")
        .update({ decision: "changes_requested", decided_by: ctx.userId, decided_at: now, reason })
        .eq("business_id", ctx.businessId)
        .eq("decision", "pending")
        .in("action_run_id", oldRunIds);
      if (approvalUpdate.error) throw new LumeniteSafeError("No se pudo invalidar la aprobacion anterior.", 503);
    }
    const planUpdate = await ctx.admin
      .from("lumenai_agent_plans")
      .update({ status: "superseded", superseded_at: now, superseded_by: replacement.planId, completed_at: now })
      .eq("id", run.plan_id)
      .eq("business_id", ctx.businessId);
    if (planUpdate.error) throw new LumeniteSafeError("No se pudo enlazar la nueva version del plan.", 503);
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "lumenite.plan.changes_requested",
      targetTable: "lumenai_agent_plans",
      targetId: run.plan_id,
      metadata: {
        reason,
        previousVersion: Number(previousPlan.version || 1),
        replacementPlanId: replacement.planId,
        replacementVersion: replacement.version,
      },
    });
    const previousRun = await readPrivateRun(ctx, run.id);
    return { run: mapRun(previousRun), replacement };
  }

  const status: LumeniteActionStatus = input.decision === "reject" ? "rejected" : "cancelled";
  const now = new Date().toISOString();
  const { data, error } = await ctx.admin
    .from("lumenai_action_runs")
    .update({ status, cancelled_at: now, completed_at: now })
    .eq("id", run.id)
    .eq("business_id", ctx.businessId)
    .in("status", ["draft", "planning", "awaiting_approval", "approved", "queued"])
    .select(PUBLIC_RUN_COLUMNS)
    .maybeSingle();
  if (error || !data?.id) throw new LumeniteSafeError("No se pudo cancelar la accion.", 409);
  if (input.decision === "reject") {
    const approvalUpdate = await ctx.admin
      .from("lumenai_action_approvals")
      .update({
        decision: "rejected",
        decided_by: ctx.userId,
        decided_at: now,
        reason: cleanString(input.reason, 500),
      })
      .eq("business_id", ctx.businessId)
      .eq("action_run_id", run.id)
      .eq("decision", "pending");
    if (approvalUpdate.error) {
      throw new LumeniteSafeError("La accion se rechazo, pero no se pudo cerrar su aprobacion.", 503);
    }
  } else {
    const approvalUpdate = await ctx.admin
      .from("lumenai_action_approvals")
      .update({
        decision: "expired",
        decided_by: ctx.userId,
        decided_at: now,
        reason: cleanString(input.reason, 500) || "Accion cancelada por el solicitante.",
      })
      .eq("business_id", ctx.businessId)
      .eq("action_run_id", run.id)
      .eq("decision", "pending");
    if (approvalUpdate.error) {
      throw new LumeniteSafeError("La accion se cancelo, pero no se pudo cerrar su aprobacion.", 503);
    }
  }
  await recordRequiredAudit({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: `lumenite.action.${status}`,
    targetTable: "lumenai_action_runs",
    targetId: run.id,
    metadata: { capability: run.capability, reason: cleanString(input.reason, 500) },
  });
  await syncPulseSignalForRun({
    admin: ctx.admin,
    businessId: ctx.businessId,
    signalId: run.signal_id,
    planId: run.plan_id,
    runId: run.id,
    status,
    error: cleanString(input.reason, 500) || null,
  });
  await updatePlanStatus(ctx, run.plan_id);
  return { run: mapRun(data as ActionRunRow), replacement: null };
}

export async function listLumeniteRuns(request?: Request) {
  const ctx = await requireLumeniteActionContext(request);
  await expirePendingApprovals(ctx);
  const [{ data: runs, error }, policy, approvalResult, integrationResult] = await Promise.all([
    ctx.admin
      .from("lumenai_action_runs")
      .select(PUBLIC_RUN_COLUMNS)
      .eq("business_id", ctx.businessId)
      .order("created_at", { ascending: false })
      .limit(80),
    authorizeRegisteredAction({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      role: ctx.role,
      capability: "internal.task.create",
      resourceType: "task",
      approvalMode: "policy",
      riskLevel: "low",
      accessType: "create",
      supportsUndo: true,
    }),
    ctx.admin
      .from("lumenai_action_approvals")
      .select("id,action_run_id,requested_from,decided_by,decision,reason,expires_at,decided_at,created_at,plan_version")
      .eq("business_id", ctx.businessId)
      .order("created_at", { ascending: false })
      .limit(200),
    ctx.admin
      .from("lumenai_integrations")
      .select("id,provider")
      .eq("business_id", ctx.businessId),
  ]);
  if (error || approvalResult.error || integrationResult.error) {
    throw new LumeniteSafeError("No se pudo leer el historial.", 503);
  }
  const mappedRuns = (runs ?? []).map((row) => mapRun(row as ActionRunRow));
  const runMap = new Map(mappedRuns.map((run) => [run.id, run]));
  const requesterIds = Array.from(new Set(mappedRuns.map((run) => run.requestedBy).filter(Boolean))) as string[];
  const profileResult = requesterIds.length
    ? await ctx.admin.from("profiles").select("id,metadata").in("id", requesterIds)
    : { data: [], error: null };
  const requesterNames = new Map(
    (profileResult.data ?? []).map((profile) => {
      const metadata = isRecord(profile.metadata) ? profile.metadata : {};
      return [String(profile.id), cleanString(metadata.display_name, 80)];
    }),
  );
  const integrationNames = new Map(
    (integrationResult.data ?? []).map((integration) => [String(integration.id), String(integration.provider)]),
  );
  const inboxItems = (approvalResult.data ?? [])
    .map((approval): LumeniteApprovalInboxItem | null => {
      const run = runMap.get(String(approval.action_run_id));
      if (!run) return null;
      return {
        id: String(approval.id),
        decision: approval.decision as LumeniteApprovalInboxItem["decision"],
        reason: approval.reason ? String(approval.reason) : null,
        requestedFrom: approval.requested_from ? String(approval.requested_from) : null,
        decidedBy: approval.decided_by ? String(approval.decided_by) : null,
        expiresAt: approval.expires_at ? String(approval.expires_at) : null,
        decidedAt: approval.decided_at ? String(approval.decided_at) : null,
        createdAt: String(approval.created_at),
        planVersion: Number(approval.plan_version) || 1,
        requesterName: run.requestedBy
          ? requesterNames.get(run.requestedBy) || `Usuario ${run.requestedBy.slice(0, 8)}`
          : "Sistema",
        businessName: ctx.business.name,
        integrationName: run.integrationId ? integrationNames.get(run.integrationId) || "Integracion" : null,
        run,
      };
    })
    .filter((item): item is LumeniteApprovalInboxItem => Boolean(item));
  const approvalInbox = {
    pending: inboxItems.filter((item) => item.decision === "pending" && item.run.status === "awaiting_approval"),
    approved: inboxItems.filter((item) => item.decision === "approved" && ["approved", "queued", "executing", "verifying"].includes(item.run.status)),
    rejected: inboxItems.filter((item) => ["rejected", "changes_requested"].includes(item.decision)),
    expired: inboxItems.filter((item) => item.decision === "expired" || item.run.status === "expired"),
    executed: inboxItems.filter((item) => item.decision === "approved" && ["completed", "undo_available"].includes(item.run.status)),
    failed: inboxItems.filter((item) => ["failed", "partially_completed", "cancelled"].includes(item.run.status)),
    reverted: inboxItems.filter((item) => item.run.status === "reverted"),
  };
  return {
    runs: mappedRuns,
    approvals: mappedRuns.filter((run) => run.status === "awaiting_approval"),
    approvalInbox,
    capabilities: publicActionCatalog(),
    autonomy: {
      level: policy.policy.autonomyLevel,
      requiresApproval: policy.policy.requiresApproval,
      allowsAutoExecute: policy.policy.allowsAutoExecute,
      role: ctx.role,
    },
  };
}
