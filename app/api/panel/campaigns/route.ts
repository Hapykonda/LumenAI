import { NextResponse } from "next/server";
import { getGroqStatus } from "@/lib/ai/groq";
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
    const [campaigns, assets, tasks, experiments] = await Promise.all([
      ctx.admin
        .from("lumenai_campaigns")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(60),
      ctx.admin
        .from("lumenai_campaign_assets")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(160),
      ctx.admin
        .from("lumenai_campaign_tasks")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(120),
      ctx.admin
        .from("lumenai_campaign_experiments")
        .select("*")
        .eq("business_id", ctx.businessId)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);
    const safeCampaigns = list<Record<string, unknown>>(campaigns.data);
    const safeAssets = list<Record<string, unknown>>(assets.data);
    const safeTasks = list<Record<string, unknown>>(tasks.data);
    const safeExperiments = list<Record<string, unknown>>(experiments.data);

    return NextResponse.json({
      ok: true,
      ai: getGroqStatus("campaigns"),
      summary: {
        campaigns: safeCampaigns.length,
        active: safeCampaigns.filter((item) => item.status === "active").length,
        assets: safeAssets.length,
        pendingTasks: safeTasks.filter((item) => item.status === "pending").length,
        experiments: safeExperiments.length,
      },
      campaigns: safeCampaigns,
      assets: safeAssets,
      tasks: safeTasks,
      experiments: safeExperiments,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, "No se pudo cargar Campaign Studio.") },
      { status: safeErrorStatus(error) }
    );
  }
}
