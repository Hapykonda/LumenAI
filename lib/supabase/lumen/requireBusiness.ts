import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

async function resolveBusinessId(userId: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

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

export async function requireBusiness() {
  // ✅ Next 16.1.1: cookies() devuelve Promise → SIEMPRE await
  const cookieStore = await cookies();

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op en Server Components
        },
      },
    }
  );

  const { data } = await sb.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/login");

  const businessId = await resolveBusinessId(user.id);
  if (!businessId) redirect("/onboarding");

  return { user, businessId };
}

export default requireBusiness;