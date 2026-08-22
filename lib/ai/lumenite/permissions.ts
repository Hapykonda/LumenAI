import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import { LumeniteSafeError } from "./errors";

export async function requireLumeniteBusiness(request?: Request) {
  const ctx = await getAuthorizedBusinessContext({ request, requiredPermission: "business:read" });

  return {
    admin: ctx.admin,
    user: ctx.user,
    business: ctx.activeBusiness,
    businessId: ctx.businessId,
    userId: ctx.userId,
    role: ctx.role,
    membershipId: ctx.membershipId,
    permissions: ctx.permissions,
  };
}

export async function requireLumeniteActionContext(request?: Request) {
  const ctx = await requireLumeniteBusiness(request);
  if (!ctx.permissions.includes("resources:write")) {
    throw new LumeniteSafeError("No tienes permiso para ejecutar acciones.", 403);
  }
  return ctx;
}
