import { NextResponse } from "next/server";
import { getLumenitePublicStatus, type LumeniteAgentKey } from "@/lib/ai/lumenite/env";
import { recordLumeniteActionRun } from "@/lib/ai/lumenite/audit";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { getAppUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENTS: LumeniteAgentKey[] = [
  "calibration",
  "config-ai",
  "lumen-eye",
  "pulse-radar",
  "research",
  "widget",
  "chats",
  "knowledge",
  "interface",
  "overview",
  "access",
];

type HealthStatus = "ready" | "warning" | "critical";

type HealthCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  category: "workspace" | "intelligence" | "release";
  action?: { href: string; label: string };
};

function status(ok: boolean, warning = false): HealthStatus {
  if (ok) return "ready";
  return warning ? "warning" : "critical";
}

function publicAppUrl() {
  const raw = getAppUrl();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const privateHost =
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "::1";

    return url.protocol === "https:" && !privateHost ? url : null;
  } catch {
    return null;
  }
}

async function probePublicWidget(appUrl: URL | null, publicKey: string | null) {
  if (!appUrl || !publicKey) {
    return {
      status: "warning" as const,
      detail: "Configura una URL HTTPS publica y una public_key antes de probar el widget externo.",
    };
  }

  const target = new URL("/api/widget/config", appUrl);
  target.searchParams.set("key", publicKey);
  const startedAt = Date.now();

  try {
    const response = await fetch(target, {
      cache: "no-store",
      headers: { "user-agent": "LumenAI-System-Health/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        status: "critical" as const,
        detail: `El endpoint publico respondio HTTP ${response.status} en ${durationMs} ms.`,
      };
    }

    return {
      status: "ready" as const,
      detail: `Widget publico verificado desde servidor en ${durationMs} ms.`,
    };
  } catch {
    return {
      status: "critical" as const,
      detail: "El endpoint publico del widget no respondio dentro de 8 segundos.",
    };
  }
}

async function diagnoseSystem(
  ctx: Awaited<ReturnType<typeof requireLumeniteBusiness>>,
  activeProbe: boolean,
) {
  const appUrl = publicAppUrl();
  const [widget, operatorSchema, releaseState, kb, snapshots, actionRuns] = await Promise.all([
    ctx.admin
      .from("widget_settings")
      .select("business_id,public_key,widget_enabled,published_at,whatsapp,email")
      .eq("business_id", ctx.businessId)
      .maybeSingle(),
    ctx.admin
      .from("widget_settings")
      .select("operator_id")
      .eq("business_id", ctx.businessId)
      .limit(1),
    ctx.admin.rpc("lumenai_release_state"),
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
  const publicKey = String(widgetRow?.public_key || ctx.business.public_key || "").trim() || null;
  const externalProbe = activeProbe
    ? await probePublicWidget(appUrl, publicKey)
    : {
        status: appUrl && publicKey ? ("warning" as const) : ("critical" as const),
        detail:
          appUrl && publicKey
            ? "Pulsa Ejecutar diagnostico para probar el widget desde la URL publica."
            : "Falta una URL HTTPS publica o la public_key del widget.",
      };
  const env = AGENTS.map((agent) => ({
    agent,
    ...getLumenitePublicStatus(agent),
  }));
  const schemaReady = !operatorSchema.error && !releaseState.error;

  const checks: HealthCheck[] = [
    {
      key: "auth",
      label: "Sesion autenticada",
      status: "ready",
      detail: "Usuario autenticado y negocio activo resuelto.",
      category: "workspace",
    },
    {
      key: "business",
      label: "Negocio activo",
      status: status(Boolean(ctx.businessId)),
      detail: ctx.business.name || "Negocio LumenAI",
      category: "workspace",
      action: { href: "/panel/access", label: "Abrir Access" },
    },
    {
      key: "database_release",
      label: "RLS e indices de produccion",
      status: status(schemaReady),
      detail: schemaReady
        ? "La base confirma el marcador de seguridad 20260824071640 y el catalogo de operadores."
        : "Las migraciones finales de RLS, indices y operadores aun no estan validadas en esta base.",
      category: "release",
      action: { href: "/panel/access?view=security", label: "Revisar migraciones" },
    },
    {
      key: "widget",
      label: "Widget configurado",
      status: status(!widget.error && Boolean(publicKey), true),
      detail: widget.error
        ? "No se pudo leer la configuracion del widget."
        : widgetRow?.widget_enabled
          ? "Widget activo y con clave publica."
          : "Widget pendiente o apagado.",
      category: "workspace",
      action: { href: "/panel/widget", label: "Configurar widget" },
    },
    {
      key: "widget_external",
      label: "Widget en sitio externo",
      status: externalProbe.status,
      detail: externalProbe.detail,
      category: "release",
      action: { href: "/panel/widget", label: "Abrir instalacion" },
    },
    {
      key: "knowledge",
      label: "Knowledge publicado",
      status: kb.error ? "critical" : status(publishedKb > 0, true),
      detail: kb.error
        ? "No se pudo validar Knowledge."
        : `${publishedKb} item(s) publicados de ${kbRows.length}.`,
      category: "workspace",
      action: { href: "/panel/knowledge", label: "Abrir Knowledge" },
    },
    {
      key: "snapshots",
      label: "Snapshots Config AI",
      status: snapshots.error
        ? "critical"
        : status(Array.isArray(snapshots.data) && snapshots.data.length > 0, true),
      detail: snapshots.error
        ? "No se pudo validar el historial de configuracion."
        : `${Array.isArray(snapshots.data) ? snapshots.data.length : 0} snapshot(s) recientes.`,
      category: "intelligence",
      action: { href: "/panel/autoconfig", label: "Abrir Config IA" },
    },
    {
      key: "action_runs",
      label: "Action runs",
      status: actionRuns.error ? "critical" : "ready",
      detail: actionRuns.error
        ? "No se pudo validar la auditoria de acciones."
        : `${Array.isArray(actionRuns.data) ? actionRuns.data.length : 0} accion(es) recientes.`,
      category: "intelligence",
      action: { href: "/panel/radar?view=actions", label: "Abrir acciones" },
    },
    {
      key: "deployment",
      label: "URL publica de produccion",
      status: status(Boolean(appUrl)),
      detail: appUrl
        ? `Destino publico configurado: ${appUrl.origin}`
        : "NEXT_PUBLIC_APP_URL debe apuntar a una URL HTTPS publica.",
      category: "release",
    },
    {
      key: "billing",
      label: "Pagos y suscripciones reales",
      status: "critical",
      detail: "La pagina de planes esta lista visualmente, pero falta elegir y conectar el proveedor de cobro real.",
      category: "release",
      action: { href: "/subscriptions", label: "Revisar planes" },
    },
    ...env.map((item): HealthCheck => ({
      key: `env_${item.agent}`,
      label: `IA ${item.agent}`,
      status: status(item.configured, item.agent !== "widget"),
      detail: item.configured
        ? item.usingFallbackKey
          ? `Activa con fallback controlado (${item.env}).`
          : `Variable dedicada activa (${item.env}).`
        : `Falta ${item.env}.`,
      category: "intelligence",
      action: { href: "/panel/autoconfig", label: "Configurar IA" },
    })),
  ];
  const critical = checks.filter((check) => check.status === "critical").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  const ready = checks.filter((check) => check.status === "ready").length;
  const score = Math.round((ready / Math.max(checks.length, 1)) * 100);
  const nextCheck = checks.find((check) => check.status === "critical") ||
    checks.find((check) => check.status === "warning") ||
    null;

  return {
    ok: true,
    health: critical ? "critical" : warnings ? "warning" : "ready",
    checks,
    env,
    summary: { total: checks.length, ready, warnings, critical },
    release: {
      score,
      readyForPreview: checks.every(
        (check) => check.status !== "critical" || check.key === "billing",
      ),
      readyForProduction: critical === 0 && warnings === 0,
      checkedAt: new Date().toISOString(),
      activeProbe,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      publicUrl: appUrl?.origin || null,
      nextAction: nextCheck
        ? {
            key: nextCheck.key,
            title: nextCheck.label,
            detail: nextCheck.detail,
            href: nextCheck.action?.href || "/panel/access?view=security",
            label: nextCheck.action?.label || "Revisar",
          }
        : null,
    },
  };
}

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    return NextResponse.json(await diagnoseSystem(ctx, false));
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo diagnosticar sistema.") },
      { status: safeErrorStatus(error) },
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
      payload: { activeProbe: true },
      result: { checkedAt: new Date().toISOString() },
      status: "success",
    });

    return NextResponse.json(await diagnoseSystem(ctx, true));
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo ejecutar diagnostico.") },
      { status: safeErrorStatus(error) },
    );
  }
}
