import type { adminClient } from "@/app/api/panel/calibration/_lib";
import type { LumeniteActionStatus } from "./core";
import type { LegacyLumeniteActionStatus } from "./schemas";

type Admin = ReturnType<typeof adminClient>;

export async function recordLumeniteActionRun(input: {
  admin: Admin;
  businessId: string;
  userId?: string | null;
  agent: string;
  actionName: string;
  payload?: unknown;
  result?: unknown;
  status?: LumeniteActionStatus | LegacyLumeniteActionStatus;
  error?: string | null;
}) {
  const {
    admin,
    businessId,
    userId = null,
    agent,
    actionName,
    payload = {},
    result = {},
    status = "completed",
    error = null,
  } = input;

  const normalizedStatus: LumeniteActionStatus =
    status === "pending"
      ? "queued"
      : status === "success"
        ? "completed"
        : status === "error"
          ? "failed"
          : status;

  try {
    await admin.from("lumenai_action_runs").insert({
      business_id: businessId,
      user_id: userId,
      agent,
      action_name: actionName,
      capability: actionName,
      payload,
      result,
      status: normalizedStatus,
      error,
      error_message: error,
      completed_at: ["queued", "planning", "executing", "verifying"].includes(normalizedStatus)
        ? null
        : new Date().toISOString(),
    });
  } catch {
    // Action runs are operational telemetry; missing migration must not break the app.
  }
}

export async function recordRequiredAudit(input: {
  admin: Admin;
  businessId: string;
  userId?: string | null;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}) {
  const { error } = await input.admin.from("lumenai_audit_log").insert({
    business_id: input.businessId,
    actor_user_id: input.userId ?? null,
    action: input.action,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error("AUDIT_WRITE_FAILED");
}

export async function recordLumeniteAudit(input: {
  admin: Admin;
  businessId: string;
  userId?: string | null;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}) {
  try {
    await input.admin.from("lumenai_audit_log").insert({
      business_id: input.businessId,
      actor_user_id: input.userId ?? null,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit table exists in the operational migration. Keep routes safe if pending.
  }
}
