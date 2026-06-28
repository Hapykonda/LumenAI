import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseBrowserEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  const body = await request.json().catch(() => ({}));
  const access_token = body?.access_token;
  const refresh_token = body?.refresh_token;

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const env = getSupabaseBrowserEnv();

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
