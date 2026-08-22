import { redirect } from "next/navigation";
import {
  BusinessAuthorizationError,
  getAuthorizedBusinessContext,
} from "@/lib/auth/business-context";

export async function requireBusiness() {
  try {
    const context = await getAuthorizedBusinessContext({
      requiredPermission: "business:read",
    });
    return { user: context.user, businessId: context.businessId, context };
  } catch (error) {
    if (
      error instanceof BusinessAuthorizationError &&
      error.code === "UNAUTHENTICATED"
    ) {
      redirect("/login");
    }
    redirect("/onboarding");
  }
}

export default requireBusiness;
