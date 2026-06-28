import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

type CookiePair = { name: string; value: string };

function parseCookieHeader(cookieHeader: string | null): CookiePair[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return { name: decodeURIComponent(part), value: "" };
      return {
        name: decodeURIComponent(part.slice(0, idx)),
        value: decodeURIComponent(part.slice(idx + 1)),
      };
    });
}

async function getAllCookiesSafe(): Promise<CookiePair[]> {
  const cs: any = await Promise.resolve(cookies() as any);

  if (cs && typeof cs.getAll === "function") {
    return cs.getAll().map((c: any) => ({ name: c.name, value: c.value }));
  }

  const h: any = await Promise.resolve(headers() as any);
  const cookieHeader = (h.get?.("cookie") ?? h.get?.("Cookie")) || null;
  return parseCookieHeader(cookieHeader);
}

export async function sbServer(res: NextResponse) {
  const cookiePairs = await getAllCookiesSafe();
  const env = getSupabaseBrowserEnv();

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookiePairs;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

async function resolveBusinessId(admin: any, userId: string) {
  const { data: p } = await admin
    .from("profiles")
    .select("business_id")
    .eq("id", userId)
    .maybeSingle();
  if (p?.business_id) return String(p.business_id);

  const { data: b } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (b?.id) return String(b.id);

  return null;
}

export async function requireUserAndBusinessId(supabaseAuth: any) {
  const { data } = await supabaseAuth.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error("not_authenticated");

  const env = getSupabaseServerEnv();
  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const businessId = await resolveBusinessId(admin, user.id);
  if (!businessId) throw new Error("no_business");

  return { user, businessId, admin };
}

export function jsonWithCookies(res: NextResponse, body: any, init?: ResponseInit) {
  const out = NextResponse.json(body, init);

  // Copia cookies seteadas en res → out
  try {
    const all = (res.cookies as any).getAll?.() ?? [];
    for (const c of all) out.cookies.set(c.name, c.value, c);
  } catch {}

  return out;
}
