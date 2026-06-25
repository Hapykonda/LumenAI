import { supabase } from "@/lib/supabase/client";

type ActiveBusinessResult = {
  user: any | null;
  businessId: string | null;
  business: any | null;
  error?: string | null;
};

function cleanId(value: unknown) {
  const id = String(value ?? "").trim();
  return id || null;
}

function isUuid(value: string | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function readBusinessById(id: string | null) {
  if (!id || !isUuid(id)) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return data;
}

function readStoredBusinessId() {
  if (typeof window === "undefined") return null;

  const keys = [
    "lmn_active_business_id",
    "active_business_id",
    "business_id",
    "panel_business_id",
    "lumen_business_id",
  ];

  for (const key of keys) {
    const value = cleanId(window.localStorage.getItem(key));

    if (isUuid(value)) {
      return value;
    }
  }

  return null;
}

function storeBusinessId(id: string | null) {
  if (typeof window === "undefined") return;
  if (!id || !isUuid(id)) return;

  window.localStorage.setItem("lmn_active_business_id", id);
  window.localStorage.setItem("business_id", id);
}

function pickBusinessIdFromProfile(profile: any) {
  if (!profile || typeof profile !== "object") return null;

  const keys = [
    "business_id",
    "active_business_id",
    "current_business_id",
    "selected_business_id",
    "default_business_id",
  ];

  for (const key of keys) {
    const value = cleanId(profile[key]);

    if (isUuid(value)) {
      return value;
    }
  }

  return null;
}

async function readProfile(userId: string) {
  const attempts = [
    { table: "profiles", column: "id" },
    { table: "profiles", column: "user_id" },
    { table: "profiles", column: "owner_id" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from(attempt.table)
      .select("*")
      .eq(attempt.column, userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  }

  return null;
}

async function readOwnedBusiness(userId: string) {
  const attempts = [
    "owner_id",
    "user_id",
    "created_by",
    "profile_id",
  ];

  for (const column of attempts) {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq(column, userId)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) {
      return data;
    }
  }

  return null;
}

async function readFirstBusinessFallback() {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;

  return data;
}

export async function getActiveBusinessIdClient(): Promise<ActiveBusinessResult> {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  let user = sessionData.session?.user ?? null;

  if (!user) {
    const { data: userData } = await supabase.auth.getUser();
    user = userData.user ?? null;
  }

  if (!user) {
    return {
      user: null,
      businessId: null,
      business: null,
      error: sessionError?.message ?? "No hay sesión activa.",
    };
  }

  const storedBusinessId = readStoredBusinessId();
  const storedBusiness = await readBusinessById(storedBusinessId);

  if (storedBusiness?.id) {
    storeBusinessId(storedBusiness.id);

    return {
      user,
      businessId: storedBusiness.id,
      business: storedBusiness,
      error: null,
    };
  }

  const profile = await readProfile(user.id);
  const profileBusinessId = pickBusinessIdFromProfile(profile);
  const profileBusiness = await readBusinessById(profileBusinessId);

  if (profileBusiness?.id) {
    storeBusinessId(profileBusiness.id);

    return {
      user,
      businessId: profileBusiness.id,
      business: profileBusiness,
      error: null,
    };
  }

  const ownedBusiness = await readOwnedBusiness(user.id);

  if (ownedBusiness?.id) {
    storeBusinessId(ownedBusiness.id);

    return {
      user,
      businessId: ownedBusiness.id,
      business: ownedBusiness,
      error: null,
    };
  }

  const fallbackBusiness = await readFirstBusinessFallback();

  if (fallbackBusiness?.id) {
    storeBusinessId(fallbackBusiness.id);

    return {
      user,
      businessId: fallbackBusiness.id,
      business: fallbackBusiness,
      error: null,
    };
  }

  return {
    user,
    businessId: null,
    business: null,
    error:
      "No se encontró ningún negocio asociado al usuario actual. Crea un negocio desde onboarding o revisa la tabla businesses/profiles.",
  };
}

export default getActiveBusinessIdClient;