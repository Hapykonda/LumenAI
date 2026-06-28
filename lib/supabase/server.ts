import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseBrowserEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  // ✅ En tu Next, cookies() es async (Promise)
  const cookieStore = await (cookies() as any);
  const env = getSupabaseBrowserEnv();

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          // ya no revienta: ahora cookieStore NO es Promise
          return cookieStore.getAll?.() ?? [];
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set?.(name, value, options);
            });
          } catch {
            // Next a veces no deja setear cookies en algunos contextos
          }
        },
      },
    }
  );
}
