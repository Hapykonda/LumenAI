import { NextResponse } from "next/server";
import { safeErrorCode, safeErrorMessage, safeErrorStatus } from "@/lib/ai/lumenite/errors";
import { recordRequiredAudit } from "@/lib/ai/lumenite/audit";
import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import {
  checkGoogleGmailHealth,
  decryptGoogleCredentialPayload,
  GOOGLE_GMAIL_PROVIDER,
  revokeGoogleToken,
} from "@/lib/integrations/google-gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown, fallback: string) {
  return NextResponse.json(
    { ok: false, error: safeErrorMessage(error, fallback), code: safeErrorCode(error, "INTEGRATION_OPERATION_FAILED") },
    { status: safeErrorStatus(error) },
  );
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthorizedBusinessContext({ request: req, requiredPermission: "resources:write" });
    const integration = await ctx.admin
      .from("lumenai_integrations")
      .select("id")
      .eq("business_id", ctx.businessId)
      .eq("provider", GOOGLE_GMAIL_PROVIDER)
      .maybeSingle();
    if (integration.error || !integration.data?.id) return NextResponse.json({ ok: false, error: "Gmail no esta conectado." }, { status: 409 });
    const health = await checkGoogleGmailHealth({
      admin: ctx.admin,
      businessId: ctx.businessId,
      integrationId: String(integration.data.id),
    });
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "integration.google_gmail.health_checked",
      targetTable: "lumenai_integrations",
      targetId: String(integration.data.id),
      metadata: { healthy: true, checkedAt: health.checkedAt },
    });
    return NextResponse.json({ ok: true, health });
  } catch (error) {
    return failure(error, "No se pudo comprobar Gmail.");
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getAuthorizedBusinessContext({ request: req, requiredPermission: "permissions:manage" });
    const integration = await ctx.admin
      .from("lumenai_integrations")
      .select("id,status")
      .eq("business_id", ctx.businessId)
      .eq("provider", GOOGLE_GMAIL_PROVIDER)
      .maybeSingle();
    if (integration.error || !integration.data?.id) return NextResponse.json({ ok: true, disconnected: true, deduplicated: true });
    const integrationId = String(integration.data.id);
    const secret = await ctx.admin
      .from("lumenai_integration_credentials")
      .select("encrypted_payload")
      .eq("business_id", ctx.businessId)
      .eq("integration_id", integrationId)
      .maybeSingle();
    let revocation = { revoked: false, status: 0 };
    if (secret.data?.encrypted_payload) {
      try {
        const credentials = decryptGoogleCredentialPayload(String(secret.data.encrypted_payload));
        revocation = await revokeGoogleToken(credentials.refreshToken || credentials.accessToken);
      } catch {
        revocation = { revoked: false, status: 0 };
      }
    }
    const now = new Date().toISOString();
    const [deleted, updated] = await Promise.all([
      ctx.admin.from("lumenai_integration_credentials").delete().eq("business_id", ctx.businessId).eq("integration_id", integrationId),
      ctx.admin.from("lumenai_integrations").update({
        status: "revoked",
        credentials_ref: null,
        token_expires_at: null,
        disconnected_at: now,
        revoked_at: now,
        updated_by: ctx.userId,
        last_error_code: revocation.revoked ? null : "GOOGLE_REVOCATION_UNCONFIRMED",
        last_error_message: revocation.revoked ? null : "La credencial local fue eliminada; Google no confirmo la revocacion.",
      }).eq("id", integrationId).eq("business_id", ctx.businessId),
    ]);
    if (deleted.error || updated.error) throw new Error("INTEGRATION_DISCONNECT_FAILED");
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "integration.google_gmail.disconnected",
      targetTable: "lumenai_integrations",
      targetId: integrationId,
      metadata: { providerRevocationConfirmed: revocation.revoked, providerStatus: revocation.status },
    });
    return NextResponse.json({ ok: true, disconnected: true, providerRevocationConfirmed: revocation.revoked });
  } catch (error) {
    return failure(error, "No se pudo desconectar Gmail.");
  }
}
