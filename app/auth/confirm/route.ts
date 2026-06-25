 import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeNextPath(next: string | null) {
  if (!next) return "/panel";
  if (!next.startsWith("/")) return "/panel";
  return next;
}

function parseCookieHeader(cookieHeader: string | null) {
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

export async function GET(req: Request) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const typeRaw = (url.searchParams.get("type") || "").trim();
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = url.origin;

  const response = NextResponse.redirect(new URL(next, origin));

  // ✅ cookies() puede ser sync o async en Next 16 → unwrap seguro
  const cookieStore: any = await Promise.resolve(cookies() as any);

  // fallback si por tipos raros no existe getAll:
  const fallbackCookies = async () => {
    const h: any = await Promise.resolve(headers() as any);
    const cookieHeader = (h.get?.("cookie") ?? h.get?.("Cookie")) || null;
    return parseCookieHeader(cookieHeader);
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (cookieStore?.getAll) return cookieStore.getAll();
          return fallbackCookies() as any;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ PKCE / OAuth
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const eUrl = new URL("/login", origin);
      eUrl.searchParams.set("e", error.message);
      return NextResponse.redirect(eUrl);
    }
    return response;
  }

  // ✅ Magic link / token_hash
  if (token_hash) {
    const typesToTry = typeRaw
      ? [typeRaw]
      : ["magiclink", "email", "signup", "recovery"];

    for (const t of typesToTry) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: t as any,
      });
      if (!error) return response;
    }

    const eUrl = new URL("/login", origin);
    eUrl.searchParams.set("e", "verifyOtp_failed");
    return NextResponse.redirect(eUrl);
  }

  const eUrl = new URL("/login", origin);
  eUrl.searchParams.set("e", "missing_code_or_token_hash");
  return NextResponse.redirect(eUrl);
}