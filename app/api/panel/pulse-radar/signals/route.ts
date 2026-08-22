import { NextResponse } from "next/server";
import { createLumenitePlan } from "@/lib/ai/lumenite/action-engine";
import { recordRequiredAudit } from "@/lib/ai/lumenite/audit";
import { cleanString, isRecord, isUuid } from "@/lib/ai/lumenite/core";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { requireLumeniteActionContext, requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { mutatePulseSignal, readPulseSignal } from "@/lib/pulse-radar/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const action = isRecord(body) ? cleanString(body.action, 20) : "";
    const signalId = isRecord(body) ? cleanString(body.signalId, 80) : "";
    if (!isRecord(body) || !isUuid(signalId) || !["view", "dismiss", "snooze", "prepare", "retry"].includes(action)) {
      return NextResponse.json({ ok: false, error: "Accion de senal no valida." }, { status: 400 });
    }

    if (["prepare", "retry"].includes(action)) {
      const ctx = await requireLumeniteActionContext(request);
      let signal = await readPulseSignal({ admin: ctx.admin, businessId: ctx.businessId, signalId });
      if (action === "retry") {
        signal = await mutatePulseSignal({
          admin: ctx.admin,
          businessId: ctx.businessId,
          userId: ctx.userId,
          signalId,
          action: "retry",
        });
      } else if (signal.action_run_id) {
        return NextResponse.json({
          ok: true,
          existing: true,
          signal,
          planId: signal.action_plan_id,
          runId: signal.action_run_id,
          href: `/panel/lumenite?run=${encodeURIComponent(signal.action_run_id)}`,
        });
      }

      const plan = await createLumenitePlan({
        request,
        agent: "radar",
        instruction: `${signal.title}. ${signal.description}`,
        source: "pulse_radar",
        signalId,
        context: { signalId },
      });
      await recordRequiredAudit({
        admin: ctx.admin,
        businessId: ctx.businessId,
        userId: ctx.userId,
        action: action === "retry" ? "pulse.signal.retried" : "pulse.signal.action_prepared",
        targetTable: "lumenai_pulse_signals",
        targetId: signalId,
        metadata: { planId: plan.planId, runIds: plan.runs.map((run) => run.id) },
      });
      return NextResponse.json({ ok: true, signalId, ...plan });
    }

    const ctx = await requireLumeniteBusiness(request);
    const signal = await mutatePulseSignal({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      signalId,
      action: action as "view" | "dismiss" | "snooze",
      snoozeMinutes: Number(body.snoozeMinutes),
    });
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: `pulse.signal.${action}`,
      targetTable: "lumenai_pulse_signals",
      targetId: signalId,
      metadata: { status: signal.status, snoozedUntil: signal.snoozed_until },
    });
    return NextResponse.json({ ok: true, signal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo actualizar la senal.") },
      { status: safeErrorStatus(error) },
    );
  }
}
