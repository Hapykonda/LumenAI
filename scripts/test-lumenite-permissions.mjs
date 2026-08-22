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
if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase test environment is incomplete.");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `LumenAI-Permissions-${crypto.randomUUID()}!a9`;
const users = [];
const businesses = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const email = `lumenai-permissions-${label}-${suffix}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test_fixture: "lumenite_permissions" },
  });
  if (error || !data.user) throw error || new Error("Test user was not created.");
  users.push(data.user.id);
  return { id: data.user.id, email };
}

async function tokenFor(email) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw error || new Error("Test session was not created.");
  return data.session.access_token;
}

async function api(pathname, token, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

const taskContext = (title) => ({
  capability: "internal.task.create",
  input: {
    title,
    description: "Authenticated permission gate test",
    dueAt: null,
    priority: "medium",
    leadId: null,
    conversationId: null,
  },
});

const policyBody = (ownerId, overrides = {}) => ({
  name: "Task execution test",
  subjectUserId: ownerId,
  role: null,
  integrationId: null,
  capability: "internal.task.create",
  resourceType: "task",
  accessTypes: ["create"],
  autonomyLevel: 3,
  allowed: true,
  maxPerHour: 20,
  maxPerDay: 100,
  allowedDays: [],
  startTime: null,
  endTime: null,
  timezone: "UTC",
  expiresAt: null,
  requiresApproval: true,
  allowsAutoExecute: false,
  allowsUndo: true,
  ...overrides,
});

async function createPlan(token, title) {
  return api("/api/panel/lumenite/plan", token, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      agent: "panel",
      instruction: `Crea la tarea ${title}`,
      source: "api",
      context: taskContext(title),
    }),
  });
}

async function cleanup() {
  if (businesses.length) await admin.from("businesses").delete().in("id", businesses);
  if (users.length) {
    await admin.from("profiles").delete().in("id", users);
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }
}

try {
  const owner = await createUser("owner");
  const member = await createUser("member");
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: "LumenAI Permission Verification",
      owner_id: owner.id,
      user_id: owner.id,
      created_by: owner.id,
      public_key: `permissions-${suffix}`,
      metadata: { test_fixture: true },
    })
    .select("id")
    .single();
  if (businessError || !business?.id) throw businessError || new Error("Business was not created.");
  businesses.push(business.id);
  const { error: profileError } = await admin.from("profiles").upsert([
    { id: owner.id, business_id: business.id, active_business_id: business.id, metadata: { display_name: "Owner Test" } },
    { id: member.id, business_id: business.id, active_business_id: business.id, metadata: { display_name: "Member Test" } },
  ]);
  if (profileError) throw profileError;
  const { error: memberError } = await admin.from("lumenai_business_members").upsert({
    business_id: business.id,
    user_id: member.id,
    role: "member",
    status: "active",
    created_by: owner.id,
  }, { onConflict: "business_id,user_id" });
  if (memberError) throw memberError;

  const [ownerToken, memberToken] = await Promise.all([tokenFor(owner.email), tokenFor(member.email)]);
  const ownerList = await api("/api/panel/lumenite/policies", ownerToken);
  assert(ownerList.response.status === 200, `Owner policy list returned ${ownerList.response.status}.`);
  const memberList = await api("/api/panel/lumenite/policies", memberToken);
  assert(memberList.response.status === 403, `Member policy list returned ${memberList.response.status}.`);

  const created = await api("/api/panel/lumenite/policies", ownerToken, {
    method: "POST",
    body: JSON.stringify(policyBody(owner.id)),
  });
  assert(created.response.status === 201, `Policy create returned ${created.response.status}: ${created.json?.error || ""}`);
  const approvalPolicyId = created.json.policy.id;

  const firstPlan = await createPlan(ownerToken, "Revisar propuesta versionada");
  assert(firstPlan.response.status === 200, `Plan create returned ${firstPlan.response.status}: ${firstPlan.json?.error || ""}`);
  assert(firstPlan.json.runs?.[0]?.status === "awaiting_approval", "Level 3 did not require approval.");
  const originalRun = firstPlan.json.runs[0];

  const changes = await api("/api/panel/lumenite/action-runs", ownerToken, {
    method: "PATCH",
    body: JSON.stringify({
      runId: originalRun.id,
      decision: "request_changes",
      reason: "Ajustar el titulo antes de ejecutar",
    }),
  });
  assert(changes.response.status === 200, `Request changes returned ${changes.response.status}: ${changes.json?.error || ""}`);
  assert(changes.json.run.status === "changes_requested", "Previous run was not preserved as changes requested.");
  assert(changes.json.replacement?.version === 2, "Replacement plan is not version 2.");
  assert(changes.json.replacement?.parentPlanId === firstPlan.json.planId, "Replacement plan lost its parent.");
  assert(
    changes.json.replacement?.runs?.[0]?.status === "awaiting_approval",
    `Replacement did not request approval again: ${JSON.stringify(changes.json.replacement)}`,
  );

  const revoked = await api("/api/panel/lumenite/policies", ownerToken, {
    method: "DELETE",
    body: JSON.stringify({ id: approvalPolicyId, reason: "Permission lifecycle verification" }),
  });
  assert(revoked.response.status === 200, `Policy revoke returned ${revoked.response.status}: ${revoked.json?.error || ""}`);
  assert(revoked.json.cancelledRuns >= 1, "Revocation did not cancel the replacement run.");

  const inbox = await api("/api/panel/lumenite/action-runs", ownerToken);
  assert(inbox.response.status === 200, `Approval inbox returned ${inbox.response.status}.`);
  assert(inbox.json.approvalInbox.rejected.some((item) => item.run.id === originalRun.id), "Changes-requested history is missing.");
  assert(inbox.json.approvalInbox.expired.length >= 1, "Revoked pending approval is not visible as expired.");

  const autonomous = await api("/api/panel/lumenite/policies", ownerToken, {
    method: "POST",
    body: JSON.stringify(policyBody(owner.id, {
      name: "Limited autonomous task",
      autonomyLevel: 4,
      maxPerHour: 1,
      maxPerDay: 1,
      requiresApproval: false,
      allowsAutoExecute: true,
    })),
  });
  assert(autonomous.response.status === 201, `Autonomous policy create returned ${autonomous.response.status}.`);

  const executable = await createPlan(ownerToken, "Primera tarea limitada");
  assert(executable.json.runs?.[0]?.status === "approved", "Level 4 low-risk action was not auto-approved.");
  const execution = await api("/api/panel/lumenite/execute", ownerToken, {
    method: "POST",
    body: JSON.stringify({ runId: executable.json.runs[0].id }),
  });
  assert(execution.response.status === 200, `Limited action execution returned ${execution.response.status}: ${execution.json?.error || ""}`);
  assert(["completed", "undo_available"].includes(execution.json.run.status), "Limited action did not complete.");

  const limited = await createPlan(ownerToken, "Segunda tarea bloqueada por limite");
  assert(limited.response.status === 200, `Limit plan returned ${limited.response.status}.`);
  assert((limited.json.runs || []).length === 0, "Hourly limit allowed a second action.");
  assert(limited.json.plan.missingData.some((item) => /limite operativo/i.test(item)), "Operational limit was not explained.");

  console.log("PASS only owner/admin can manage policies");
  console.log("PASS autonomy level 3 creates a pending approval");
  console.log("PASS request changes preserves v1 and creates approval-gated v2");
  console.log("PASS policy revocation invalidates pending work immediately");
  console.log("PASS approval inbox preserves rejected and expired history");
  console.log("PASS level 4 executes one low-risk action and enforces hourly/daily limits");
} finally {
  await cleanup();
}
