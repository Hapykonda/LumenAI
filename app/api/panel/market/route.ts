import { NextResponse } from "next/server";
import { jsonError, requireUserBusiness } from "../calibration/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 500) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function safeUrl(value: unknown) {
  const text = clean(value, 700);
  if (!text) return "";

  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const businessId = ctx.business.id as string;

    try {
      const [feedsResult, itemsResult] = await Promise.all([
        ctx.admin
          .from("market_feeds")
          .select("id,name,url,type,enabled,created_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(20),
        ctx.admin
          .from("market_items")
          .select("id,feed_id,title,url,summary,source,published_at,created_at")
          .eq("business_id", businessId)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

      return NextResponse.json({
        ok: true,
        feeds: feedsResult.data ?? [],
        items: itemsResult.data ?? [],
        empty:
          !feedsResult.data?.length && !itemsResult.data?.length
            ? "Conecta fuentes de mercado para que Lumenite detecte senales relevantes."
            : null,
      });
    } catch {
      return NextResponse.json({
        ok: true,
        feeds: [],
        items: [],
        empty:
          "Radar persistente requiere ejecutar la migracion de market_feeds y market_items.",
      });
    }
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "No se pudo cargar mercado",
      500
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireUserBusiness();

    if (ctx.error || !ctx.admin || !ctx.business) {
      return ctx.error || jsonError("No autorizado", 401);
    }

    const body = await req.json().catch(() => null);
    const name = clean(body?.name, 120);
    const url = safeUrl(body?.url);
    const type = clean(body?.type, 30) || "rss";

    if (!name || !url) {
      return jsonError("Agrega nombre y URL valida para la fuente de mercado.", 400);
    }

    const { data, error } = await ctx.admin
      .from("market_feeds")
      .insert({
        business_id: ctx.business.id,
        name,
        url,
        type,
        enabled: body?.enabled === undefined ? true : Boolean(body.enabled),
      })
      .select("id,name,url,type,enabled,created_at")
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, feed: data });
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "No se pudo guardar fuente",
      500
    );
  }
}
