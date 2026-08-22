import { NextResponse } from "next/server";
import { getAuthorizedBusinessContext, businessAuthorizationErrorResponse } from "@/lib/auth/business-context";
import { recordRequiredAudit } from "@/lib/ai/lumenite/audit";
import { buildGoogleAuthorizationUrl, GOOGLE_GMAIL_PROVIDER } from "@/lib/integrations/google-gmail";
import { encryptIntegrationSecret, randomOAuthToken, sha256Base64Url, sha256Hex } from "@/lib/integrations/secret-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthorizedBusinessContext({ request: req, requiredPermission: "permissions:manage" });
    const state = randomOAuthToken(32);
    const verifier = randomOAuthToken(64);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const authUrl = buildGoogleAuthorizationUrl({
      state,
      codeChallenge: sha256Base64Url(verifier),
      origin: new URL(req.url).origin,
      loginHint: ctx.user.email ?? null,
    });
    await ctx.admin
      .from("lumenai_oauth_transactions")
      .delete()
      .eq("business_id", ctx.businessId)
      .eq("user_id", ctx.userId)
      .lt("expires_at", new Date().toISOString());
    const transaction = await ctx.admin.from("lumenai_oauth_transactions").insert({
      business_id: ctx.businessId,
      user_id: ctx.userId,
      provider: GOOGLE_GMAIL_PROVIDER,
      state_hash: sha256Hex(state),
      encrypted_code_verifier: encryptIntegrationSecret({ verifier }),
      redirect_path: "/panel/integrations",
      expires_at: expiresAt,
    }).select("id").single();
    if (transaction.error || !transaction.data?.id) throw new Error("OAUTH_STATE_CREATE_FAILED");
    await recordRequiredAudit({
      admin: ctx.admin,
      businessId: ctx.businessId,
      userId: ctx.userId,
      action: "integration.google_gmail.connect_started",
      targetTable: "lumenai_oauth_transactions",
      targetId: String(transaction.data.id),
      metadata: { provider: GOOGLE_GMAIL_PROVIDER, scope: "gmail.compose", expiresAt },
    });
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return businessAuthorizationErrorResponse(error);
  }
}
