import "server-only";

import { getAuthorizedBusinessContext, type BusinessRole } from "@/lib/auth/business-context";
import { publicActionCatalog } from "./action-registry";
import { recordRequiredAudit } from "./audit";
import {
  cleanString,
  isIsoDate,
  isRecord,
  isUuid,
  type LumeniteAccessType,
  type LumeniteAutonomyLevel,
} from "./core";
import { LumeniteSafeError } from "./errors";
import { syncPulseSignalForRun } from "@/lib/pulse-radar/lifecycle";

const ACCESS_TYPES = [
  "read",
  "create",
  "modify",
  "send",
  "publish",
  "delete",
  "export",
  "administer",
] as const satisfies readonly LumeniteAccessType[];

const BUSINESS_ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;
const PENDING_RUN_STATUSES = ["draft", "planning", "awaiting_approval", "approved", "queued"];
const RUN_COLUMNS =
  "id,plan_id,signal_id,requested_by,capability,integration_id,status,created_at,updated_at";

export type LumenitePolicyInput = {
  name: string;
  subjectUserId: string | null;
  role: BusinessRole | null;
  integrationId: string | null;
  capability: string;
  resourceType: string;
  accessTypes: LumeniteAccessType[];
  autonomyLevel: LumeniteAutonomyLevel;
  allowed: boolean;
  maxPerHour: number | null;
  maxPerDay: number | null;
  allowedDays: number[];
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  expiresAt: string | null;
  requiresApproval: boolean;
  allowsAutoExecute: boolean;
  allowsUndo: boolean;
};

type PolicyRow = {
  id: string;
  business_id: string;
  name: string | null;
  subject_user_id: string | null;
  role: BusinessRole | null;
  integration_id: string | null;
  capability: string;
  resource_type: string;
  access_types: LumeniteAccessType[];
  autonomy_level: LumeniteAutonomyLevel;
  allowed: boolean;
  operational_limit: Record<string, unknown> | null;
  allowed_hours: Record<string, unknown> | null;
  expires_at: string | null;
  requires_approval: boolean;
  allows_auto_execute: boolean;
  allows_undo: boolean;
  enabled: boolean;
  revision: number;
  revoked_at: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
};

function optionalUuid(value: unknown, field: string) {
  const cleaned = cleanString(value, 80);
  if (!cleaned) return null;
  if (!isUuid(cleaned)) throw new LumeniteSafeError(`${field} no es valido.`, 400);
  return cleaned;
}

function integerLimit(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
    throw new LumeniteSafeError(`${field} debe estar entre 1 y 10000.`, 400);
  }
  return parsed;
}

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function parseLumenitePolicyInput(value: unknown): LumenitePolicyInput {
  if (!isRecord(value)) throw new LumeniteSafeError("La politica no es valida.", 400);

  const catalog = publicActionCatalog();
  const validCapabilities = new Set(["*", ...catalog.map((item) => item.id)]);
  const validResources = new Set(["*", ...catalog.map((item) => item.resourceType)]);
  const capability = cleanString(value.capability, 120) || "*";
  const resourceType = cleanString(value.resourceType, 120) || "*";
  if (!validCapabilities.has(capability)) {
    throw new LumeniteSafeError("La capacidad seleccionada no esta registrada.", 400);
  }
  if (!validResources.has(resourceType)) {
    throw new LumeniteSafeError("El recurso seleccionado no esta registrado.", 400);
  }

  const level = Number(value.autonomyLevel);
  if (!Number.isInteger(level) || level < 0 || level > 4) {
    throw new LumeniteSafeError("El nivel de autonomia debe estar entre 0 y 4.", 400);
  }

  const rawRole = cleanString(value.role, 20);
  if (rawRole && !BUSINESS_ROLES.includes(rawRole as BusinessRole)) {
    throw new LumeniteSafeError("El rol seleccionado no es valido.", 400);
  }

  const accessTypes = Array.isArray(value.accessTypes)
    ? Array.from(new Set(value.accessTypes.map((item) => cleanString(item, 20))))
        .filter((item): item is LumeniteAccessType => ACCESS_TYPES.includes(item as LumeniteAccessType))
    : [];
  if (!accessTypes.length) throw new LumeniteSafeError("Selecciona al menos un acceso.", 400);

  const allowedDays = Array.isArray(value.allowedDays)
    ? Array.from(new Set(value.allowedDays.map(Number)))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort()
    : [];
  const startTime = cleanString(value.startTime, 5) || null;
  const endTime = cleanString(value.endTime, 5) || null;
  const hasHours = allowedDays.length > 0 || Boolean(startTime) || Boolean(endTime);
  if (
    hasHours &&
    (!allowedDays.length || !/^\d{2}:\d{2}$/.test(startTime ?? "") || !/^\d{2}:\d{2}$/.test(endTime ?? ""))
  ) {
    throw new LumeniteSafeError("El horario necesita dias, hora inicial y hora final.", 400);
  }

  const timezone = cleanString(value.timezone, 80) || "UTC";
  if (!validTimezone(timezone)) throw new LumeniteSafeError("La zona horaria no es valida.", 400);

  const rawExpiry = cleanString(value.expiresAt, 80);
  if (rawExpiry && !isIsoDate(rawExpiry)) throw new LumeniteSafeError("La expiracion no es valida.", 400);
  const expiresAt = rawExpiry ? new Date(rawExpiry).toISOString() : null;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    throw new LumeniteSafeError("La expiracion debe estar en el futuro.", 400);
  }

  const autonomyLevel = level as LumeniteAutonomyLevel;
  const allowsAutoExecute = autonomyLevel === 4 && value.allowsAutoExecute === true;
  const requiresApproval = autonomyLevel === 3 ? true : allowsAutoExecute ? false : value.requiresApproval !== false;

  return {
    name: cleanString(value.name, 100) || "Politica de Lumenite",
    subjectUserId: optionalUuid(value.subjectUserId, "El usuario"),
    role: rawRole ? (rawRole as BusinessRole) : null,
    integrationId: optionalUuid(value.integrationId, "La integracion"),
    capability,
    resourceType,
    accessTypes,
    autonomyLevel,
    allowed: value.allowed !== false,
    maxPerHour: integerLimit(value.maxPerHour, "El maximo por hora"),
    maxPerDay: integerLimit(value.maxPerDay, "El maximo por dia"),
    allowedDays,
    startTime: hasHours ? startTime : null,
    endTime: hasHours ? endTime : null,
    timezone,
    expiresAt,
    requiresApproval,
    allowsAutoExecute,
    allowsUndo: value.allowsUndo !== false,
  };
}

function policyInsert(input: LumenitePolicyInput, businessId: string, userId: string) {
  return {
    business_id: businessId,
    name: input.name,
    subject_user_id: input.subjectUserId,
    role: input.role,
    integration_id: input.integrationId,
    capability: input.capability,
    resource_type: input.resourceType,
    access_types: input.accessTypes,
    autonomy_level: input.autonomyLevel,
    allowed: input.allowed,
    operational_limit: {
      ...(input.maxPerHour ? { maxPerHour: input.maxPerHour } : {}),
      ...(input.maxPerDay ? { maxPerDay: input.maxPerDay } : {}),
    },
    allowed_hours: input.allowedDays.length
      ? {
          days: input.allowedDays,
          start: input.startTime,
          end: input.endTime,
          timezone: input.timezone,
        }
      : {},
    expires_at: input.expiresAt,
    requires_approval: input.requiresApproval,
    allows_auto_execute: input.allowsAutoExecute,
    allows_undo: input.allowsUndo,
    enabled: true,
    revoked_at: null,
    revoked_by: null,
    revocation_reason: null,
    granted_by: userId,
  };
}

function presentPolicy(row: PolicyRow) {
  const limits = isRecord(row.operational_limit) ? row.operational_limit : {};
  const hours = isRecord(row.allowed_hours) ? row.allowed_hours : {};
  return {
    id: row.id,
    name: row.name || "Politica de Lumenite",
    subjectUserId: row.subject_user_id,
    role: row.role,
    integrationId: row.integration_id,
    capability: row.capability,
    resourceType: row.resource_type,
    accessTypes: row.access_types,
    autonomyLevel: row.autonomy_level,
    allowed: row.allowed,
    maxPerHour: Number(limits.maxPerHour) || null,
    maxPerDay: Number(limits.maxPerDay) || null,
    allowedDays: Array.isArray(hours.days) ? hours.days : [],
    startTime: cleanString(hours.start, 5) || null,
    endTime: cleanString(hours.end, 5) || null,
    timezone: cleanString(hours.timezone, 80) || "UTC",
    expiresAt: row.expires_at,
    requiresApproval: row.requires_approval,
    allowsAutoExecute: row.allows_auto_execute,
    allowsUndo: row.allows_undo,
    enabled: row.enabled,
    revision: row.revision,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requirePolicyManager(request?: Request) {
  return getAuthorizedBusinessContext({ request, requiredPermission: "permissions:manage" });
}

async function validateReferences(
  ctx: Awaited<ReturnType<typeof requirePolicyManager>>,
  input: LumenitePolicyInput,
) {
  if (input.subjectUserId) {
    const { data } = await ctx.admin
      .from("lumenai_business_members")
      .select("id")
      .eq("business_id", ctx.businessId)
      .eq("user_id", input.subjectUserId)
      .eq("status", "active")
      .maybeSingle();
    if (!data?.id) throw new LumeniteSafeError("El usuario no es miembro activo del negocio.", 400);
  }
  if (input.integrationId) {
    const { data } = await ctx.admin
      .from("lumenai_integrations")
      .select("id")
      .eq("business_id", ctx.businessId)
      .eq("id", input.integrationId)
      .maybeSingle();
    if (!data?.id) throw new LumeniteSafeError("La integracion no pertenece al negocio.", 400);
  }
}

export async function listLumenitePolicies(request?: Request) {
  const ctx = await requirePolicyManager(request);
  const [policyResult, memberResult, integrationResult] = await Promise.all([
    ctx.admin
      .from("lumenai_agent_policies")
      .select(
        "id,business_id,name,subject_user_id,role,integration_id,capability,resource_type,access_types,autonomy_level,allowed,operational_limit,allowed_hours,expires_at,requires_approval,allows_auto_execute,allows_undo,enabled,revision,revoked_at,revocation_reason,created_at,updated_at",
      )
      .eq("business_id", ctx.businessId)
      .order("updated_at", { ascending: false }),
    ctx.admin
      .from("lumenai_business_members")
      .select("id,user_id,role,status")
      .eq("business_id", ctx.businessId)
      .order("created_at", { ascending: true }),
    ctx.admin
      .from("lumenai_integrations")
      .select("id,provider,status")
      .eq("business_id", ctx.businessId)
      .order("provider", { ascending: true }),
  ]);
  if (policyResult.error || memberResult.error || integrationResult.error) {
    throw new LumeniteSafeError("No se pudo cargar la configuracion de permisos.", 503);
  }

  const memberIds = (memberResult.data ?? []).map((member) => String(member.user_id));
  const profileResult = memberIds.length
    ? await ctx.admin.from("profiles").select("id,metadata").in("id", memberIds)
    : { data: [], error: null };
  const profileNames = new Map(
    (profileResult.data ?? []).map((profile) => {
      const metadata = isRecord(profile.metadata) ? profile.metadata : {};
      return [String(profile.id), cleanString(metadata.display_name, 80)];
    }),
  );

  return {
    business: { id: ctx.businessId, name: ctx.activeBusiness.name },
    role: ctx.role,
    policies: (policyResult.data ?? []).map((row) => presentPolicy(row as PolicyRow)),
    members: (memberResult.data ?? []).map((member) => ({
      id: String(member.id),
      userId: String(member.user_id),
      role: String(member.role),
      status: String(member.status),
      name: profileNames.get(String(member.user_id)) || `Miembro ${String(member.user_id).slice(0, 8)}`,
    })),
    integrations: (integrationResult.data ?? []).map((integration) => ({
      id: String(integration.id),
      provider: String(integration.provider),
      status: String(integration.status),
    })),
    capabilities: publicActionCatalog(),
    accessTypes: [...ACCESS_TYPES],
  };
}

export async function createLumenitePolicy(value: unknown, request?: Request) {
  const ctx = await requirePolicyManager(request);
  const input = parseLumenitePolicyInput(value);
  await validateReferences(ctx, input);
  const { data, error } = await ctx.admin
    .from("lumenai_agent_policies")
    .insert(policyInsert(input, ctx.businessId, ctx.userId))
    .select("*")
    .single();
  if (error || !data?.id) throw new LumeniteSafeError("No se pudo crear la politica.", 503);
  await recordRequiredAudit({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: "lumenite.policy.created",
    targetTable: "lumenai_agent_policies",
    targetId: String(data.id),
    metadata: { capability: input.capability, resourceType: input.resourceType, autonomyLevel: input.autonomyLevel },
  });
  return presentPolicy(data as PolicyRow);
}

export async function updateLumenitePolicy(input: { id: string; revision: number; policy: unknown; request?: Request }) {
  const ctx = await requirePolicyManager(input.request);
  if (!isUuid(input.id) || !Number.isInteger(input.revision)) {
    throw new LumeniteSafeError("La version de la politica no es valida.", 400);
  }
  const policy = parseLumenitePolicyInput(input.policy);
  await validateReferences(ctx, policy);
  const { data, error } = await ctx.admin
    .from("lumenai_agent_policies")
    .update({ ...policyInsert(policy, ctx.businessId, ctx.userId), revision: input.revision + 1 })
    .eq("id", input.id)
    .eq("business_id", ctx.businessId)
    .eq("revision", input.revision)
    .eq("enabled", true)
    .select("*")
    .maybeSingle();
  if (error) throw new LumeniteSafeError("No se pudo actualizar la politica.", 503);
  if (!data?.id) throw new LumeniteSafeError("La politica cambio; vuelve a cargar antes de editar.", 409);
  await recordRequiredAudit({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: "lumenite.policy.updated",
    targetTable: "lumenai_agent_policies",
    targetId: input.id,
    metadata: { revision: input.revision + 1, capability: policy.capability },
  });
  return presentPolicy(data as PolicyRow);
}

async function affectedRequesterIds(
  ctx: Awaited<ReturnType<typeof requirePolicyManager>>,
  policy: PolicyRow,
) {
  if (policy.subject_user_id) return [policy.subject_user_id];
  if (!policy.role) return null;
  const { data, error } = await ctx.admin
    .from("lumenai_business_members")
    .select("user_id")
    .eq("business_id", ctx.businessId)
    .eq("role", policy.role)
    .eq("status", "active");
  if (error) throw new LumeniteSafeError("No se pudo aplicar la revocacion al rol.", 503);
  return (data ?? []).map((member) => String(member.user_id));
}

export async function revokeLumenitePolicy(input: { id: string; reason: string; request?: Request }) {
  const ctx = await requirePolicyManager(input.request);
  if (!isUuid(input.id)) throw new LumeniteSafeError("La politica no es valida.", 400);
  const reason = cleanString(input.reason, 500);
  if (reason.length < 3) throw new LumeniteSafeError("Indica el motivo de la revocacion.", 400);
  const { data: current, error: readError } = await ctx.admin
    .from("lumenai_agent_policies")
    .select("*")
    .eq("id", input.id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();
  if (readError || !current?.id) throw new LumeniteSafeError("La politica no existe.", 404);
  const policy = current as PolicyRow;
  if (!policy.enabled) return { policy: presentPolicy(policy), cancelledRuns: 0, signalledRuns: 0 };

  const now = new Date().toISOString();
  const { data: revoked, error: revokeError } = await ctx.admin
    .from("lumenai_agent_policies")
    .update({
      enabled: false,
      allowed: false,
      revision: policy.revision + 1,
      revoked_at: now,
      revoked_by: ctx.userId,
      revocation_reason: reason,
    })
    .eq("id", input.id)
    .eq("business_id", ctx.businessId)
    .eq("revision", policy.revision)
    .select("*")
    .maybeSingle();
  if (revokeError || !revoked?.id) throw new LumeniteSafeError("La politica ya fue modificada.", 409);

  const requesterIds = await affectedRequesterIds(ctx, policy);
  const resourceCapabilities = publicActionCatalog()
    .filter((item) => policy.resource_type === "*" || item.resourceType === policy.resource_type)
    .map((item) => item.id);
  const capabilities = policy.capability === "*" ? resourceCapabilities : [policy.capability];

  let runsQuery = ctx.admin
    .from("lumenai_action_runs")
    .select(RUN_COLUMNS)
    .eq("business_id", ctx.businessId)
    .in("capability", capabilities)
    .in("status", [...PENDING_RUN_STATUSES, "executing", "verifying"]);
  if (policy.integration_id) runsQuery = runsQuery.eq("integration_id", policy.integration_id);
  if (requesterIds) {
    if (!requesterIds.length) return { policy: presentPolicy(revoked as PolicyRow), cancelledRuns: 0, signalledRuns: 0 };
    runsQuery = runsQuery.in("requested_by", requesterIds);
  }
  const { data: affectedRuns, error: runsError } = await runsQuery;
  if (runsError) throw new LumeniteSafeError("La politica se revoco, pero sus acciones necesitan revision.", 500);

  const pendingIds = (affectedRuns ?? [])
    .filter((run) => PENDING_RUN_STATUSES.includes(String(run.status)))
    .map((run) => String(run.id));
  const activeIds = (affectedRuns ?? [])
    .filter((run) => ["executing", "verifying"].includes(String(run.status)))
    .map((run) => String(run.id));

  if (pendingIds.length) {
    const cancelled = await ctx.admin
      .from("lumenai_action_runs")
      .update({
        status: "cancelled",
        cancelled_at: now,
        completed_at: now,
        error_code: "POLICY_REVOKED",
        error_message: "La politica fue revocada antes de iniciar la accion.",
        revocation_requested_at: now,
        revocation_requested_by: ctx.userId,
        revocation_reason: reason,
      })
      .eq("business_id", ctx.businessId)
      .in("id", pendingIds)
      .in("status", PENDING_RUN_STATUSES);
    if (cancelled.error) throw new LumeniteSafeError("No se pudieron detener todas las acciones pendientes.", 500);
    const approvals = await ctx.admin
      .from("lumenai_action_approvals")
      .update({ decision: "expired", decided_by: ctx.userId, decided_at: now, reason })
      .eq("business_id", ctx.businessId)
      .eq("decision", "pending")
      .in("action_run_id", pendingIds);
    if (approvals.error) throw new LumeniteSafeError("No se pudieron invalidar todas las aprobaciones.", 500);
  }

  if (activeIds.length) {
    const signalled = await ctx.admin
      .from("lumenai_action_runs")
      .update({
        revocation_requested_at: now,
        revocation_requested_by: ctx.userId,
        revocation_reason: reason,
      })
      .eq("business_id", ctx.businessId)
      .in("id", activeIds)
      .in("status", ["executing", "verifying"]);
    if (signalled.error) throw new LumeniteSafeError("No se pudo senalizar la detencion en curso.", 500);
  }

  await Promise.all(
    (affectedRuns ?? [])
      .filter((run) => Boolean(run.signal_id))
      .map((run) =>
        syncPulseSignalForRun({
          admin: ctx.admin,
          businessId: ctx.businessId,
          signalId: String(run.signal_id),
          planId: run.plan_id ? String(run.plan_id) : null,
          runId: String(run.id),
          status: PENDING_RUN_STATUSES.includes(String(run.status)) ? "cancelled" : "executing",
          error: `Permiso revocado: ${reason}`,
        }),
      ),
  );

  await recordRequiredAudit({
    admin: ctx.admin,
    businessId: ctx.businessId,
    userId: ctx.userId,
    action: "lumenite.policy.revoked",
    targetTable: "lumenai_agent_policies",
    targetId: input.id,
    metadata: { reason, cancelledRunIds: pendingIds, signalledRunIds: activeIds },
  });
  return {
    policy: presentPolicy(revoked as PolicyRow),
    cancelledRuns: pendingIds.length,
    signalledRuns: activeIds.length,
  };
}
