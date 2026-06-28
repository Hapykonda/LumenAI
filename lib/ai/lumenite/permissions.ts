import { requireUserBusiness } from "@/app/api/panel/calibration/_lib";
import { LumeniteSafeError } from "./errors";

export async function requireLumeniteBusiness() {
  const ctx = await requireUserBusiness();

  if (ctx.error || !ctx.admin || !ctx.user || !ctx.business?.id) {
    throw new LumeniteSafeError("No autorizado", ctx.error ? 401 : 403);
  }

  return {
    admin: ctx.admin,
    user: ctx.user,
    business: ctx.business,
    businessId: ctx.business.id as string,
    userId: ctx.user.id,
  };
}
