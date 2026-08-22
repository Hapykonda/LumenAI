import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseBrowserEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BusinessAuthorizationCode =
  | "UNAUTHENTICATED"
  | "BUSINESS_NOT_SELECTED"
  | "MEMBERSHIP_REQUIRED"
  | "BUSINESS_MISMATCH"
  | "PERMISSION_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "MEMBERSHIP_INACTIVE";

export type BusinessRole = "owner" | "admin" | "manager" | "member" | "viewer";

export type BusinessPermission =
  | "business:read"
  | "business:write"
  | "resources:read"
  | "resources:write"
  | "permissions:manage";

type ActiveBusiness = {
  id: string;
  name: string;
  public_key: string | null;
  owner_id: string | null;
  user_id: string | null;
  created_by: string | null;
  is_active: boolean;
};

type Membership = {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  status: "active" | "invited" | "suspended" | "revoked";
};

export type AuthorizedBusinessContext = {
  userId: string;
  businessId: string;
  membershipId: string;
  role: BusinessRole;
  permissions: BusinessPermission[];
  activeBusiness: ActiveBusiness;
  user: User;
  authenticatedSupabaseClient: SupabaseClient;
  admin: ReturnType<typeof supabaseAdmin>;
};

export class BusinessAuthorizationError extends Error {
  readonly code: BusinessAuthorizationCode;
  readonly status: number;

  constructor(code: BusinessAuthorizationCode, message: string, status: number) {
    super(message);
    this.name = "BusinessAuthorizationError";
    this.code = code;
    this.status = status;
  }
}

const ROLE_PERMISSIONS: Record<BusinessRole, BusinessPermission[]> = {
  owner: [
    "business:read",
    "business:write",
    "resources:read",
    "resources:write",
    "permissions:manage",
  ],
  admin: [
    "business:read",
    "business:write",
    "resources:read",
    "resources:write",
    "permissions:manage",
  ],
  manager: ["business:read", "business:write", "resources:read", "resources:write"],
  member: ["business:read", "resources:read", "resources:write"],
  viewer: ["business:read", "resources:read"],
};

function cleanId(value: unknown) {
  return String(value ?? "").trim();
}

function bearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

function isBusinessRole(value: unknown): value is BusinessRole {
  return ["owner", "admin", "manager", "member", "viewer"].includes(String(value));
}

export function permissionsForBusinessRole(role: BusinessRole) {
  return [...ROLE_PERMISSIONS[role]];
}

export function businessRoleHasPermission(
  role: BusinessRole,
  permission: BusinessPermission,
) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

async function authenticatedClient(request?: Request) {
  const token = bearerToken(request);

  if (!token) {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      throw new BusinessAuthorizationError(
        "UNAUTHENTICATED",
        "La sesion no es valida o ha expirado.",
        401,
      );
    }
    return { client, user: data.user };
  }

  const env = getSupabaseBrowserEnv();
  const client = createClient(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new BusinessAuthorizationError(
      "UNAUTHENTICATED",
      "La sesion no es valida o ha expirado.",
      401,
    );
  }
  return { client, user: data.user };
}

export async function getAuthorizedBusinessContext(input?: {
  request?: Request;
  requestedBusinessId?: unknown;
  requiredPermission?: BusinessPermission;
}): Promise<AuthorizedBusinessContext> {
  const auth = await authenticatedClient(input?.request);
  const admin = supabaseAdmin();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,active_business_id,business_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new BusinessAuthorizationError(
      "BUSINESS_NOT_SELECTED",
      "Selecciona un negocio antes de continuar.",
      403,
    );
  }

  // `business_id` is retained only as an explicit legacy selection while
  // profiles migrate to `active_business_id`. It never grants access.
  const businessId = cleanId(profile.active_business_id || profile.business_id);
  if (!businessId) {
    throw new BusinessAuthorizationError(
      "BUSINESS_NOT_SELECTED",
      "Selecciona un negocio antes de continuar.",
      403,
    );
  }

  const requestedBusinessId = cleanId(input?.requestedBusinessId);
  if (requestedBusinessId && requestedBusinessId !== businessId) {
    throw new BusinessAuthorizationError(
      "BUSINESS_MISMATCH",
      "El recurso solicitado no pertenece al negocio activo.",
      409,
    );
  }

  const [{ data: business, error: businessError }, { data: membership, error: membershipError }] =
    await Promise.all([
      admin
        .from("businesses")
        .select("id,name,public_key,owner_id,user_id,created_by,is_active")
        .eq("id", businessId)
        .maybeSingle(),
      admin
        .from("lumenai_business_members")
        .select("id,business_id,user_id,role,status")
        .eq("business_id", businessId)
        .eq("user_id", auth.user.id)
        .maybeSingle(),
    ]);

  if (businessError || !business?.id) {
    throw new BusinessAuthorizationError(
      "RESOURCE_NOT_FOUND",
      "El negocio activo ya no esta disponible.",
      404,
    );
  }

  if (membershipError || !membership?.id) {
    throw new BusinessAuthorizationError(
      "MEMBERSHIP_REQUIRED",
      "No existe una membresia para el negocio activo.",
      403,
    );
  }

  const typedMembership = membership as Membership;
  if (typedMembership.status !== "active" || business.is_active === false) {
    throw new BusinessAuthorizationError(
      "MEMBERSHIP_INACTIVE",
      "La membresia o el negocio no estan activos.",
      403,
    );
  }

  if (!isBusinessRole(typedMembership.role)) {
    throw new BusinessAuthorizationError(
      "PERMISSION_DENIED",
      "El rol de la membresia no esta autorizado.",
      403,
    );
  }

  const permissions = permissionsForBusinessRole(typedMembership.role);
  if (
    input?.requiredPermission &&
    !permissions.includes(input.requiredPermission)
  ) {
    throw new BusinessAuthorizationError(
      "PERMISSION_DENIED",
      "No tienes permiso para realizar esta operacion.",
      403,
    );
  }

  return {
    userId: auth.user.id,
    businessId,
    membershipId: typedMembership.id,
    role: typedMembership.role,
    permissions,
    activeBusiness: business as ActiveBusiness,
    user: auth.user,
    authenticatedSupabaseClient: auth.client,
    admin,
  };
}

export function businessAuthorizationErrorResponse(error: unknown) {
  if (error instanceof BusinessAuthorizationError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: false, error: "No se pudo autorizar la operacion." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

