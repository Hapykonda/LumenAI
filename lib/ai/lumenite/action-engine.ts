import { callGroqChat } from "@/lib/ai/groq";
import { getLumeniteAgent } from "./agents";
import { getActionDefinition, listActionNames } from "./action-registry";
import { recordLumeniteActionRun, recordLumeniteAudit } from "./audit";
import { requireLumeniteBusiness } from "./permissions";
import {
  cleanText,
  safeJson,
  validateLumenitePlan,
  type LumenitePlan,
  type LumenitePlannedAction,
} from "./schemas";
import type { LumeniteAgentKey } from "./env";

function purposeForAgent(agentKey: string): LumeniteAgentKey {
  if (
    agentKey === "widget" ||
    agentKey === "autoconfig" ||
    agentKey === "panel" ||
    agentKey === "radar" ||
    agentKey === "growth" ||
    agentKey === "twin" ||
    agentKey === "campaigns"
  ) {
    return agentKey;
  }

  return "panel";
}

function fallbackPlan(agentName: string, instruction: string): LumenitePlan {
  return validateLumenitePlan(
    {
      agent: agentName,
      intent: instruction,
      summary:
        "Lumenite preparo una lectura segura. La accion requiere un modulo especifico o mas datos antes de ejecutarse.",
      risk_level: "medium",
      requires_confirmation: true,
      actions: [],
      user_message:
        "Puedo convertir esta instruccion en acciones cuando haya datos suficientes y un action handler disponible.",
      missing_data: [],
      warnings: ["No se ejecuto ningun cambio automatico desde texto libre."],
    },
    agentName
  );
}

export async function planLumeniteActions(input: {
  agent: string;
  instruction: string;
  context?: unknown;
}) {
  const agent = getLumeniteAgent(input.agent) ?? getLumeniteAgent("panel");
  const agentName = agent?.name ?? "Executive Panel Agent";
  const instruction = cleanText(input.instruction, 2400);

  if (!instruction) {
    return fallbackPlan(agentName, "Solicitud vacia");
  }

  const aiText = await callGroqChat({
    purpose: purposeForAgent(String(agent?.key ?? "panel")),
    responseFormat: "json_object",
    temperature: 0.18,
    maxTokens: 1000,
    messages: [
      {
        role: "system",
        content:
          "Eres Lumenite Action Planner. Devuelve solo JSON estructurado con agent, intent, summary, risk_level, requires_confirmation, actions, user_message, missing_data, warnings. No ejecutes nada. Usa solo action_name de la lista permitida.",
      },
      {
        role: "user",
        content: JSON.stringify({
          agent: agentName,
          purpose: agent?.purpose,
          allowedActions: agent?.allowedActions ?? listActionNames(),
          allKnownActions: listActionNames(),
          instruction,
          context: input.context ?? {},
        }),
      },
    ],
  });

  const parsed = safeJson(aiText, {});
  const plan = validateLumenitePlan(parsed, agentName);
  const allowed = new Set(agent?.allowedActions ?? listActionNames());

  return {
    ...plan,
    actions: plan.actions.filter((action) => {
      const definition = getActionDefinition(action.action_name);
      return definition && allowed.has(action.action_name);
    }),
  };
}

export function dryRunAction(action: LumenitePlannedAction) {
  const definition = getActionDefinition(action.action_name);

  return {
    action_name: action.action_name,
    description: definition?.description ?? "Accion operativa",
    permission_scope: definition?.permissionScope ?? "system:write",
    risk: definition?.risk ?? "medium",
    rollback_available: definition?.rollback ?? action.rollback_available,
    payload: action.payload,
    reason: action.reason,
  };
}

export async function executeLumeniteAction(input: {
  agent: string;
  action: LumenitePlannedAction;
}) {
  const ctx = await requireLumeniteBusiness();
  const definition = getActionDefinition(input.action.action_name);

  if (!definition) {
    throw new Error(`Unsupported action: ${input.action.action_name}`);
  }

  const payload = input.action.payload ?? {};
  const now = new Date().toISOString();
  let result: unknown = { skipped: true };

  if (input.action.action_name === "create_followup_task") {
    const { data, error } = await ctx.admin
      .from("lumenai_followup_tasks")
      .insert({
        business_id: ctx.businessId,
        lead_id: cleanText(payload.lead_id, 80) || null,
        chat_id: cleanText(payload.chat_id, 80) || null,
        opportunity_id: cleanText(payload.opportunity_id, 80) || null,
        title: cleanText(payload.title, 160) || "Seguimiento comercial",
        message: cleanText(payload.message, 1600),
        due_at: cleanText(payload.due_at, 80) || null,
        priority: cleanText(payload.priority, 40) || "medium",
        created_by_ai: true,
      })
      .select("id,title,status,created_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    result = data;
  }

  if (input.action.action_name === "create_market_signal") {
    const { data, error } = await ctx.admin
      .from("lumenai_signal_events")
      .insert({
        business_id: ctx.businessId,
        type: cleanText(payload.type, 80) || "signal",
        title: cleanText(payload.title, 160) || "Senal Lumenite",
        description: cleanText(payload.description, 800),
        severity: cleanText(payload.severity, 40) || "info",
        payload,
      })
      .select("id,title,created_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    result = data;
  }

  await recordLumeniteActionRun({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    agent: input.agent,
    actionName: input.action.action_name,
    payload,
    result,
    status: "success",
  });

  await recordLumeniteAudit({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: `lumenite.${input.action.action_name}`,
    targetTable: "lumenite_action_engine",
    targetId: ctx.businessId,
    metadata: {
      agent: input.agent,
      reason: input.action.reason,
      executedAt: now,
      result,
    },
  });

  return result;
}
