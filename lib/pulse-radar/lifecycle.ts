import type { adminClient } from "@/app/api/panel/calibration/_lib";
import type { LumeniteActionStatus } from "@/lib/ai/lumenite/core";
import { LumeniteSafeError } from "@/lib/ai/lumenite/errors";

type Admin = ReturnType<typeof adminClient>;

export type PulseSignalStatus =
  | "new"
  | "viewed"
  | "action_prepared"
  | "awaiting_approval"
  | "executing"
  | "resolved"
  | "partially_resolved"
  | "failed"
  | "reverted"
  | "dismissed";

export type PulseSignalDetection = {
  signalKey: string;
  type: string;
  title: string;
  description: string;
  severity: "info" | "success" | "warning" | "critical";
  evidence: Record<string, unknown>;
  sourceLabel: string;
  sourceRoute: string | null;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string;
  recommendedCapability: string;
  recommendedInput: Record<string, unknown>;
};

export type PulseSignalRow = {
  id: string;
  business_id: string;
  signal_key: string;
  type: string;
  title: string;
  description: string;
  severity: PulseSignalDetection["severity"];
  status: PulseSignalStatus;
  evidence: Record<string, unknown> | null;
  source_label: string;
  source_route: string | null;
  period_label: string;
  period_start: string | null;
  period_end: string;
  recommended_capability: string | null;
  recommended_input: Record<string, unknown> | null;
  action_plan_id: string | null;
  action_run_id: string | null;
  last_error: string | null;
  resolution: Record<string, unknown> | null;
  detected_at: string;
  viewed_at: string | null;
  dismissed_at: string | null;
  snoozed_until: string | null;
  reverted_at: string | null;
  last_refreshed_at: string;
  updated_at: string;
};

export const PULSE_SIGNAL_COLUMNS =
  "id,business_id,signal_key,type,title,description,severity,status,evidence,source_label,source_route,period_label,period_start,period_end,recommended_capability,recommended_input,action_plan_id,action_run_id,last_error,resolution,detected_at,viewed_at,dismissed_at,snoozed_until,reverted_at,last_refreshed_at,updated_at";

export async function upsertPulseSignals(input: {
  admin: Admin;
  businessId: string;
  detections: PulseSignalDetection[];
}) {
  if (!input.detections.length) return [] as PulseSignalRow[];
  const refreshedAt = new Date().toISOString();
  const rows = input.detections.map((signal) => ({
    business_id: input.businessId,
    signal_key: signal.signalKey,
    type: signal.type,
    title: signal.title,
    description: signal.description,
    severity: signal.severity,
    evidence: signal.evidence,
    source_label: signal.sourceLabel,
    source_route: signal.sourceRoute,
    period_label: signal.periodLabel,
    period_start: signal.periodStart,
    period_end: signal.periodEnd,
    recommended_capability: signal.recommendedCapability,
    recommended_input: signal.recommendedInput,
    last_refreshed_at: refreshedAt,
  }));
  const { data, error } = await input.admin
    .from("lumenai_pulse_signals")
    .upsert(rows, { onConflict: "business_id,signal_key" })
    .select(PULSE_SIGNAL_COLUMNS);
  if (error) throw new LumeniteSafeError("No se pudieron persistir las senales de Pulse Radar.", 503);
  return (data ?? []) as PulseSignalRow[];
}

export async function readPulseSignal(input: {
  admin: Admin;
  businessId: string;
  signalId: string;
}) {
  const { data, error } = await input.admin
    .from("lumenai_pulse_signals")
    .select(PULSE_SIGNAL_COLUMNS)
    .eq("id", input.signalId)
    .eq("business_id", input.businessId)
    .maybeSingle();
  if (error) throw new LumeniteSafeError("No se pudo leer la senal de Pulse Radar.", 503);
  if (!data?.id) throw new LumeniteSafeError("La senal no existe en el negocio activo.", 404);
  return data as PulseSignalRow;
}

function pulseStatusForRun(status: LumeniteActionStatus): PulseSignalStatus {
  if (status === "awaiting_approval" || status === "changes_requested") return "awaiting_approval";
  if (["approved", "queued", "draft", "planning"].includes(status)) return "action_prepared";
  if (["executing", "verifying"].includes(status)) return "executing";
  if (["completed", "undo_available"].includes(status)) return "resolved";
  if (status === "partially_completed") return "partially_resolved";
  if (status === "reverted") return "reverted";
  return "failed";
}

export async function syncPulseSignalForRun(input: {
  admin: Admin;
  businessId: string;
  signalId?: string | null;
  planId?: string | null;
  runId?: string | null;
  status: LumeniteActionStatus;
  error?: string | null;
  receipt?: Record<string, unknown> | null;
  verification?: Record<string, unknown> | null;
}) {
  if (!input.signalId) return;
  const status = pulseStatusForRun(input.status);
  const now = new Date().toISOString();
  const { error } = await input.admin
    .from("lumenai_pulse_signals")
    .update({
      status,
      action_plan_id: input.planId ?? undefined,
      action_run_id: input.runId ?? undefined,
      last_error: input.error ?? null,
      resolution: {
        runStatus: input.status,
        receipt: input.receipt ?? {},
        verification: input.verification ?? {},
        synchronizedAt: now,
      },
      reverted_at: status === "reverted" ? now : null,
    })
    .eq("id", input.signalId)
    .eq("business_id", input.businessId);
  if (error) throw new LumeniteSafeError("La accion cambio, pero Pulse Radar no pudo sincronizarse.", 503);
}

export async function mutatePulseSignal(input: {
  admin: Admin;
  businessId: string;
  userId: string;
  signalId: string;
  action: "view" | "dismiss" | "snooze" | "retry";
  snoozeMinutes?: number;
}) {
  const signal = await readPulseSignal(input);
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;
  if (input.action === "view") {
    patch = { status: signal.status === "new" ? "viewed" : signal.status, viewed_at: now, viewed_by: input.userId };
  } else if (input.action === "dismiss") {
    patch = { status: "dismissed", dismissed_at: now, dismissed_by: input.userId, snoozed_until: null };
  } else if (input.action === "snooze") {
    const minutes = Math.max(5, Math.min(1440, Math.round(input.snoozeMinutes || 20)));
    patch = {
      status: signal.status === "new" ? "viewed" : signal.status,
      viewed_at: signal.viewed_at ?? now,
      viewed_by: input.userId,
      snoozed_until: new Date(Date.now() + minutes * 60_000).toISOString(),
    };
  } else {
    if (!["failed", "partially_resolved", "reverted"].includes(signal.status)) {
      throw new LumeniteSafeError("Esta senal no necesita un reintento.", 409);
    }
    const attempt = Number(signal.resolution?.attempt ?? 1) + 1;
    patch = {
      status: "viewed",
      action_plan_id: null,
      action_run_id: null,
      last_error: null,
      resolution: { attempt, retriedAt: now },
      reverted_at: null,
    };
  }
  const { data, error } = await input.admin
    .from("lumenai_pulse_signals")
    .update(patch)
    .eq("id", input.signalId)
    .eq("business_id", input.businessId)
    .select(PULSE_SIGNAL_COLUMNS)
    .single();
  if (error) throw new LumeniteSafeError("No se pudo actualizar la senal de Pulse Radar.", 503);
  return data as PulseSignalRow;
}
