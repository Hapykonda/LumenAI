import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureShape } from "@/app/panel/calibration/defaults";
import {
  BusinessAuthorizationError,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";
import { getSupabaseServerEnv } from "@/lib/env";

export function jsonError(message: string, status = 400, detail?: string) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      detail: detail ?? null,
    },
    { status }
  );
}

export function adminClient() {
  const env = getSupabaseServerEnv();

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireUserBusiness() {
  try {
    const context = await getAuthorizedBusinessContext({
      requiredPermission: "business:read",
    });

    return {
      error: null,
      admin: context.admin,
      user: context.user,
      business: context.activeBusiness,
      authorization: context,
    };
  } catch (error) {
    const status = error instanceof BusinessAuthorizationError ? error.status : 500;
    const code = error instanceof BusinessAuthorizationError ? error.code : "AUTHORIZATION_FAILED";
    const message = error instanceof Error ? error.message : "No se pudo autorizar la operacion.";
    return {
      error: NextResponse.json({ ok: false, error: message, code }, { status }),
      admin: null,
      user: null,
      business: null,
      authorization: null,
    };
  }
}

function hasPublishedSettings(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0,
  );
}

export async function getOrCreateCalibrationRow(input: {
  admin: ReturnType<typeof adminClient>;
  businessId: string;
  publicKey: string | null;
}) {
  const { admin, businessId, publicKey } = input;

  const { data: existing, error: readError } = await admin
    .from("widget_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    const draft = ensureShape(existing.draft_settings);
    const published = hasPublishedSettings(existing.published_settings)
      ? ensureShape(existing.published_settings)
      : null;

    return {
      row: existing,
      draft,
      published,
    };
  }

  const now = new Date().toISOString();
  const draft = ensureShape(null);

  const { data: created, error: insertError } = await admin
    .from("widget_settings")
    .insert({
      business_id: businessId,
      public_key: publicKey,
      widget_enabled: draft.widget.widgetEnabled,
      greeting: draft.widget.greeting,
      assistant_name: draft.calibration.identity.assistantName,
      position: "br",
      primary_color: draft.widget.theme.primaryColor,
      gradient_from: draft.widget.theme.gradientFrom,
      gradient_to: draft.widget.theme.gradientTo,
      font_family: draft.widget.theme.fontFamily,
      whatsapp: draft.widget.whatsapp || null,
      email: draft.widget.email || null,
      draft_settings: draft,
      published_settings: {},
      draft_updated_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    row: created,
    draft,
    published: null,
  };
}
