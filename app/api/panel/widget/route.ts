/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Position = "br" | "bl" | "tr" | "tl";

const POSITIONS: Position[] = ["br", "bl", "tr", "tl"];

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearer(req: Request) {
  const raw = req.headers.get("authorization") || "";
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isObj(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizePosition(value: unknown): Position {
  const v = clean(value).toLowerCase() as Position;
  return POSITIONS.includes(v) ? v : "br";
}

function normalizeHex(value: unknown, fallback: string) {
  const raw = clean(value);
  if (!raw) return fallback;

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

async function getUser(req: Request, admin: ReturnType<typeof supabaseAdmin>) {
  const token = getBearer(req);
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
}

function pickBusinessIdFromProfile(profile: any) {
  if (!profile || typeof profile !== "object") return null;

  const keys = [
    "active_business_id",
    "business_id",
    "current_business_id",
    "selected_business_id",
    "default_business_id",
  ];

  for (const key of keys) {
    const value = clean(profile[key]);
    if (value) return value;
  }

  return null;
}

async function readProfile(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const attempts = [
    { table: "profiles", column: "id" },
    { table: "profiles", column: "user_id" },
    { table: "profiles", column: "owner_id" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await admin
      .from(attempt.table)
      .select("*")
      .eq(attempt.column, userId)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}

async function readOwnedBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const attempts = ["owner_id", "user_id", "created_by", "profile_id"];

  for (const column of attempts) {
    const { data, error } = await admin
      .from("businesses")
      .select("id,name,public_key")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  return null;
}

async function resolveBusiness(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const profile = await readProfile(admin, userId);
  const profileBusinessId = pickBusinessIdFromProfile(profile);

  if (profileBusinessId) {
    const { data, error } = await admin
      .from("businesses")
      .select("id,name,public_key")
      .eq("id", profileBusinessId)
      .maybeSingle();

    if (!error && data?.id) return data;
  }

  const owned = await readOwnedBusiness(admin, userId);
  if (owned?.id) return owned;

  return null;
}

async function readSettings(admin: ReturnType<typeof supabaseAdmin>, businessId: string) {
  const { data, error } = await admin
    .from("widget_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ?? null;
}

function getSource(settings: any) {
  if (isObj(settings?.published_settings)) return settings.published_settings;
  if (isObj(settings?.draft_settings)) return settings.draft_settings;
  return {};
}

function normalizeWidgetPayload(business: any, settings: any) {
  const source = getSource(settings);
  const widget = isObj((source as any)?.widget) ? (source as any).widget : {};
  const brand = isObj((widget as any)?.brand) ? (widget as any).brand : {};
  const theme = isObj((widget as any)?.theme) ? (widget as any).theme : {};

  const enabled =
    typeof (widget as any)?.widgetEnabled === "boolean"
      ? (widget as any).widgetEnabled
      : typeof settings?.widget_enabled === "boolean"
      ? settings.widget_enabled
      : true;

  const position = normalizePosition((widget as any)?.position ?? settings?.position ?? "br");

  const primaryColor = normalizeHex(
    (theme as any)?.primaryColor ?? settings?.primary_color,
    "#2F7CFF"
  );

  const gradientFrom = normalizeHex(
    (theme as any)?.gradientFrom ?? settings?.gradient_from,
    primaryColor
  );

  const gradientTo = normalizeHex(
    (theme as any)?.gradientTo ?? settings?.gradient_to,
    "#8A63FF"
  );

  return {
    business: {
      id: business.id,
      name: business.name ?? "Tu negocio",
      public_key: business.public_key ?? null,
      install_key: business.public_key ?? business.id,
    },
    widget: {
      enabled,
      position,
      assistantName:
        clean((source as any)?.calibration?.identity?.assistantName) ||
        clean(settings?.assistant_name) ||
        "LumenAI",
      greeting:
        clean((widget as any)?.greeting) ||
        clean(settings?.greeting) ||
        "Hola 👋 Soy {assistant}. ¿En qué puedo ayudarte?",
      whatsapp: clean((widget as any)?.whatsapp) || clean(settings?.whatsapp) || "",
      email: clean((widget as any)?.email) || clean(settings?.email) || "",
      avatarUrl:
        clean((brand as any)?.avatarUrl) ||
        clean((widget as any)?.avatarUrl) ||
        clean((settings as any)?.avatar_url) ||
        "",
      brandLogoUrl:
        clean((brand as any)?.logoUrl) ||
        clean((widget as any)?.brandLogoUrl) ||
        clean((settings as any)?.logo_url) ||
        "",
      primaryColor,
      gradientFrom,
      gradientTo,
      updatedAt: settings?.updated_at ?? null,
      publishedAt: settings?.published_at ?? null,
    },
  };
}

function buildNextPublishedSettings(current: any, payload: Record<string, any>) {
  const base = isObj(current) ? { ...current } : {};
  const widget = isObj((base as any).widget) ? { ...(base as any).widget } : {};
  const theme = isObj((widget as any).theme) ? { ...(widget as any).theme } : {};
  const brand = isObj((widget as any).brand) ? { ...(widget as any).brand } : {};

  if (payload.widget_enabled !== undefined) {
    widget.widgetEnabled = payload.widget_enabled;
  }

  if (payload.position !== undefined) {
    widget.position = payload.position;
  }

  if (payload.whatsapp !== undefined) {
    widget.whatsapp = payload.whatsapp;
  }

  if (payload.email !== undefined) {
    widget.email = payload.email;
  }

  if (payload.primary_color !== undefined) {
    theme.primaryColor = payload.primary_color;
    theme.gradientFrom = payload.gradient_from ?? payload.primary_color;
  }

  if (payload.gradient_from !== undefined) {
    theme.gradientFrom = payload.gradient_from;
  }

  if (payload.gradient_to !== undefined) {
    theme.gradientTo = payload.gradient_to;
  }

  if (payload.font_family !== undefined) {
    theme.fontFamily = payload.font_family;
  }

  if (payload.launcher_text !== undefined) {
    theme.launcherText = payload.launcher_text;
  }

  if (payload.allowed_parent_origin !== undefined) {
    widget.allowedParentOrigin = payload.allowed_parent_origin;
  }

  if (payload.avatarUrl !== undefined) {
    const value = clean(payload.avatarUrl);
    widget.avatarUrl = value;
    brand.avatarUrl = value;
  }

  if (payload.brandLogoUrl !== undefined) {
    const value = clean(payload.brandLogoUrl);
    widget.brandLogoUrl = value;
    brand.logoUrl = value;
  }

  widget.theme = theme;
  widget.brand = brand;

  return {
    ...base,
    widget,
  };
}

export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const business = await resolveBusiness(admin, user.id);

    if (!business?.id) {
      return NextResponse.json({ ok: false, error: "missing_business" }, { status: 403 });
    }

    const settings = await readSettings(admin, business.id);

    return NextResponse.json({
      ok: true,
      ...normalizeWidgetPayload(business, settings),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "widget_get_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = supabaseAdmin();
    const user = await getUser(req, admin);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const business = await resolveBusiness(admin, user.id);

    if (!business?.id) {
      return NextResponse.json({ ok: false, error: "missing_business" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const current = await readSettings(admin, business.id);

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      public_key: business.public_key ?? business.id,
    };
    const publishedPatch: Record<string, any> = {};

    if (body?.widgetEnabled !== undefined || body?.widget_enabled !== undefined) {
      payload.widget_enabled = Boolean(body?.widgetEnabled ?? body?.widget_enabled);
    }

    if (body?.position !== undefined) {
      payload.position = normalizePosition(body.position);
    }

    if (body?.whatsapp !== undefined) {
      payload.whatsapp = clean(body.whatsapp) || null;
    }

    if (body?.email !== undefined) {
      payload.email = clean(body.email) || null;
    }

    if (body?.primaryColor !== undefined || body?.primary_color !== undefined) {
      payload.primary_color = normalizeHex(body?.primaryColor ?? body?.primary_color, "#2F7CFF");
      payload.gradient_from = payload.primary_color;
    }

    if (body?.gradientFrom !== undefined || body?.gradient_from !== undefined) {
      payload.gradient_from = normalizeHex(body?.gradientFrom ?? body?.gradient_from, "#2F7CFF");
    }

    if (body?.gradientTo !== undefined || body?.gradient_to !== undefined) {
      payload.gradient_to = normalizeHex(body?.gradientTo ?? body?.gradient_to, "#8A63FF");
    }

    if (body?.fontFamily !== undefined || body?.font_family !== undefined) {
      payload.font_family = clean(body?.fontFamily ?? body?.font_family) || null;
    }

    if (body?.timeZone !== undefined || body?.time_zone !== undefined) {
      payload.time_zone = clean(body?.timeZone ?? body?.time_zone) || "America/Santiago";
    }

    if (body?.launcherText !== undefined || body?.launcher_text !== undefined) {
      publishedPatch.launcher_text =
        clean(body?.launcherText ?? body?.launcher_text) || "¿En qué te ayudo?";
    }

    if (body?.allowedParentOrigin !== undefined || body?.allowed_parent_origin !== undefined) {
      payload.allowed_parent_origin = clean(
        body?.allowedParentOrigin ?? body?.allowed_parent_origin
      ) || null;
    }

    if (body?.avatarUrl !== undefined || body?.avatar_url !== undefined) {
      publishedPatch.avatarUrl = clean(body?.avatarUrl ?? body?.avatar_url);
    }

    if (body?.brandLogoUrl !== undefined || body?.logoUrl !== undefined || body?.logo_url !== undefined) {
      publishedPatch.brandLogoUrl = clean(body?.brandLogoUrl ?? body?.logoUrl ?? body?.logo_url);
    }

    payload.published_settings = buildNextPublishedSettings(
      current?.published_settings,
      {
        ...payload,
        ...publishedPatch,
      }
    );

    if (!current?.published_at) {
      payload.published_at = new Date().toISOString();
    }

    let result;

    if (current?.business_id) {
      const { data, error } = await admin
        .from("widget_settings")
        .update(payload)
        .eq("business_id", business.id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await admin
        .from("widget_settings")
        .insert({
          business_id: business.id,
          ...payload,
        })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    return NextResponse.json({
      ok: true,
      ...normalizeWidgetPayload(business, result),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "widget_patch_error" },
      { status: 500 }
    );
  }
}
