import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type BusinessRow = Record<string, unknown> & { id: string };

type ActiveBusinessResult = {
  user: User | null;
  businessId: string | null;
  business: BusinessRow | null;
  error?: string | null;
};

function cleanId(value: unknown) {
  const id = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

function storeBusinessId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("lmn_active_business_id", id);
}

export async function getActiveBusinessIdClient(): Promise<ActiveBusinessResult> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth.user;

  if (authError || !user) {
    return {
      user: null,
      businessId: null,
      business: null,
      error: authError?.message ?? "No hay una sesion activa.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_business_id,business_id")
    .eq("id", user.id)
    .maybeSingle();

  const businessId = cleanId(profile?.active_business_id || profile?.business_id);
  if (profileError || !businessId) {
    return {
      user,
      businessId: null,
      business: null,
      error: "Selecciona un negocio antes de continuar.",
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("lumenai_business_members")
    .select("id,status")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership?.id || membership.status !== "active") {
    return {
      user,
      businessId: null,
      business: null,
      error: "No tienes una membresia activa para el negocio seleccionado.",
    };
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business?.id) {
    return {
      user,
      businessId: null,
      business: null,
      error: "El negocio seleccionado ya no esta disponible.",
    };
  }

  storeBusinessId(businessId);
  return {
    user,
    businessId,
    business: business as BusinessRow,
    error: null,
  };
}

export default getActiveBusinessIdClient;
