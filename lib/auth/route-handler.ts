import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseBrowserEnv } from "@/lib/env";

const OTP_TYPES = ["email", "magiclink", "signup", "recovery", "invite"] as const;

type OtpType = (typeof OTP_TYPES)[number];

export function safeAuthNextPath(next: string | null) {
  if (!next) return "/panel";
  if (!next.startsWith("/")) return "/panel";
  if (next.startsWith("//")) return "/panel";
  return next;
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function resolveOtpTypes(rawType: string | null): OtpType[] {
  const normalized = String(rawType ?? "").trim().toLowerCase();
  const preferred = OTP_TYPES.includes(normalized as OtpType)
    ? [normalized as OtpType]
    : [];

  return uniq([...preferred, ...OTP_TYPES]);
}

export function normalizeAuthFailure(error: unknown, fallback = "auth_failed") {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const value = raw.toLowerCase();

  if (
    value.includes("expired") ||
    value.includes("otp_expired") ||
    value.includes("token has expired")
  ) {
    return "auth_link_expired";
  }

  if (
    value.includes("invalid token") ||
    value.includes("invalid otp") ||
    value.includes("invalid login") ||
    value.includes("token not found")
  ) {
    return "auth_invalid_code";
  }

  if (
    value.includes("redirect") ||
    value.includes("not allowed") ||
    value.includes("unauthorized")
  ) {
    return "auth_redirect_not_allowed";
  }

  if (value.includes("rate limit") || value.includes("too many")) {
    return "auth_rate_limited";
  }

  if (value.includes("email not confirmed")) {
    return "auth_email_not_confirmed";
  }

  return fallback;
}

export function redirectToLogin(origin: string, error: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

export function createAuthRouteClient(req: NextRequest, res: NextResponse) {
  const env = getSupabaseBrowserEnv();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function handleSupabaseAuthRedirect(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const next = safeAuthNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const upstreamError =
    url.searchParams.get("error_description") || url.searchParams.get("error");

  if (upstreamError) {
    return redirectToLogin(origin, normalizeAuthFailure(upstreamError));
  }

  const success = NextResponse.redirect(new URL(next, origin));
  const supabase = createAuthRouteClient(req, success);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectToLogin(origin, normalizeAuthFailure(error, "auth_exchange_failed"));
    return success;
  }

  if (tokenHash) {
    let lastError: unknown = null;

    for (const otpType of resolveOtpTypes(type)) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as EmailOtpType,
      });

      if (!error) return success;
      lastError = error;
    }

    return redirectToLogin(origin, normalizeAuthFailure(lastError, "auth_verify_failed"));
  }

  return redirectToLogin(origin, "auth_missing_params");
}
