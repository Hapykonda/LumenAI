export const LUMENITE_ACTION_STATUSES = [
  "draft",
  "planning",
  "awaiting_approval",
  "approved",
  "rejected",
  "changes_requested",
  "expired",
  "queued",
  "executing",
  "verifying",
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
  "undo_available",
  "reverted",
] as const;

export const LUMENITE_PHASE_ONE_CAPABILITIES = [
  "internal.task.create",
  "internal.lead.note.add",
  "internal.response.prepare",
  "internal.conversation.tag",
  "internal.reminder.create",
] as const;

export type LumeniteActionStatus = (typeof LUMENITE_ACTION_STATUSES)[number];
export type LumeniteRiskLevel = "low" | "medium" | "high";
export type LumeniteApprovalMode = "never" | "policy" | "always" | "reinforced";
export type LumeniteActionSource =
  | "command_center"
  | "pulse_radar"
  | "panel"
  | "automation"
  | "api";
export type LumeniteAccessType =
  | "read"
  | "create"
  | "modify"
  | "send"
  | "publish"
  | "delete"
  | "export"
  | "administer";
export type LumeniteAutonomyLevel = 0 | 1 | 2 | 3 | 4;

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = {
  success: false;
  issues: Array<{ path: string; message: string }>;
};
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type EffectiveAgentPolicy = {
  id: string | null;
  source: "database" | "system_default";
  businessId: string;
  subjectUserId: string | null;
  role: string;
  integrationId: string | null;
  capability: string;
  resourceType: string;
  accessTypes: LumeniteAccessType[];
  autonomyLevel: LumeniteAutonomyLevel;
  allowed: boolean;
  operationalLimit: Record<string, unknown>;
  allowedHours: Record<string, unknown>;
  expiresAt: string | null;
  requiresApproval: boolean;
  allowsAutoExecute: boolean;
  allowsUndo: boolean;
  grantedBy: string | null;
};

export type AuthorizationDecision = {
  allowed: boolean;
  canExecute: boolean;
  requiresApproval: boolean;
  initialStatus: LumeniteActionStatus;
  reasonCode: string;
  reason: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cleanString(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

export function isUuid(value: unknown): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ""),
  );
}

export function isIsoDate(value: unknown): value is string {
  const text = String(value ?? "").trim();
  return Boolean(text) && Number.isFinite(Date.parse(text));
}

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function defaultAgentPolicy(input: {
  businessId: string;
  userId: string;
  role: string;
  capability: string;
  integrationId?: string | null;
}): EffectiveAgentPolicy {
  const isOwner = input.role === "owner";
  return {
    id: null,
    source: "system_default",
    businessId: input.businessId,
    subjectUserId: input.userId,
    role: input.role,
    integrationId: input.integrationId ?? null,
    capability: input.capability,
    resourceType: "*",
    accessTypes: ["create"],
    autonomyLevel: isOwner ? 3 : 1,
    allowed: isOwner,
    operationalLimit: {},
    allowedHours: {},
    expiresAt: null,
    requiresApproval: true,
    allowsAutoExecute: false,
    allowsUndo: true,
    grantedBy: null,
  };
}

function policyExpired(policy: EffectiveAgentPolicy, now: Date) {
  return Boolean(policy.expiresAt && Date.parse(policy.expiresAt) <= now.getTime());
}

function policyAllowsCurrentHour(policy: EffectiveAgentPolicy, now: Date) {
  const config = policy.allowedHours;
  const days = Array.isArray(config.days)
    ? config.days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const start = cleanString(config.start, 5);
  const end = cleanString(config.end, 5);
  const timezone = cleanString(config.timezone, 80) || "UTC";
  if (!days.length && !start && !end) return true;
  if (!days.length || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return false;
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? "";
    const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      part("weekday"),
    );
    const current = `${part("hour")}:${part("minute")}`;
    const insideWindow = start <= end
      ? current >= start && current <= end
      : current >= start || current <= end;
    return days.includes(dayIndex) && insideWindow;
  } catch {
    return false;
  }
}

export function authorizeAction(input: {
  policy: EffectiveAgentPolicy;
  approvalMode: LumeniteApprovalMode;
  riskLevel: LumeniteRiskLevel;
  accessType: LumeniteAccessType;
  supportsUndo: boolean;
  now?: Date;
}): AuthorizationDecision {
  const now = input.now ?? new Date();
  const { policy } = input;

  if (!policy.allowed || policyExpired(policy, now)) {
    return {
      allowed: false,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: policyExpired(policy, now) ? "POLICY_EXPIRED" : "POLICY_DENIED",
      reason: policyExpired(policy, now)
        ? "El permiso configurado ha expirado."
        : "La politica no permite esta capacidad.",
    };
  }

  if (!policyAllowsCurrentHour(policy, now)) {
    return {
      allowed: false,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: "OUTSIDE_ALLOWED_HOURS",
      reason: "La accion esta fuera del horario permitido por la politica.",
    };
  }

  if (!policy.accessTypes.includes(input.accessType)) {
    return {
      allowed: false,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: "ACCESS_TYPE_DENIED",
      reason: `El permiso no incluye acceso de tipo ${input.accessType}.`,
    };
  }

  if (policy.autonomyLevel === 0) {
    return {
      allowed: false,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: "OBSERVER_ONLY",
      reason: "El nivel Observador solo permite analizar contexto.",
    };
  }

  if (policy.autonomyLevel === 1) {
    return {
      allowed: true,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: "ADVISOR_ONLY",
      reason: "El nivel Asesor puede proponer el plan, pero no ejecutarlo.",
    };
  }

  const reinforced = input.approvalMode === "reinforced" || input.riskLevel === "high";
  const explicitApproval =
    reinforced ||
    input.approvalMode === "always" ||
    policy.requiresApproval ||
    policy.autonomyLevel === 3 ||
    !policy.allowsAutoExecute;

  if (policy.autonomyLevel === 2) {
    return {
      allowed: true,
      canExecute: false,
      requiresApproval: false,
      initialStatus: "draft",
      reasonCode: "PREPARATION_ONLY",
      reason: "El nivel Preparador conserva la accion como borrador revisable.",
    };
  }

  if (explicitApproval) {
    return {
      allowed: true,
      canExecute: true,
      requiresApproval: true,
      initialStatus: "awaiting_approval",
      reasonCode: reinforced ? "REINFORCED_APPROVAL" : "HUMAN_APPROVAL",
      reason: "La accion necesita confirmacion humana explicita antes de ejecutarse.",
    };
  }

  return {
    allowed: true,
    canExecute: true,
    requiresApproval: false,
    initialStatus: "approved",
    reasonCode: "LIMITED_AUTONOMY",
    reason:
      input.supportsUndo && policy.allowsUndo
        ? "Permitida por autonomia limitada y disponible para deshacer."
        : "Permitida por autonomia limitada dentro de la politica vigente.",
  };
}

export function canCancelStatus(status: LumeniteActionStatus) {
  return ["draft", "planning", "awaiting_approval", "approved", "queued"].includes(status);
}

export function canUndoStatus(status: LumeniteActionStatus) {
  return status === "undo_available";
}
