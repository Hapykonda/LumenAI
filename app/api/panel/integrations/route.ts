import { NextResponse } from "next/server";
import { getAuthorizedBusinessContext, businessAuthorizationErrorResponse } from "@/lib/auth/business-context";
import { GOOGLE_GMAIL_PROVIDER, googleOAuthConfiguration } from "@/lib/integrations/google-gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthorizedBusinessContext({ request: req, requiredPermission: "business:read" });
    const [{ data: integration, error: integrationError }, { data: drafts, error: draftsError }] = await Promise.all([
      ctx.admin
        .from("lumenai_integrations")
        .select("id,provider,status,connection_mode,scopes,account_email,connected_at,token_expires_at,last_health_check_at,last_sync_at,last_error_code,last_error_message,disconnected_at,revoked_at,updated_at")
        .eq("business_id", ctx.businessId)
        .eq("provider", GOOGLE_GMAIL_PROVIDER)
        .maybeSingle(),
      ctx.admin
        .from("lumenai_external_drafts")
        .select("id,integration_id,action_run_id,recipient,subject,status,external_id,external_url,error_code,error_message,prepared_at,created_at")
        .eq("business_id", ctx.businessId)
        .eq("provider", GOOGLE_GMAIL_PROVIDER)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    if (integrationError || draftsError) throw new Error("INTEGRATION_READ_FAILED");
    return NextResponse.json({
      ok: true,
      provider: GOOGLE_GMAIL_PROVIDER,
      configured: googleOAuthConfiguration(new URL(req.url).origin).configured,
      connection: integration ?? null,
      drafts: drafts ?? [],
      capabilities: {
        createDraft: true,
        sendEmail: false,
        approvalRequired: true,
        scope: "gmail.compose",
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return businessAuthorizationErrorResponse(error);
  }
}
