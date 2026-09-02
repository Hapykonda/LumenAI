import { NextResponse } from "next/server";
import { cleanString } from "@/lib/ai/lumenite/core";
import { recordRequiredAudit } from "@/lib/ai/lumenite/audit";
import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import {
  checkGoogleGmailHealth,
  exchangeGoogleAuthorizationCode,
  GOOGLE_GMAIL_PROVIDER,
  GOOGLE_GMAIL_SCOPE,
  revokeGoogleToken,
} from "@/lib/integrations/google-gmail";
import { decryptIntegrationSecret, encryptIntegrationSecret, sha256Hex } from "@/lib/integrations/secret-crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function integrationRedirect(req: Request, values: Record<string, string>) {
  const url = new URL("/panel/interface?view=connections", new URL(req.url).origin);
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  let issuedToken = "";
  let integrationId = "";
  let authorizedBusinessId = "";
  try {
    const url = new URL(req.url);
    const state = cleanString(url.searchParams.get("state"), 500);
    const code = cleanString(url.searchParams.get("code"), 2000);
    const upstreamError = cleanString(url.searchParams.get("error"), 160);
    if (upstreamError) return integrationRedirect(req, { error: `google_${upstreamError}` });
    if (!state || !code) return integrationRedirect(req, { error: "oauth_missing_response" });

    const ctx = await getAuthorizedBusinessContext({ request: req, requiredPermission: "permissions:manage" });
    authorizedBusinessId = ctx.businessId;
    const transaction = await ctx.admin
      .from("lumenai_oauth_transactions")
      .select("id,business_id,user_id,encrypted_code_verifier,expires_at,consumed_at")
      .eq("state_hash", sha256Hex(state))
      .eq("provider", GOOGLE_GMAIL_PROVIDER)
      .maybeSingle();
    if (
      transaction.error ||
      !transaction.data?.id ||
      transaction.data.business_id !== ctx.businessId ||
      transaction.data.user_id !== ctx.userId ||
      transaction.data.consumed_at ||
      Date.parse(String(transaction.data.expires_at)) <= Date.now()
    ) {
      return integrationRedirect(req, { error: "oauth_state_invalid" });
    }
    const consumed = await ctx.admin
      .from("lumenai_oauth_transactions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", transaction.data.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (consumed.error || !consumed.data?.id) return integrationRedirect(req, { error: "oauth_state_reused" });
    const secret = decryptIntegrationSecret<{ verifier: string }>(String(transaction.data.encrypted_code_verifier));
    const credentials = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: secret.verifier,
      origin: url.origin,
    });
    issuedToken = credentials.refreshToken || credentials.accessToken;
    const scopes = credentials.scope.split(/\s+/).filter(Boolean);
    if (!scopes.includes(GOOGLE_GMAIL_SCOPE)) {
      await revokeGoogleToken(issuedToken);
      issuedToken = "";
      return integrationRedirect(req, { error: "gmail_scope_missing" });
    }

    const integration = await ctx.admin.from("lumenai_integrations").upsert({
      business_id: ctx.businessId,
      provider: GOOGLE_GMAIL_PROVIDER,
      status: "connecting",
      connection_mode: "prepare_only",
      scopes,
      token_expires_at: credentials.expiresAt,
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      revoked_at: null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      config: { mode: "prepare_only", sendsEmail: false, approvalRequired: true },
      last_error_code: null,
      last_error_message: null,
    }, { onConflict: "business_id,provider" }).select("id").single();
    if (integration.error || !integration.data?.id) throw new Error("INTEGRATION_SAVE_FAILED");
    integrationId = String(integration.data.id);
    const stored = await ctx.admin.from("lumenai_integration_credentials").upsert({
      business_id: ctx.businessId,
      integration_id: integrationId,
      provider: GOOGLE_GMAIL_PROVIDER,
      encrypted_payload: encryptIntegrationSecret(credentials),
      key_version: 1,
    }, { onConflict: "integration_id" }).select("id").single();
    if (stored.error || !stored.data?.id) throw new Error("INTEGRATION_CREDENTIAL_SAVE_FAILED");
    const linked = await ctx.admin.from("lumenai_integrations").update({
      credentials_ref: String(stored.data.id),
      status: "connected",
    }).eq("id", integrationId).eq("business_id", ctx.businessId);
    if (linked.error) throw new Error("INTEGRATION_LINK_FAILED");
    const health = await checkGoogleGmailHealth({ admin: ctx.admin, businessId: ctx.businessId, integrationId });
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "integration.google_gmail.connected",
      targetTable: "lumenai_integrations",
      targetId: integrationId,
      metadata: { provider: GOOGLE_GMAIL_PROVIDER, accountEmail: health.email, scopes, mode: "prepare_only" },
    });
    issuedToken = "";
    return integrationRedirect(req, { connected: "1" });
  } catch (error) {
    if (issuedToken) await revokeGoogleToken(issuedToken).catch(() => undefined);
    if (integrationId && authorizedBusinessId) {
      const admin = supabaseAdmin();
      await Promise.resolve(
        admin
          .from("lumenai_integration_credentials")
          .delete()
          .eq("integration_id", integrationId)
          .eq("business_id", authorizedBusinessId),
      ).catch(() => undefined);
      await Promise.resolve(
        admin
          .from("lumenai_integrations")
          .update({
            status: "error",
            credentials_ref: null,
            token_expires_at: null,
            last_error_code: cleanString((error as { code?: unknown })?.code, 120) || "OAUTH_CALLBACK_FAILED",
            last_error_message: "La conexion no supero la verificacion y sus credenciales fueron retiradas.",
          })
          .eq("id", integrationId)
          .eq("business_id", authorizedBusinessId),
      ).catch(() => undefined);
    }
    return integrationRedirect(req, {
      error: cleanString((error as { code?: unknown })?.code, 120) || "oauth_callback_failed",
      ...(integrationId ? { integration: integrationId } : {}),
    });
  }
}
