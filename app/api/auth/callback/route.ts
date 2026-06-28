import type { NextRequest } from "next/server";
import { handleSupabaseAuthRedirect } from "@/lib/auth/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleSupabaseAuthRedirect(req);
}
