import { LumeniteSafeError } from "./errors";
import {
  authorizeAction,
  defaultAgentPolicy,
  isRecord,
  type AuthorizationDecision,
  type EffectiveAgentPolicy,
  type LumeniteAccessType,
  type LumeniteApprovalMode,
  type LumeniteAutonomyLevel,
  type LumeniteRiskLevel,
} from "./core";
import type { LumeniteAdmin } from "./contracts";

type PolicyRow = {
  id: string;
  business_id: string;
  subject_user_id: string | null;
  role: string | null;
  integration_id: string | null;
  capability: string;
  resource_type: string;
  access_types: string[];
  autonomy_level: number;
  allowed: boolean;
  operational_limit: unknown;
  allowed_hours: unknown;
  expires_at: string | null;
  requires_approval: boolean;
  allows_auto_execute: boolean;
  allows_undo: boolean;
  granted_by: string | null;
};

function specificity(row: PolicyRow, input: PolicyLookupInput) {
  let score = 0;
  if (row.subject_user_id === input.userId) score += 16;
  if (row.capability === input.capability) score += 8;
  if (row.integration_id && row.integration_id === input.integrationId) score += 4;
  if (row.role && row.role === input.role) score += 2;
  if (row.resource_type === input.resourceType) score += 1;
  return score;
}

function asPolicy(row: PolicyRow): EffectiveAgentPolicy {
  return {
    id: String(row.id),
    source: "database",
    businessId: String(row.business_id),
    subjectUserId: row.subject_user_id ? String(row.subject_user_id) : null,
    role: String(row.role || "*"),
    integrationId: row.integration_id ? String(row.integration_id) : null,
    capability: String(row.capability),
    resourceType: String(row.resource_type || "*"),
    accessTypes: Array.isArray(row.access_types)
      ? (row.access_types as EffectiveAgentPolicy["accessTypes"])
      : [],
    autonomyLevel: Math.max(0, Math.min(4, Number(row.autonomy_level))) as LumeniteAutonomyLevel,
    allowed: Boolean(row.allowed),
    operationalLimit: isRecord(row.operational_limit) ? row.operational_limit : {},
    allowedHours: isRecord(row.allowed_hours) ? row.allowed_hours : {},
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    requiresApproval: Boolean(row.requires_approval),
    allowsAutoExecute: Boolean(row.allows_auto_execute),
    allowsUndo: Boolean(row.allows_undo),
    grantedBy: row.granted_by ? String(row.granted_by) : null,
  };
}

type PolicyLookupInput = {
  admin: LumeniteAdmin;
  businessId: string;
  userId: string;
  role: string;
  capability: string;
  resourceType: string;
  integrationId?: string | null;
};

export async function resolveEffectiveAgentPolicy(
  input: PolicyLookupInput,
): Promise<EffectiveAgentPolicy> {
  let query = input.admin
    .from("lumenai_agent_policies")
    .select(
      "id,business_id,subject_user_id,role,integration_id,capability,resource_type,access_types,autonomy_level,allowed,operational_limit,allowed_hours,expires_at,requires_approval,allows_auto_execute,allows_undo,granted_by",
    )
    .eq("business_id", input.businessId)
    .eq("enabled", true)
    .in("capability", ["*", input.capability])
    .in("resource_type", ["*", input.resourceType])
    .or(`subject_user_id.is.null,subject_user_id.eq.${input.userId}`)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (input.integrationId) {
    query = query.or(`integration_id.is.null,integration_id.eq.${input.integrationId}`);
  } else {
    query = query.is("integration_id", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new LumeniteSafeError("No se pudo verificar la politica del agente.", 503);
  }

  const candidates = (Array.isArray(data) ? data : [])
    .map((row) => row as PolicyRow)
    .filter((row) => !row.role || row.role === input.role)
    .sort((a, b) => specificity(b, input) - specificity(a, input));

  if (candidates[0]) return asPolicy(candidates[0]);
  return defaultAgentPolicy({
    businessId: input.businessId,
    userId: input.userId,
    role: input.role,
    capability: input.capability,
    integrationId: input.integrationId,
  });
}

async function operationalLimitDecision(input: {
  admin: LumeniteAdmin;
  businessId: string;
  capability: string;
  policy: EffectiveAgentPolicy;
  currentRunId?: string;
}) {
  const perHour = Number(input.policy.operationalLimit.maxPerHour ?? 0);
  const perDay = Number(input.policy.operationalLimit.maxPerDay ?? 0);
  const statuses = ["approved", "queued", "executing", "verifying", "completed", "undo_available"];

  async function countSince(iso: string) {
    let query = input.admin
      .from("lumenai_action_runs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", input.businessId)
      .eq("capability", input.capability)
      .in("status", statuses)
      .gte("created_at", iso);
    if (input.currentRunId) query = query.neq("id", input.currentRunId);
    const { count, error } = await query;
    if (error) throw new LumeniteSafeError("No se pudo verificar el limite operativo.", 503);
    return count ?? 0;
  }

  if (Number.isFinite(perHour) && perHour > 0) {
    const count = await countSince(new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (count >= perHour) return { allowed: false, code: "HOURLY_LIMIT", limit: perHour };
  }
  if (Number.isFinite(perDay) && perDay > 0) {
    const count = await countSince(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (count >= perDay) return { allowed: false, code: "DAILY_LIMIT", limit: perDay };
  }
  return { allowed: true, code: null, limit: null };
}

export async function authorizeRegisteredAction(input: {
  admin: LumeniteAdmin;
  businessId: string;
  userId: string;
  role: string;
  capability: string;
  resourceType: string;
  integrationId?: string | null;
  approvalMode: LumeniteApprovalMode;
  riskLevel: LumeniteRiskLevel;
  accessType: LumeniteAccessType;
  supportsUndo: boolean;
  currentRunId?: string;
  skipOperationalLimits?: boolean;
}): Promise<{ policy: EffectiveAgentPolicy; decision: AuthorizationDecision }> {
  const policy = await resolveEffectiveAgentPolicy(input);
  const decision = authorizeAction({
    policy,
    approvalMode: input.approvalMode,
    riskLevel: input.riskLevel,
    accessType: input.accessType,
    supportsUndo: input.supportsUndo,
  });

  if (!decision.allowed || !decision.canExecute || input.skipOperationalLimits) return { policy, decision };
  const limit = await operationalLimitDecision({
    admin: input.admin,
    businessId: input.businessId,
    capability: input.capability,
    policy,
    currentRunId: input.currentRunId,
  });
  if (limit.allowed) return { policy, decision };
  return {
    policy,
    decision: {
      allowed: false,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: String(limit.code),
      reason: `La capacidad alcanzo su limite operativo (${limit.limit}).`,
    },
  };
}
