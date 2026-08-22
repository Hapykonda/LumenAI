import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

test("Gmail requests only the compose scope and never exposes a send operation", () => {
  const provider = read("lib/integrations/google-gmail.ts");
  assert.match(provider, /GOOGLE_GMAIL_SCOPE = "https:\/\/www\.googleapis\.com\/auth\/gmail\.compose"/);
  assert.match(provider, /access_type", "offline"/);
  assert.match(provider, /code_challenge_method", "S256"/);
  assert.match(provider, /state", input\.state/);
  assert.doesNotMatch(provider, /\/drafts\/send|messages\/send/);
});

test("OAuth credentials are encrypted and hidden from browser roles", () => {
  const migration = read("supabase/migrations/20260810120000_complete_google_gmail_draft_integration.sql");
  const callback = read("app/api/integrations/google/callback/route.ts");
  assert.match(migration, /lumenai_integration_credentials/);
  assert.match(migration, /revoke all on table public\.lumenai_integration_credentials from anon, authenticated/);
  assert.match(migration, /lumenai_oauth_transactions/);
  assert.match(callback, /encryptIntegrationSecret\(credentials\)/);
  assert.doesNotMatch(callback, /NEXT_PUBLIC_GOOGLE|NEXT_PUBLIC.*SECRET/);
});

test("external drafts always use Approval Inbox and support verified undo", () => {
  const registry = read("lib/ai/lumenite/action-registry.ts");
  const draftsRoute = read("app/api/panel/integrations/google/drafts/route.ts");
  assert.match(registry, /id: "external\.gmail\.draft\.create"/);
  assert.match(registry, /approvalMode: "always"/);
  assert.match(registry, /deleteGoogleGmailDraft/);
  assert.match(draftsRoute, /deterministicAction: true/);
  assert.match(draftsRoute, /createLumenitePlan/);
});

test("the integration surface reports configuration and connection truthfully", () => {
  const api = read("app/api/panel/integrations/route.ts");
  const ui = read("app/panel/integrations/IntegrationsConsole.tsx");
  assert.match(api, /configured: googleOAuthConfiguration/);
  assert.match(ui, /Credenciales OAuth pendientes en servidor/);
  assert.match(ui, /Ninguna ruta de esta version envia correos/);
  assert.doesNotMatch(ui, /demo connected|mock integration/i);
});
