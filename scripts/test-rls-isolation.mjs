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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.LUMENAI_TEST_URL || "http://127.0.0.1:3000").replace(/\/+$/g, "");
if (!url || !anonKey || !serviceRoleKey) throw new Error("Supabase RLS test environment is incomplete.");

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonymous = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `LumenAI-RLS-${crypto.randomUUID()}!a9`;
const userIds = [];
const businessIds = [];
const storagePaths = [];
const bucket = "lumenai-private-assets";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const email = `lumenai-rls-${label}-${suffix}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test_fixture: "lumenai_rls" },
  });
  if (error || !data.user) throw error || new Error("RLS user creation failed.");
  userIds.push(data.user.id);
  return { id: data.user.id, email };
}

async function createBusiness(user, label) {
  const { data, error } = await admin
    .from("businesses")
    .insert({
      name: `LumenAI RLS ${label}`,
      owner_id: user.id,
      user_id: user.id,
      created_by: user.id,
      public_key: `rls-${label}-${suffix}`,
      metadata: { test_fixture: true },
    })
    .select("id")
    .single();
  if (error || !data?.id) throw error || new Error("RLS business creation failed.");
  businessIds.push(data.id);
  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    active_business_id: data.id,
    business_id: data.id,
    metadata: { test_fixture: true },
  });
  if (profileError) throw profileError;
  return data.id;
}

async function signIn(user) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error || !data.session?.access_token) throw error || new Error("RLS sign in failed.");
  return { client, token: data.session.access_token };
}

async function inserted(table, values) {
  const { data, error } = await admin.from(table).insert(values).select("*").single();
  if (error || !data) throw error || new Error(`Fixture insert failed for ${table}.`);
  return data;
}

async function seedTenant(businessId, userId) {
  const chat = await inserted("chats", {
    business_id: businessId,
    title: "RLS fixture chat",
    channel: "panel",
  });
  const lead = await inserted("leads", {
    business_id: businessId,
    chat_id: chat.id,
    name: "RLS fixture lead",
    source: "test",
    status: "new",
    metadata: { test_fixture: true },
  });
  await inserted("chat_messages", {
    business_id: businessId,
    chat_id: chat.id,
    sender_type: "user",
    content: "RLS fixture message",
  });
  await inserted("business_kb", {
    business_id: businessId,
    type: "other",
    title: "RLS fixture knowledge",
    content: "Private tenant knowledge",
    is_published: true,
    metadata: { test_fixture: true },
  });
  await inserted("widget_settings", {
    business_id: businessId,
    public_key: `rls-widget-${suffix}`,
    widget_enabled: true,
  });
  await inserted("lumenai_audit_log", {
    business_id: businessId,
    actor_user_id: userId,
    action: "rls.fixture.created",
    target_table: "businesses",
    target_id: businessId,
    metadata: { test_fixture: true },
  });
  await inserted("lumenai_agent_policies", {
    business_id: businessId,
    role: "owner",
    capability: `rls.fixture.${suffix}`,
    resource_type: "test",
    access_types: ["create"],
    autonomy_level: 3,
    allowed: true,
    granted_by: userId,
  });
  const plan = await inserted("lumenai_agent_plans", {
    business_id: businessId,
    requested_by: userId,
    source: "api",
    request_key: `rls-plan-${suffix}`,
    instruction: "RLS fixture plan",
    objective: "Verify tenant isolation",
    status: "ready",
  });
  const run = await inserted("lumenai_action_runs", {
    business_id: businessId,
    user_id: userId,
    action_name: "rls.fixture",
    payload: {},
    result: {},
    status: "draft",
    plan_id: plan.id,
    requested_by: userId,
    source: "api",
    capability: "tasks.create",
    idempotency_key: `rls-run-${suffix}`,
  });
  await inserted("lumenai_action_approvals", {
    business_id: businessId,
    action_run_id: run.id,
    requested_from: userId,
    decision: "pending",
  });
  await inserted("lumenai_lead_notes", {
    business_id: businessId,
    lead_id: lead.id,
    content: "RLS fixture note",
    created_by: userId,
  });
  await inserted("lumenai_response_drafts", {
    business_id: businessId,
    chat_id: chat.id,
    content: "RLS fixture draft",
    created_by: userId,
  });
  await inserted("lumenai_conversation_tags", {
    business_id: businessId,
    chat_id: chat.id,
    tag: `rls-${suffix}`,
    created_by: userId,
  });
  await inserted("lumenai_reminders", {
    business_id: businessId,
    title: "RLS fixture reminder",
    remind_at: new Date(Date.now() + 60_000).toISOString(),
    created_by: userId,
  });
  return { chat, lead, run };
}

async function assertVisible(client, table, businessId) {
  const { data, error } = await client.from(table).select("business_id").eq("business_id", businessId);
  assert(!error, `${table}: authorized select failed: ${error?.message}`);
  assert(Array.isArray(data) && data.length > 0, `${table}: authorized tenant row was not visible.`);
}

async function assertHidden(client, table, businessId, actor) {
  const { data } = await client.from(table).select("business_id").eq("business_id", businessId);
  assert(!Array.isArray(data) || data.length === 0, `${table}: ${actor} read another tenant row.`);
}

async function cleanup() {
  if (storagePaths.length) await admin.storage.from(bucket).remove(storagePaths);
  if (businessIds.length) await admin.from("businesses").delete().in("id", businessIds);
  if (userIds.length) {
    await admin.from("profiles").delete().in("id", userIds);
    for (const userId of userIds) await admin.auth.admin.deleteUser(userId);
  }
}

try {
  const userA = await createUser("a");
  const userB = await createUser("b");
  const noMember = await createUser("none");
  const businessA = await createBusiness(userA, "A");
  const businessB = await createBusiness(userB, "B");
  const seeded = await seedTenant(businessA, userA.id);

  const { error: noMemberProfileError } = await admin.from("profiles").upsert({
    id: noMember.id,
    active_business_id: businessA,
    business_id: businessA,
    metadata: { test_fixture: true },
  });
  if (noMemberProfileError) throw noMemberProfileError;

  const [authA, authB, authNoMember] = await Promise.all([
    signIn(userA),
    signIn(userB),
    signIn(noMember),
  ]);

  const sensitiveTables = [
    "business_kb",
    "chats",
    "chat_messages",
    "leads",
    "widget_settings",
    "lumenai_audit_log",
    "lumenai_agent_policies",
    "lumenai_agent_plans",
    "lumenai_action_runs",
    "lumenai_action_approvals",
    "lumenai_lead_notes",
    "lumenai_response_drafts",
    "lumenai_conversation_tags",
    "lumenai_reminders",
  ];

  for (const table of sensitiveTables) {
    await assertVisible(authA.client, table, businessA);
    await assertHidden(authB.client, table, businessA, "tenant B");
    await assertHidden(authNoMember.client, table, businessA, "user without membership");
    await assertHidden(anonymous, table, businessA, "anonymous user");
  }

  const { data: businessAVisible } = await authA.client
    .from("businesses")
    .select("id")
    .eq("id", businessA);
  const { data: businessAHidden } = await authB.client
    .from("businesses")
    .select("id")
    .eq("id", businessA);
  assert(businessAVisible?.length === 1, "Tenant A could not read its business.");
  assert(businessAHidden?.length === 0, "Tenant B could read business A.");

  const { data: profileAHidden } = await authB.client
    .from("profiles")
    .select("id")
    .eq("id", userA.id);
  assert(profileAHidden?.length === 0, "Tenant B could read profile A.");

  const ownLead = await authA.client
    .from("leads")
    .insert({ business_id: businessA, name: "Direct A lead", source: "rls-test" })
    .select("id,business_id,status")
    .single();
  assert(!ownLead.error && ownLead.data?.id, "Tenant A could not create its lead.");

  const crossLead = await authA.client
    .from("leads")
    .insert({ business_id: businessB, name: "Forbidden lead", source: "rls-test" });
  assert(Boolean(crossLead.error), "Tenant A inserted a lead into business B.");

  const ownUpdate = await authA.client
    .from("leads")
    .update({ status: "contacted" })
    .eq("id", ownLead.data.id)
    .select("id,status")
    .single();
  assert(!ownUpdate.error && ownUpdate.data?.status === "contacted", "Tenant A could not update its lead.");

  const tenantMove = await authA.client
    .from("leads")
    .update({ business_id: businessB })
    .eq("id", ownLead.data.id)
    .select("id");
  assert(Boolean(tenantMove.error), "Tenant A moved a row into business B.");

  await authB.client.from("leads").delete().eq("id", ownLead.data.id);
  const { data: stillPresent } = await admin.from("leads").select("id").eq("id", ownLead.data.id).maybeSingle();
  assert(stillPresent?.id === ownLead.data.id, "Tenant B deleted tenant A's lead.");

  const ownDelete = await authA.client.from("leads").delete().eq("id", ownLead.data.id).select("id");
  assert(!ownDelete.error && ownDelete.data?.length === 1, "Tenant A could not delete its lead.");

  const actionWrite = await authA.client.from("lumenai_action_runs").insert({
    business_id: businessA,
    action_name: "forbidden.browser.write",
    status: "draft",
    capability: "tasks.create",
    idempotency_key: `browser-${suffix}`,
  });
  assert(Boolean(actionWrite.error), "Browser wrote directly to Action OS.");

  const auditWrite = await authA.client.from("lumenai_audit_log").insert({
    business_id: businessA,
    action: "forbidden.browser.audit",
  });
  assert(Boolean(auditWrite.error), "Browser fabricated an audit event.");

  const ownPath = `${businessA}/rls/${suffix}.txt`;
  const revocationPath = `${businessA}/rls/${suffix}-revocation.txt`;
  const foreignPath = `${businessB}/rls/${suffix}.txt`;
  storagePaths.push(ownPath, revocationPath, foreignPath);
  const upload = await authA.client.storage
    .from(bucket)
    .upload(ownPath, new TextEncoder().encode("private tenant A"), { contentType: "text/plain" });
  assert(!upload.error, `Tenant A private upload failed: ${upload.error?.message}`);
  const revocationUpload = await authA.client.storage
    .from(bucket)
    .upload(revocationPath, new TextEncoder().encode("revocation probe"), { contentType: "text/plain" });
  assert(!revocationUpload.error, `Revocation probe upload failed: ${revocationUpload.error?.message}`);

  const crossUpload = await authA.client.storage
    .from(bucket)
    .upload(foreignPath, new TextEncoder().encode("forbidden"), { contentType: "text/plain" });
  assert(Boolean(crossUpload.error), "Tenant A uploaded into tenant B's path.");

  const ownDownload = await authA.client.storage.from(bucket).download(ownPath);
  assert(!ownDownload.error && ownDownload.data, "Tenant A could not download its private file.");
  const crossDownload = await authB.client.storage.from(bucket).download(ownPath);
  assert(Boolean(crossDownload.error), "Tenant B downloaded tenant A's private file.");
  const noMemberDownload = await authNoMember.client.storage.from(bucket).download(ownPath);
  assert(Boolean(noMemberDownload.error), "A user without membership downloaded a private file.");
  const anonymousDownload = await anonymous.storage.from(bucket).download(ownPath);
  assert(Boolean(anonymousDownload.error), "An anonymous user downloaded a private file.");

  const { error: suspendError } = await admin
    .from("lumenai_business_members")
    .update({ status: "suspended" })
    .eq("business_id", businessA)
    .eq("user_id", userA.id);
  if (suspendError) throw suspendError;

  const revokedRead = await authA.client.from("leads").select("id").eq("id", seeded.lead.id);
  assert(revokedRead.data?.length === 0, "Suspended membership retained database access.");
  const revokedAuth = await signIn(userA);
  const revokedStorage = await revokedAuth.client.storage.from(bucket).download(revocationPath);
  assert(Boolean(revokedStorage.error), "Suspended membership retained Storage access.");
  const revokedApi = await fetch(`${baseUrl}/api/panel/overview`, {
    headers: { Authorization: `Bearer ${revokedAuth.token}` },
  });
  const revokedApiJson = await revokedApi.json();
  assert(revokedApi.status === 403, `Suspended API access returned ${revokedApi.status}.`);
  assert(revokedApiJson.code === "MEMBERSHIP_INACTIVE", "Revocation did not return MEMBERSHIP_INACTIVE.");

  await admin
    .from("lumenai_business_members")
    .update({ status: "active" })
    .eq("business_id", businessA)
    .eq("user_id", userA.id);
  const remove = await authA.client.storage.from(bucket).remove([ownPath, revocationPath]);
  assert(!remove.error, "Tenant A could not delete its private file.");

  console.log(`PASS ${sensitiveTables.length} sensitive tables isolate tenant A from B, no-member, and anon`);
  console.log("PASS tenant CRUD and tenant reassignment checks");
  console.log("PASS Action OS and audit writes remain server-only");
  console.log("PASS private Storage upload/read/delete and cross-tenant denial");
  console.log("PASS membership suspension revokes API, database, and Storage access immediately");
} finally {
  await cleanup();
}
