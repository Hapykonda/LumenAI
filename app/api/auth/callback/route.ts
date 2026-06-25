import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;

  const next = url.searchParams.get("next") || "/panel";

  // formatos posibles
  const code = url.searchParams.get("code"); // PKCE
  const token_hash = url.searchParams.get("token_hash"); // magiclink
  const type = url.searchParams.get("type"); // magiclink | signup | recovery | email

  // respuesta final
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

  // 1) PKCE flow (lo más común)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=callback_exchange`);
    return res;
  }

  // 2) token_hash flow (a veces Supabase lo manda así)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (error) return NextResponse.redirect(`${origin}/login?error=callback_verifyotp`);
    return res;
  }

  // si no viene nada útil:
  return NextResponse.redirect(`${origin}/login?error=missing_params`);
}