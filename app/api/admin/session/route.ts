import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
  isAdminAccessConfigured,
  matchesAdminAccessCode,
} from "@/lib/auth/admin-session";

export async function POST(request: NextRequest) {
  if (!isAdminAccessConfigured()) {
    return NextResponse.redirect(new URL("/admin?error=not_configured", request.url), 303);
  }

  const formData = await request.formData();
  const accessCode = String(formData.get("accessCode") ?? "").trim();
  if (!(await matchesAdminAccessCode(accessCode))) {
    return NextResponse.redirect(new URL("/admin?error=invalid_code", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSession(), adminSessionCookieOptions);
  return response;
}
