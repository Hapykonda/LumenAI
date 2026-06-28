import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import OnboardingClient from "./OnboardingClient";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function resolveBusinessId(admin: any, userId: string) {
  // 1) profiles.business_id
  const { data: p } = await admin
    .from("profiles")
    .select("business_id")
    .eq("id", userId)
    .maybeSingle();
  if (p?.business_id) return String(p.business_id);

  // 2) businesses.owner_id
  const { data: b } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (b?.id) return String(b.id);

  return null;
}

export default async function OnboardingPage() {
  // ✅ Next 16: cookies() async
  const cookieStore = await cookies();
  const browserEnv = getSupabaseBrowserEnv();

  const supabase = createServerClient(
    browserEnv.url,
    browserEnv.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) redirect("/login");

  const serverEnv = getSupabaseServerEnv();
  const admin = createClient(serverEnv.url, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const businessId = await resolveBusinessId(admin, user.id);

  // ✅ Si YA tiene business, NO mostramos onboarding
  if (businessId) redirect("/panel");

  // ✅ Si NO tiene business, mostramos el formulario
  return <OnboardingClient email={user.email ?? ""} />;
}
