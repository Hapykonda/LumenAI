import { NextResponse } from "next/server";
import { getGroqStatus } from "@/lib/ai/groq";
import { buildLumeniteBusinessSnapshot } from "@/lib/ai/lumenite/business-snapshot";
import { requireLumeniteBusiness } from "@/lib/ai/lumenite/permissions";
import { safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function GET() {
  try {
    const ctx = await requireLumeniteBusiness();
    const [snapshot, scenarios, reports, actions] = await Promise.all([
      buildLumeniteBusinessSnapshot({
        admin: ctx.admin,
        businessId: ctx.businessId,
        businessName: ctx.business.name,
        publicKey: ctx.business.public_key,
      }),
      ctx.admin
        .from("lumenai_business_scenarios")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(40),
      ctx.admin
        .from("lumenai_simulation_reports")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(40),
      ctx.admin
        .from("lumenai_decision_actions")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const safeScenarios = list<Record<string, unknown>>(scenarios.data);
    const safeReports = list<Record<string, unknown>>(reports.data);

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("calibration"),
      business: snapshot.business,
      context: {
        stats: snapshot.stats,
        missingData: snapshot.missingData,
        productsDetected: snapshot.knowledge.filter((item) =>
          ["services", "pricing"].includes(String(item.type ?? ""))
        ).length,
      },
      confidence: Math.max(
        35,
        Math.min(92, 100 - snapshot.missingData.length * 12 + snapshot.stats.hotLeads * 3)
      ),
      scenarios: safeScenarios,
      reports: safeReports,
      actions: list<Record<string, unknown>>(actions.data),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo cargar Business Twin.") },
      { status: safeErrorStatus(error) }
    );
  }
}
