import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanString, isRecord } from "@/lib/ai/lumenite/core";
import { LumeniteSafeError } from "@/lib/ai/lumenite/errors";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./secret-crypto";

export const GOOGLE_GMAIL_PROVIDER = "google_gmail";
export const GOOGLE_GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

type GoogleCredentials = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string;
  expiresAt: string;
};

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
  error?: unknown;
  error_description?: unknown;
};

type IntegrationRow = {
  id: string;
  business_id: string;
  status: string;
  account_email: string | null;
  scopes: string[] | null;
  token_expires_at: string | null;
};

function integrationError(code: string, message: string, status = 502) {
  return new LumeniteSafeError(message, status, code);
}

export function googleOAuthConfiguration(origin?: string) {
  const clientId = cleanString(process.env.GOOGLE_OAUTH_CLIENT_ID, 500);
  const clientSecret = cleanString(process.env.GOOGLE_OAUTH_CLIENT_SECRET, 500);
  const appOrigin = cleanString(origin || process.env.NEXT_PUBLIC_APP_URL, 1000).replace(/\/$/, "");
  const redirectUri = cleanString(process.env.GOOGLE_OAUTH_REDIRECT_URI, 1200)
    || (appOrigin ? `${appOrigin}/api/integrations/google/callback` : "");
  return {
    configured: Boolean(clientId && clientSecret && redirectUri && process.env.LUMENAI_INTEGRATION_ENCRYPTION_KEY),
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildGoogleAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  origin?: string;
  loginHint?: string | null;
}) {
  const config = googleOAuthConfiguration(input.origin);
  if (!config.configured) {
    throw integrationError("INTEGRATION_NOT_CONFIGURED", "Google Gmail no esta configurado en el servidor.", 503);
  }
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_GMAIL_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (input.loginHint) url.searchParams.set("login_hint", input.loginHint);
  return url;
}

function parseTokenResponse(value: unknown, existingRefreshToken = ""): GoogleCredentials {
  if (!isRecord(value)) throw integrationError("GOOGLE_TOKEN_INVALID", "Google devolvio credenciales no validas.");
  const data = value as TokenResponse;
  const accessToken = cleanString(data.access_token, 4096);
  const refreshToken = cleanString(data.refresh_token, 4096) || existingRefreshToken;
  const expiresIn = Number(data.expires_in ?? 0);
  const scope = cleanString(data.scope, 2000);
  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw integrationError(
      cleanString(data.error, 120) || "GOOGLE_TOKEN_INVALID",
      cleanString(data.error_description, 500) || "Google no devolvio un token renovable.",
    );
  }
  return {
    accessToken,
    refreshToken,
    tokenType: cleanString(data.token_type, 80) || "Bearer",
    scope,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export async function exchangeGoogleAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  origin?: string;
  fetcher?: typeof fetch;
}) {
  const config = googleOAuthConfiguration(input.origin);
  if (!config.configured) throw integrationError("INTEGRATION_NOT_CONFIGURED", "Google Gmail no esta configurado.", 503);
  const response = await (input.fetcher ?? fetch)(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw integrationError(
      isRecord(json) ? cleanString(json.error, 120) || "GOOGLE_TOKEN_EXCHANGE_FAILED" : "GOOGLE_TOKEN_EXCHANGE_FAILED",
      isRecord(json) ? cleanString(json.error_description, 500) || "Google rechazo el codigo OAuth." : "Google rechazo el codigo OAuth.",
      502,
    );
  }
  return parseTokenResponse(json);
}

async function refreshGoogleCredentials(credentials: GoogleCredentials, fetcher: typeof fetch) {
  const config = googleOAuthConfiguration();
  if (!config.configured) throw integrationError("INTEGRATION_NOT_CONFIGURED", "Google Gmail no esta configurado.", 503);
  const response = await fetcher(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw integrationError(
      isRecord(json) ? cleanString(json.error, 120) || "GOOGLE_REFRESH_FAILED" : "GOOGLE_REFRESH_FAILED",
      isRecord(json) ? cleanString(json.error_description, 500) || "La conexion de Google necesita renovarse." : "La conexion de Google necesita renovarse.",
      401,
    );
  }
  return parseTokenResponse(json, credentials.refreshToken);
}

async function loadCredentials(admin: SupabaseClient, businessId: string, integrationId: string) {
  const [{ data: integration, error: integrationErrorResult }, { data: secret, error: secretError }] = await Promise.all([
    admin
      .from("lumenai_integrations")
      .select("id,business_id,status,account_email,scopes,token_expires_at")
      .eq("id", integrationId)
      .eq("business_id", businessId)
      .eq("provider", GOOGLE_GMAIL_PROVIDER)
      .maybeSingle(),
    admin
      .from("lumenai_integration_credentials")
      .select("encrypted_payload")
      .eq("integration_id", integrationId)
      .eq("business_id", businessId)
      .eq("provider", GOOGLE_GMAIL_PROVIDER)
      .maybeSingle(),
  ]);
  if (integrationErrorResult || secretError || !integration?.id || !secret?.encrypted_payload) {
    throw integrationError("INTEGRATION_DISCONNECTED", "La integracion de Gmail no esta conectada.", 409);
  }
  if (!["connected", "degraded"].includes(String(integration.status))) {
    throw integrationError("INTEGRATION_UNAVAILABLE", "La integracion de Gmail no esta disponible.", 409);
  }
  return {
    integration: integration as IntegrationRow,
    credentials: decryptIntegrationSecret<GoogleCredentials>(String(secret.encrypted_payload)),
  };
}

async function authorizedGoogleRequest(input: {
  admin: SupabaseClient;
  businessId: string;
  integrationId: string;
  path: string;
  init?: RequestInit;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;
  const loaded = await loadCredentials(input.admin, input.businessId, input.integrationId);
  let credentials = loaded.credentials;
  if (Date.parse(credentials.expiresAt) <= Date.now() + 60_000) {
    try {
      credentials = await refreshGoogleCredentials(credentials, fetcher);
      await Promise.all([
        input.admin
          .from("lumenai_integration_credentials")
          .update({ encrypted_payload: encryptIntegrationSecret(credentials) })
          .eq("integration_id", input.integrationId)
          .eq("business_id", input.businessId),
        input.admin
          .from("lumenai_integrations")
          .update({ status: "connected", token_expires_at: credentials.expiresAt, last_error_code: null, last_error_message: null })
          .eq("id", input.integrationId)
          .eq("business_id", input.businessId),
      ]);
    } catch (error) {
      await input.admin
        .from("lumenai_integrations")
        .update({ status: "expired", last_error_code: "GOOGLE_REFRESH_FAILED", last_error_message: "La autorizacion de Google debe renovarse." })
        .eq("id", input.integrationId)
        .eq("business_id", input.businessId);
      throw error;
    }
  }
  const response = await fetcher(`${GMAIL_API_URL}${input.path}`, {
    ...input.init,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
      ...(input.init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return { response, integration: loaded.integration };
}

export async function checkGoogleGmailHealth(input: {
  admin: SupabaseClient;
  businessId: string;
  integrationId: string;
  fetcher?: typeof fetch;
}) {
  const checkedAt = new Date().toISOString();
  try {
    const { response } = await authorizedGoogleRequest({ ...input, path: "/profile" });
    const json = await response.json().catch(() => null);
    if (!response.ok || !isRecord(json) || !cleanString(json.emailAddress, 320)) {
      throw integrationError("GOOGLE_HEALTH_FAILED", "Google Gmail no supero la comprobacion de salud.", response.status || 502);
    }
    const email = cleanString(json.emailAddress, 320);
    await input.admin
      .from("lumenai_integrations")
      .update({
        status: "connected",
        account_email: email,
        last_health_check_at: checkedAt,
        last_sync_at: checkedAt,
        last_error_code: null,
        last_error_message: null,
      })
      .eq("id", input.integrationId)
      .eq("business_id", input.businessId);
    return { healthy: true, email, checkedAt };
  } catch (error) {
    await input.admin
      .from("lumenai_integrations")
      .update({
        status: "degraded",
        last_health_check_at: checkedAt,
        last_error_code: cleanString((error as { code?: unknown })?.code, 120) || "GOOGLE_HEALTH_FAILED",
        last_error_message: error instanceof Error ? cleanString(error.message, 500) : "Google Gmail no esta disponible.",
      })
      .eq("id", input.integrationId)
      .eq("business_id", input.businessId);
    throw error;
  }
}

function safeHeader(value: string, maxLength: number) {
  return cleanString(value, maxLength).replace(/[\r\n]+/g, " ");
}

function encodedSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(safeHeader(subject, 300), "utf8").toString("base64")}?=`;
}

export async function createGoogleGmailDraft(input: {
  admin: SupabaseClient;
  businessId: string;
  integrationId: string;
  recipient: string;
  subject: string;
  content: string;
  fetcher?: typeof fetch;
}) {
  const raw = [
    `To: ${safeHeader(input.recipient, 320)}`,
    `Subject: ${encodedSubject(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.content.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
  const { response } = await authorizedGoogleRequest({
    ...input,
    path: "/drafts",
    init: { method: "POST", body: JSON.stringify({ message: { raw: Buffer.from(raw, "utf8").toString("base64url") } }) },
  });
  const json = await response.json().catch(() => null);
  const draftId = isRecord(json) ? cleanString(json.id, 500) : "";
  const messageId = isRecord(json) && isRecord(json.message) ? cleanString(json.message.id, 500) : "";
  if (!response.ok || !draftId) {
    throw integrationError("GOOGLE_DRAFT_CREATE_FAILED", "Google no pudo crear el borrador.", response.status || 502);
  }
  return {
    draftId,
    messageId,
    externalUrl: `https://mail.google.com/mail/u/0/#drafts/${encodeURIComponent(messageId || draftId)}`,
  };
}

export async function verifyGoogleGmailDraft(input: {
  admin: SupabaseClient;
  businessId: string;
  integrationId: string;
  draftId: string;
  fetcher?: typeof fetch;
}) {
  const { response } = await authorizedGoogleRequest({ ...input, path: `/drafts/${encodeURIComponent(input.draftId)}` });
  const json = await response.json().catch(() => null);
  return { verified: response.ok && isRecord(json) && cleanString(json.id, 500) === input.draftId, checkedAt: new Date().toISOString() };
}

export async function deleteGoogleGmailDraft(input: {
  admin: SupabaseClient;
  businessId: string;
  integrationId: string;
  draftId: string;
  fetcher?: typeof fetch;
}) {
  const { response } = await authorizedGoogleRequest({
    ...input,
    path: `/drafts/${encodeURIComponent(input.draftId)}`,
    init: { method: "DELETE" },
  });
  if (!response.ok && response.status !== 404) {
    throw integrationError("GOOGLE_DRAFT_DELETE_FAILED", "Google no pudo retirar el borrador.", response.status || 502);
  }
  return { verified: true, checkedAt: new Date().toISOString(), alreadyMissing: response.status === 404 };
}

export async function revokeGoogleToken(token: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  });
  return { revoked: response.ok || response.status === 400, status: response.status };
}

export function decryptGoogleCredentialPayload(payload: string) {
  return decryptIntegrationSecret<GoogleCredentials>(payload);
}
