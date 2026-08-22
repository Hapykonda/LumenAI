import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function sbServer(res: NextResponse) {
  const cookieStore = await cookies();
  const env = getSupabaseBrowserEnv();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

export function sbAdmin() {
  const env = getSupabaseServerEnv();
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function jsonWithCookies(
  resWithCookies: NextResponse,
  body: unknown,
  init?: { status?: number },
) {
  const out = NextResponse.json(body, { status: init?.status ?? 200 });
  resWithCookies.cookies.getAll().forEach((cookie) => {
    out.cookies.set(cookie.name, cookie.value, cookie);
  });
  return out;
}

export async function requireUserAndBusinessId() {
  const context = await getAuthorizedBusinessContext({
    requiredPermission: "business:read",
  });
  return {
    userId: context.userId,
    businessId: context.businessId,
    admin: context.admin,
  };
}
