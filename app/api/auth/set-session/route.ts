import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseBrowserEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // 1) Leer body
  const body = await req.json().catch(() => null);

  const access_token = body?.access_token;
  const refresh_token = body?.refresh_token;

  if (typeof access_token !== "string" || typeof refresh_token !== "string") {
    return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
  }

  // 2) Cookies del request (Next 15/16: usa await)
  const cookieStore = await cookies();

  // 3) Capturar cookies que Supabase quiera setear (sin escribir aún en response)
  const pendingCookies: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  const env = getSupabaseBrowserEnv();

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Guardamos para aplicarlas SOLO si setSession resulta OK
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  // 4) Setear sesión
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // 5) Responder OK y ahora sí escribir cookies
  const response = NextResponse.json({ ok: true });

  for (const c of pendingCookies) {
    response.cookies.set(c.name, c.value, c.options);
  }

  return response;
}
