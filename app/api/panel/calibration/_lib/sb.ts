// app/api/panel/calibration/_lib/sb.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Auth client (usa cookies del usuario)
 */
export async function sbServer(res: NextResponse) {
  const cookieStore = await Promise.resolve(cookies() as any);
  const env = getSupabaseBrowserEnv();

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Admin client (service role) — SOLO en server
 */
export function sbAdmin() {
  const env = getSupabaseServerEnv();

  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Copia cookies del response “interno” al JSON final */
export function jsonWithCookies(
  resWithCookies: NextResponse,
  body: any,
  init?: { status?: number }
) {
  const out = NextResponse.json(body, { status: init?.status ?? 200 });
  resWithCookies.cookies.getAll().forEach((c: any) => out.cookies.set(c.name, c.value, c));
  return out;
}

async function tryGetProfileBusinessId(admin: ReturnType<typeof sbAdmin>, userId: string) {
  try {
    const { data, error } = await admin
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.business_id ?? null;
  } catch {
    return null;
  }
}

async function tryGetOwnerBusinessId(admin: ReturnType<typeof sbAdmin>, userId: string) {
  try {
    const { data, error } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.id ?? null;
  } catch {
    return null;
  }
}

async function tryGetMemberBusinessId(admin: ReturnType<typeof sbAdmin>, userId: string) {
  const adminAny = admin as any;

  const tables: Array<{ table: string; col: string }> = [
    { table: "business_members", col: "user_id" },
    { table: "business_users", col: "user_id" },
    { table: "business_memberships", col: "user_id" },
    { table: "business_members", col: "profile_id" },
  ];

  for (const t of tables) {
    try {
      const { data, error } = await adminAny
        .from(t.table)
        .select("business_id")
        .eq(t.col, userId)
        .limit(1)
        .maybeSingle();

      if (!error && data?.business_id) return String(data.business_id);
    } catch {
      // tabla no existe o esquema distinto -> ignorar
    }
  }

  return null;
}

async function hasAccessToBusiness(
  admin: ReturnType<typeof sbAdmin>,
  userId: string,
  businessId: string,
  profileBizId?: string | null
) {
  try {
    const { data: b, error } = await admin
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .maybeSingle();

    if (error || !b?.id) return false;
    if ((b as any).owner_id === userId) return true;
    if (profileBizId && profileBizId === businessId) return true;

    // membership tables
    const member = await tryGetMemberBusinessId(admin, userId);
    if (member && member === businessId) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * ✅ Resuelve businessId de forma robusta:
 * - user metadata
 * - profiles.business_id
 * - businesses.owner_id
 * - tablas de membresía
 */
export async function requireUserAndBusinessId(
  supabaseAuth: Awaited<ReturnType<typeof sbServer>>
) {
  const { data: auth, error: authErr } = await supabaseAuth.auth.getUser();
  if (authErr || !auth?.user) throw new Error("No autenticado.");

  const admin = sbAdmin();
  const userId = auth.user.id;

  const meta: any = auth.user.user_metadata ?? {};
  const appMeta: any = auth.user.app_metadata ?? {};

  const candidates: string[] = [];
  const metaBiz =
    meta.business_id ?? meta.businessId ?? meta.business ?? appMeta.business_id ?? appMeta.businessId ?? null;
  if (metaBiz) candidates.push(String(metaBiz));

  const profileBizId = await tryGetProfileBusinessId(admin, userId);
  if (profileBizId) candidates.push(String(profileBizId));

  const ownerBizId = await tryGetOwnerBusinessId(admin, userId);
  if (ownerBizId) candidates.push(String(ownerBizId));

  const memberBizId = await tryGetMemberBusinessId(admin, userId);
  if (memberBizId) candidates.push(String(memberBizId));

  // toma el primer candidato válido al que tenga acceso
  for (const bid of candidates) {
    const ok = await hasAccessToBusiness(admin, userId, bid, profileBizId);
    if (ok) return { userId, businessId: bid, admin };
  }

  throw new Error("No se encontró business para este usuario.");
}
