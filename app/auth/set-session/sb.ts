import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import { getSupabaseBrowserEnv } from "@/lib/env";

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

export async function requireUserAndBusinessId() {
  const context = await getAuthorizedBusinessContext({
    requiredPermission: "business:read",
  });
  return {
    user: context.user,
    businessId: context.businessId,
    admin: context.admin,
  };
}

export function jsonWithCookies(
  res: NextResponse,
  body: unknown,
  init?: ResponseInit,
) {
  const out = NextResponse.json(body, init);
  for (const cookie of res.cookies.getAll()) {
    out.cookies.set(cookie.name, cookie.value, cookie);
  }
  return out;
}
