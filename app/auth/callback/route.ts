import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;

  const next = url.searchParams.get("next") || "/panel";
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // a veces viene vacío

  const res = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // ✅ OAuth / PKCE (?code=...)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
    return res;
  }

  // ✅ Magic link / confirm (?token_hash=...&type=...)
  if (token_hash) {
    const tryTypes = type ? [type] : ["magiclink", "email", "signup", "recovery"];

    for (const t of tryTypes) {
      const { error } = await supabase.auth.verifyOtp({
        type: t as any,
        token_hash,
      });
      if (!error) return res;
    }

    return NextResponse.redirect(`${origin}/login?error=verifyotp_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=missing_callback_params`);
}