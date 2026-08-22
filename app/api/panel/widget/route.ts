/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import {
  BusinessAuthorizationError,
  businessAuthorizationErrorResponse,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Position = "br" | "bl" | "tr" | "tl";

const POSITIONS: Position[] = ["br", "bl", "tr", "tl"];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeImageUrl(value: unknown) {
  const raw = clean(value);
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw.slice(0, 1200);

  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString().slice(0, 1200)
      : "";
  } catch {
    return "";
  }
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
  const calibration = isObj((base as any).calibration) ? { ...(base as any).calibration } : {};
  const identity = isObj((calibration as any).identity) ? { ...(calibration as any).identity } : {};
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

  if (payload.assistant_name !== undefined) {
    const value = clean(payload.assistant_name) || "LumenAI";
    widget.assistantName = value;
    identity.assistantName = value;
  }

  if (payload.greeting !== undefined) {
    widget.greeting = clean(payload.greeting);
  }

  if (payload.tone !== undefined) {
    widget.tone = clean(payload.tone) || "neutral";
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
  calibration.identity = identity;

  return {
    ...base,
    calibration,
    widget,
  };
}

export async function GET(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:read",
    });
    const admin = context.admin;
    const business = context.activeBusiness;

    const settings = await readSettings(admin, business.id);

    return NextResponse.json({
      ok: true,
      ...normalizeWidgetPayload(business, settings),
    });
  } catch (error: any) {
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "widget_get_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await getAuthorizedBusinessContext({
      request: req,
      requiredPermission: "resources:write",
    });
    const admin = context.admin;
    const business = context.activeBusiness;

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

    if (body?.assistantName !== undefined || body?.assistant_name !== undefined) {
      payload.assistant_name = clean(body?.assistantName ?? body?.assistant_name) || "LumenAI";
    }

    if (body?.greeting !== undefined) {
      payload.greeting = clean(body.greeting);
    }

    if (body?.tone !== undefined) {
      payload.tone = clean(body.tone) || "neutral";
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
      const raw = clean(body?.avatarUrl ?? body?.avatar_url);
      const value = normalizeImageUrl(raw);
      if (raw && !value) {
        return NextResponse.json(
          { ok: false, error: "La URL del avatar no es valida." },
          { status: 400 }
        );
      }
      payload.avatar_url = value || null;
      publishedPatch.avatarUrl = value;
    }

    if (body?.brandLogoUrl !== undefined || body?.logoUrl !== undefined || body?.logo_url !== undefined) {
      const raw = clean(body?.brandLogoUrl ?? body?.logoUrl ?? body?.logo_url);
      const value = normalizeImageUrl(raw);
      if (raw && !value) {
        return NextResponse.json(
          { ok: false, error: "La URL del logo no es valida." },
          { status: 400 }
        );
      }
      payload.logo_url = value || null;
      publishedPatch.brandLogoUrl = value;
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
    if (error instanceof BusinessAuthorizationError) {
      return businessAuthorizationErrorResponse(error);
    }
    return NextResponse.json(
      { ok: false, error: error?.message || "widget_patch_error" },
      { status: 500 }
    );
  }
}
