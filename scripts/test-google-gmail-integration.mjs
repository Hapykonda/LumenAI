import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/g)) {
    const value = line.trim();
    if (!value || value.startsWith("#") || !value.includes("=")) continue;
    const index = value.indexOf("=");
    const key = value.slice(0, index).trim();
    const content = value.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = content;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.LUMENAI_TEST_URL || "http://127.0.0.1:3000").replace(/\/+$/g, "");
if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase integration test environment is incomplete.");

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `LumenAI-Gmail-${crypto.randomUUID()}!a9`;
const users = [];
const businesses = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(pathname, token, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

async function fixture(label) {
  const email = `lumenai-gmail-${label}-${suffix}@example.test`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { test_fixture: "gmail_integration" } });
  if (created.error || !created.data.user) throw created.error || new Error("Fixture user was not created.");
  const userId = created.data.user.id;
  users.push(userId);
  const business = await admin.from("businesses").insert({
    name: `Gmail Integration ${label}`,
    owner_id: userId,
    user_id: userId,
    created_by: userId,
    public_key: `gmail-${label}-${suffix}`,
    metadata: { test_fixture: true, fixture_type: "gmail_integration" },
  }).select("id").single();
  if (business.error || !business.data?.id) throw business.error || new Error("Fixture business was not created.");
  const businessId = String(business.data.id);
  businesses.push(businessId);
  const profile = await admin.from("profiles").upsert({ id: userId, business_id: businessId, active_business_id: businessId });
  if (profile.error) throw profile.error;
  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = await auth.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session?.access_token) throw session.error || new Error("Fixture session was not created.");
  return { userId, businessId, token: session.data.session.access_token, client: auth };
}

async function cleanup() {
  for (const businessId of businesses) await admin.from("businesses").delete().eq("id", businessId);
  for (const userId of users) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

try {
  const ownerA = await fixture("A");
  const ownerB = await fixture("B");
  const integrationA = await admin.from("lumenai_integrations").insert({
    business_id: ownerA.businessId,
    provider: "google_gmail",
    status: "connected",
    connection_mode: "prepare_only",
    scopes: ["https://www.googleapis.com/auth/gmail.compose"],
    account_email: `owner-a-${suffix}@example.test`,
    config: { testFixture: true, sendsEmail: false },
  }).select("id").single();
  const integrationB = await admin.from("lumenai_integrations").insert({
    business_id: ownerB.businessId,
    provider: "google_gmail",
    status: "connected",
    connection_mode: "prepare_only",
    scopes: ["https://www.googleapis.com/auth/gmail.compose"],
    account_email: `owner-b-${suffix}@example.test`,
    config: { testFixture: true, sendsEmail: false },
  }).select("id").single();
  if (integrationA.error || integrationB.error) throw integrationA.error || integrationB.error;
  const integrationAId = String(integrationA.data.id);
  const integrationBId = String(integrationB.data.id);
  const credential = await admin.from("lumenai_integration_credentials").insert({
    business_id: ownerA.businessId,
    integration_id: integrationAId,
    provider: "google_gmail",
    encrypted_payload: "test-only-unreadable-secret",
  });
  if (credential.error) throw credential.error;

  const ownRows = await ownerA.client.from("lumenai_integrations").select("id");
  assert(!ownRows.error && ownRows.data?.length === 1 && ownRows.data[0].id === integrationAId, "Tenant A could not read its sanitized integration.");
  const secretRead = await ownerA.client.from("lumenai_integration_credentials").select("encrypted_payload");
  assert(Boolean(secretRead.error), "A browser role read encrypted integration credentials.");
  const directMutation = await ownerA.client.from("lumenai_integrations").update({ status: "connected" }).eq("id", integrationAId);
  assert(Boolean(directMutation.error), "A browser role mutated provider-owned connection state.");
  console.log("PASS sanitized state is tenant-scoped and credentials are server-only");

  const policy = await api("/api/panel/lumenite/policies", ownerA.token, {
    method: "POST",
    body: JSON.stringify({
      name: "Gmail drafts with approval",
      subjectUserId: ownerA.userId,
      role: null,
      integrationId: integrationAId,
      capability: "external.gmail.draft.create",
      resourceType: "external_email_draft",
      accessTypes: ["create"],
      autonomyLevel: 3,
      allowed: true,
      maxPerHour: 10,
      maxPerDay: 50,
      allowedDays: [],
      startTime: null,
      endTime: null,
      timezone: "UTC",
      expiresAt: null,
      requiresApproval: true,
      allowsAutoExecute: false,
      allowsUndo: true,
    }),
  });
  assert(policy.response.status === 201, `External draft policy failed: ${policy.response.status} ${policy.json?.error || ""}`);

  const requestKey = crypto.randomUUID();
  const draftBody = {
    integrationId: integrationAId,
    recipient: `recipient-${suffix}@example.test`,
    subject: "Propuesta revisable",
    content: "Este contenido debe quedar pendiente de aprobacion y nunca enviarse durante la prueba.",
  };
  const prepared = await api("/api/panel/integrations/google/drafts", ownerA.token, {
    method: "POST",
    headers: { "Idempotency-Key": requestKey },
    body: JSON.stringify(draftBody),
  });
  assert(prepared.response.status === 200, `Draft preparation failed: ${prepared.response.status} ${prepared.json?.error || ""}`);
  assert(prepared.json?.runs?.length === 1, "Draft preparation did not create one action run.");
  const run = prepared.json.runs[0];
  assert(run.capability === "external.gmail.draft.create", "Draft capability changed during planning.");
  assert(run.integrationId === integrationAId, "Draft run lost its authorized integration.");
  assert(run.status === "awaiting_approval", "External draft bypassed human approval.");
  const duplicate = await api("/api/panel/integrations/google/drafts", ownerA.token, {
    method: "POST",
    headers: { "Idempotency-Key": requestKey },
    body: JSON.stringify(draftBody),
  });
  assert(duplicate.response.status === 200 && duplicate.json?.deduplicated === true, "Draft preparation was not idempotent.");
  assert(duplicate.json.runs[0].id === run.id, "Duplicate preparation changed the action run.");
  const approval = await admin.from("lumenai_action_approvals").select("decision").eq("action_run_id", run.id).single();
  assert(!approval.error && approval.data?.decision === "pending", "Approval Inbox did not receive the external draft.");
  const externalRows = await admin.from("lumenai_external_drafts").select("id", { count: "exact", head: true }).eq("action_run_id", run.id);
  assert(externalRows.count === 0, "The test created an external draft before approval.");
  console.log("PASS preparation is deterministic, idempotent and approval-gated without external execution");

  const crossTenant = await api("/api/panel/integrations/google/drafts", ownerA.token, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ ...draftBody, integrationId: integrationBId }),
  });
  assert(crossTenant.response.status === 409, `Cross-tenant integration returned ${crossTenant.response.status}.`);
  const crossRuns = await admin.from("lumenai_action_runs").select("id", { count: "exact", head: true }).eq("business_id", ownerA.businessId).eq("integration_id", integrationBId);
  assert(crossRuns.count === 0, "Cross-tenant integration produced an action run.");
  console.log("PASS cross-tenant integration IDs are rejected before planning");
} finally {
  await cleanup();
}

const remaining = await admin.from("businesses").select("id", { count: "exact", head: true }).eq("metadata->>fixture_type", "gmail_integration");
assert(remaining.count === 0, "Gmail integration fixtures were not cleaned.");
console.log("PASS Gmail integration fixtures were removed");
