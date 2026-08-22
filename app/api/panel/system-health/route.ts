import { NextResponse } from "next/server";
import { getLumenitePublicStatus, type LumeniteAgentKey } from "@/lib/ai/lumenite/env";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENTS: LumeniteAgentKey[] = [
  "widget",
  "autoconfig",
  "panel",
  "radar",
  "growth",
  "twin",
  "campaigns",
];

function status(ok: boolean, warning?: boolean) {
  if (ok) return "ready";
  return warning ? "warning" : "critical";
}

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    const [widget, kb, snapshots, actionRuns] = await Promise.all([
      ctx.admin
        .from("widget_settings")
        .select("business_id,public_key,widget_enabled,published_at,whatsapp,email")
        .eq("business_id", ctx.businessId)
        .maybeSingle(),
      ctx.admin
        .from("business_kb")
        .select("id,is_published,type")
        .eq("business_id", ctx.businessId)
        .limit(300),
      ctx.admin
        .from("lumenai_config_snapshots")
        .select("id,created_at")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(5),
      ctx.admin
        .from("lumenai_action_runs")
        .select("id,status,created_at")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const kbRows = Array.isArray(kb.data) ? kb.data : [];
    const publishedKb = kbRows.filter((item) => item.is_published).length;
    const widgetRow = widget.data;
    const env = AGENTS.map((agent) => ({
      agent,
      ...getLumenitePublicStatus(agent),
    }));
    const checks = [
      {
        key: "auth",
        label: "Sesion autenticada",
        status: "ready",
        detail: "Usuario autenticado y negocio activo resuelto.",
      },
      {
        key: "business",
        label: "Negocio activo",
        status: status(Boolean(ctx.businessId)),
        detail: ctx.business.name || "Negocio LumenAI",
      },
      {
        key: "widget",
        label: "Widget configurado",
        status: status(Boolean(widgetRow?.public_key || ctx.business.public_key), true),
        detail: widgetRow?.widget_enabled ? "Widget activo." : "Widget pendiente o apagado.",
      },
      {
        key: "knowledge",
        label: "Knowledge publicado",
        status: status(publishedKb > 0, true),
        detail: `${publishedKb} item(s) publicados de ${kbRows.length}.`,
      },
      {
        key: "snapshots",
        label: "Snapshots Config AI",
        status: status(Array.isArray(snapshots.data) && snapshots.data.length > 0, true),
        detail: `${Array.isArray(snapshots.data) ? snapshots.data.length : 0} snapshot(s) recientes.`,
      },
      {
        key: "action_runs",
        label: "Action runs",
        status: status(Array.isArray(actionRuns.data), true),
        detail: `${Array.isArray(actionRuns.data) ? actionRuns.data.length : 0} accion(es) recientes.`,
      },
      ...env.map((item) => ({
        key: `env_${item.agent}`,
        label: `Key ${item.agent}`,
        status: status(item.configured, item.agent !== "widget"),
        detail: item.configured
          ? item.usingFallbackKey
            ? `Activa con fallback controlado (${item.env}).`
            : `Variable dedicada activa (${item.env}).`
          : `Falta ${item.env}.`,
      })),
    ];
    const critical = checks.filter((check) => check.status === "critical").length;
    const warnings = checks.filter((check) => check.status === "warning").length;

    return NextResponse.json({
      ok: true,
      health: critical ? "critical" : warnings ? "warning" : "ready",
      checks,
      env,
      summary: {
        total: checks.length,
        ready: checks.filter((check) => check.status === "ready").length,
        warnings,
        critical,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo diagnosticar sistema.") },
      { status: safeErrorStatus(error) }
    );
  }
}

export async function POST() {
  try {
    const ctx = await requireLumeniteBusiness();

    await recordLumeniteActionRun({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      agent: "System QA Agent",
      actionName: "system_health.check",
      payload: {},
      result: { checkedAt: new Date().toISOString() },
      status: "success",
    });

    return GET();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar diagnostico.") },
      { status: safeErrorStatus(error) }
    );
  }
}
