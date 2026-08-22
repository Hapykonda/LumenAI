/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Biz = {
  id: string;
  name: string | null;
  public_key: string | null;
};

type WidgetSettingsRow = {
  business_id: string;
  public_key?: string | null;

  widget_enabled?: boolean | null;
  greeting?: string | null;
  assistant_name?: string | null;
  tone?: string | null;
  position?: string | null;
  primary_color?: string | null;
  gradient_from?: string | null;
  gradient_to?: string | null;
  font_family?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  business_hours?: any;

  draft_settings?: any;
  published_settings?: any;
  draft_updated_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function admin() {
  const env = getSupabaseServerEnv();

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isObj(v: unknown) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function cleanString(value: unknown, fallback = "") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function normalizeHex(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;

  return /^#([0-9a-fA-F]{6})$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function normalizePosition(pos: unknown) {
  const p = String(pos ?? "br").toLowerCase();

  if (p === "bl" || p === "tr" || p === "tl" || p === "br") return p;

  if (p === "left") return "bl";
  if (p === "right") return "br";

  return "br";
}

function normalizeFontFamily(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  }

  if (!raw.includes("system-ui")) {
    return `${raw}, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  }

  return raw;
}

function normalizeHours(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    return value.trim() || null;
  }

  try {
    const text = JSON.stringify(value);
    return text.length > 2 ? text : null;
  } catch {
    return null;
  }
}

async function resolveBusiness(sb: ReturnType<typeof admin>, key: string): Promise<Biz | null> {
  const { data: byPublicKey, error: publicKeyError } = await sb
    .from("businesses")
    .select("id,name,public_key")
    .eq("public_key", key)
    .limit(1)
    .maybeSingle();

  if (publicKeyError) throw new Error(publicKeyError.message);
  if (byPublicKey) return byPublicKey as Biz;

  const { data: byWidgetKey, error: widgetKeyError } = await sb
    .from("widget_settings")
    .select("business_id,public_key")
    .eq("public_key", key)
    .limit(1)
    .maybeSingle();

  if (widgetKeyError) throw new Error(widgetKeyError.message);

  if (byWidgetKey?.business_id) {
    const { data: byWidgetBusiness, error: widgetBusinessError } = await sb
      .from("businesses")
      .select("id,name,public_key")
      .eq("id", byWidgetKey.business_id)
      .limit(1)
      .maybeSingle();

    if (widgetBusinessError) throw new Error(widgetBusinessError.message);
    if (byWidgetBusiness) return byWidgetBusiness as Biz;
  }

  return null;
}

async function getSettings(sb: ReturnType<typeof admin>, businessId: string) {
  const { data, error } = await sb
    .from("widget_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as WidgetSettingsRow | null) ?? null;
}

function pickSettingsSource(settings: WidgetSettingsRow | null, preview: boolean) {
  if (!settings) return null;

  const draft = isObj(settings.draft_settings) ? settings.draft_settings : null;
  const published = isObj(settings.published_settings) ? settings.published_settings : null;

  if (preview && draft) return draft;
  if (published) return published;
  if (draft) return draft;

  return null;
}

function normalizeConfig(input: {
  business: Biz;
  settings: WidgetSettingsRow | null;
  source: any;
  preview: boolean;
}) {
  const { business, settings, source, preview } = input;

  const calibration = isObj(source?.calibration) ? source.calibration : {};
  const identity = isObj(calibration?.identity) ? calibration.identity : {};
  const personality = isObj(calibration?.personality) ? calibration.personality : {};
  const sales = isObj(calibration?.sales) ? calibration.sales : {};
  const guardrails = isObj(calibration?.guardrails) ? calibration.guardrails : {};
  const lexicon = isObj(calibration?.lexicon) ? calibration.lexicon : {};

  const widget = isObj(source?.widget) ? source.widget : {};
  const brand = isObj(widget?.brand) ? widget.brand : {};
  const publishedWidget = isObj(settings?.published_settings?.widget)
    ? settings?.published_settings.widget
    : {};
  const publishedBrand = isObj(publishedWidget?.brand) ? publishedWidget.brand : {};
  const widgetTheme = isObj(widget?.theme) ? widget.theme : {};

  const businessName =
    cleanString(identity?.brandName) ||
    cleanString(business.name) ||
    "Tu negocio";

  const assistantName =
    cleanString(identity?.assistantName) ||
    cleanString(settings?.assistant_name) ||
    "LumenAI";

  const widgetEnabled =
    typeof widget?.widgetEnabled === "boolean"
      ? widget.widgetEnabled
      : typeof settings?.widget_enabled === "boolean"
      ? settings.widget_enabled
      : true;

  const greeting =
    cleanString(widget?.greeting) ||
    cleanString(settings?.greeting) ||
    "Hola 👋 Soy {assistant}. ¿En qué puedo ayudarte?";

  const primaryColor = normalizeHex(
    widgetTheme?.primaryColor ?? settings?.primary_color,
    "#00E5FF"
  );

  const gradientFrom = normalizeHex(
    widgetTheme?.gradientFrom ?? settings?.gradient_from,
    primaryColor
  );

  const gradientTo = normalizeHex(
    widgetTheme?.gradientTo ?? settings?.gradient_to,
    "#6C3BFF"
  );

  const fontFamily = normalizeFontFamily(
    widgetTheme?.fontFamily ?? settings?.font_family
  );

  const quickActions =
    Array.isArray(widget?.quickActions) && widget.quickActions.length
      ? widget.quickActions.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [
          "Quiero cotizar",
          "¿Qué servicios ofrecen?",
          "Horarios de atención",
          "Hablar con un humano",
        ];

  const whatsapp = cleanString(widget?.whatsapp) || cleanString(settings?.whatsapp) || null;
  const email = cleanString(widget?.email) || cleanString(settings?.email) || null;
  const avatarUrl =
    cleanString(brand?.avatarUrl) ||
    cleanString(widget?.avatarUrl) ||
    cleanString(publishedBrand?.avatarUrl) ||
    cleanString(publishedWidget?.avatarUrl) ||
    cleanString((settings as any)?.avatar_url) ||
    null;
  const brandLogoUrl =
    cleanString(brand?.logoUrl) ||
    cleanString(widget?.brandLogoUrl) ||
    cleanString(publishedBrand?.logoUrl) ||
    cleanString(publishedWidget?.brandLogoUrl) ||
    cleanString((settings as any)?.logo_url) ||
    null;

  const position = normalizePosition(widget?.position ?? settings?.position ?? "br");

  const theme = {
    primaryColor,
    gradientFrom,
    gradientTo,
    fontFamily,

    primary: primaryColor,
    secondary: gradientTo,

    material: cleanString(widgetTheme?.material, "dark"),
    launcherType: cleanString(widgetTheme?.launcherType, "orb"),
    launcherText: cleanString(widgetTheme?.launcherText, "¿En qué te ayudo?"),
    showBranding:
      typeof widgetTheme?.showBranding === "boolean" ? widgetTheme.showBranding : true,

    surfaceOpacity:
      typeof widgetTheme?.surfaceOpacity === "number" ? widgetTheme.surfaceOpacity : 0.14,
    blurStrength:
      typeof widgetTheme?.blurStrength === "number" ? widgetTheme.blurStrength : 18,
    glowStrength:
      typeof widgetTheme?.glowStrength === "number" ? widgetTheme.glowStrength : 0.55,
    radius:
      typeof widgetTheme?.radius === "number" ? widgetTheme.radius : 18,
  };

  const hours = normalizeHours(settings?.business_hours ?? guardrails?.hours ?? null);

  return {
    ok: true,

    source: preview ? "draft" : "published",

    businessName,
    publicKey: business.public_key,
    widgetEnabled,
    greeting,
    assistantName,
    tone: cleanString(settings?.tone, "neutral"),
    position,
    theme,
    quickActions,

    calibration: {
      identity,
      personality,
      sales,
      guardrails,
      lexicon,
      brandBrief: isObj(calibration?.brandBrief) ? calibration.brandBrief : {},
    },

    brand_name: businessName,
    hours,
    whatsapp,
    email,
    avatarUrl,
    brandLogoUrl,
    allowedParentOrigin:
      cleanString(widget?.allowedParentOrigin) ||
      cleanString((settings as any)?.allowed_parent_origin) ||
      null,

    business_name: businessName,
    widget_enabled: widgetEnabled,
    assistant_name: assistantName,

    primary_color: primaryColor,
    gradient_from: gradientFrom,
    gradient_to: gradientTo,
    font_family: fontFamily,
    avatar_url: avatarUrl,
    logo_url: brandLogoUrl,

    business_hours: settings?.business_hours ?? {},

    meta: {
      draftUpdatedAt: settings?.draft_updated_at ?? null,
      publishedAt: settings?.published_at ?? null,
      updatedAt: settings?.updated_at ?? null,
    },
  };
}

export async function GET(req: Request) {
  const headers = corsHeaders();

  try {
    const sb = admin();
    const { searchParams } = new URL(req.url);

    const debug = searchParams.get("debug") === "1";
    const preview = searchParams.get("preview") === "1";
    const key = String(searchParams.get("key") ?? "").trim();

    if (debug) {
      return NextResponse.json(
        {
          ok: true,
          received_key: key || null,
          preview,
          accepted_key: "businesses.public_key or widget_settings.public_key",
          rejected_key: "businesses.id is not accepted by the public widget API",
        },
        { headers }
      );
    }

    if (!key) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Key invalida o no encontrada. Usa la public_key del negocio o del widget.",
        },
        { status: 400, headers }
      );
    }

    const business = await resolveBusiness(sb, key);

    if (!business) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Key invalida o no encontrada. Usa la public_key del negocio o del widget.",
        },
        { status: 404, headers }
      );
    }

    const settings = await getSettings(sb, business.id);
    const source = pickSettingsSource(settings, preview);

    const normalized = normalizeConfig({
      business,
      settings,
      source,
      preview,
    });

    return NextResponse.json(normalized, { headers });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Error en /api/widget/config",
      },
      { status: 500, headers }
    );
  }
}
