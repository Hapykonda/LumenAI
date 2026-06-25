import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  // ✅ En tu Next, cookies() es async (Promise)
  const cookieStore = await (cookies() as any);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
