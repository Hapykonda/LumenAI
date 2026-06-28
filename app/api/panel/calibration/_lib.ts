import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureShape } from "@/app/panel/calibration/defaults";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

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

async function userFromCookies() {
  const env = getSupabaseBrowserEnv();

  const cookieStore = await cookies();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // En estas rutas no necesitamos escribir cookies.
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) return null;

  return data.user;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
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

async function readProfile(admin: ReturnType<typeof adminClient>, userId: string) {
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

async function readBusinessByOwner(admin: ReturnType<typeof adminClient>, userId: string) {
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

async function resolveBusiness(admin: ReturnType<typeof adminClient>, userId: string) {
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

  const owned = await readBusinessByOwner(admin, userId);
  if (owned?.id) return owned;

  return null;
}

export async function requireUserBusiness() {
  const user = await userFromCookies();

  if (!user) {
    return {
      error: jsonError("No autorizado", 401),
      admin: null,
      user: null,
      business: null,
    };
  }

  const admin = adminClient();
  const business = await resolveBusiness(admin, user.id);

  if (!business?.id) {
    return {
      error: jsonError("No hay negocio activo", 403),
      admin,
      user,
      business: null,
    };
  }

  return {
    error: null,
    admin,
    user,
    business,
  };
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
    const published = existing.published_settings
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
      published_settings: null,
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
