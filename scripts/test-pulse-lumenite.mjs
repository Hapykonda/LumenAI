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

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `LumenAI-Pulse-${crypto.randomUUID()}!a9`;
const userIds = [];
const businessIds = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const email = `lumenai-pulse-${label}-${suffix}@example.test`;
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { test_fixture: "pulse_lumenite" } });
  if (result.error || !result.data.user) throw result.error || new Error("Pulse test user was not created.");
  userIds.push(result.data.user.id);
  return { id: result.data.user.id, email };
}

async function createBusiness(owner, label) {
  const result = await admin
    .from("businesses")
    .insert({
      name: `Pulse Lifecycle ${label}`,
      owner_id: owner.id,
      user_id: owner.id,
      created_by: owner.id,
      public_key: `pulse-${label}-${suffix}`,
      metadata: { test_fixture: true, suite: "pulse_lumenite" },
    })
    .select("id")
    .single();
  if (result.error || !result.data?.id) throw result.error || new Error("Pulse test business was not created.");
  businessIds.push(result.data.id);
  const profile = await admin.from("profiles").upsert({
    id: owner.id,
    business_id: result.data.id,
    active_business_id: result.data.id,
    metadata: { display_name: `Pulse Owner ${label}` },
  });
  if (profile.error) throw profile.error;
  return result.data.id;
}

async function sessionFor(email) {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session?.access_token) throw result.error || new Error("Pulse test session was not created.");
  return { client, token: result.data.session.access_token };
}

async function api(pathname, token, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

async function signalAction(token, signalId, action) {
  return api("/api/panel/pulse-radar/signals", token, {
    method: "POST",
    body: JSON.stringify({ signalId, action, snoozeMinutes: 20 }),
  });
}

async function createPolicy(token, userId, capability, resourceType) {
  const result = await api("/api/panel/lumenite/policies", token, {
    method: "POST",
    body: JSON.stringify({
      name: `Pulse ${capability}`,
      subjectUserId: userId,
      role: null,
      integrationId: null,
      capability,
      resourceType,
      accessTypes: ["create"],
      autonomyLevel: 3,
      allowed: true,
      maxPerHour: 100,
      maxPerDay: 500,
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
  assert(result.response.status === 201, `Pulse policy ${capability}: ${result.response.status} ${result.json?.error || ""}`);
}

async function readSignal(signalId, businessId) {
  const result = await admin
    .from("lumenai_pulse_signals")
    .select("*")
    .eq("id", signalId)
    .eq("business_id", businessId)
    .single();
  if (result.error) throw result.error;
  return result.data;
}

async function assertAudit(businessId, action, targetId) {
  const result = await admin
    .from("lumenai_audit_log")
    .select("id")
    .eq("business_id", businessId)
    .eq("action", action)
    .eq("target_id", targetId)
    .limit(1);
  if (result.error) throw result.error;
  assert(result.data?.length === 1, `Missing audit ${action}.`);
}

async function cleanup() {
  if (businessIds.length) await admin.from("businesses").delete().in("id", businessIds);
  if (userIds.length) {
    await admin.from("profiles").delete().in("id", userIds);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }
}

try {
  const ownerA = await createUser("a");
  const ownerB = await createUser("b");
  const businessA = await createBusiness(ownerA, "A");
  await createBusiness(ownerB, "B");
  const sessionA = await sessionFor(ownerA.email);
  const sessionB = await sessionFor(ownerB.email);

  const chat = await admin
    .from("chats")
    .insert({ business_id: businessA, title: "Pulse unread conversation", unread_owner: true, visitor_id: `pulse-${suffix}` })
    .select("id")
    .single();
  if (chat.error || !chat.data?.id) throw chat.error || new Error("Pulse chat fixture failed.");
  const lead = await admin
    .from("leads")
    .insert({ business_id: businessA, chat_id: chat.data.id, name: "Pulse Hot Lead", score: 90, email: `hot-${suffix}@example.test` })
    .select("id")
    .single();
  if (lead.error || !lead.data?.id) throw lead.error || new Error("Pulse lead fixture failed.");

  await createPolicy(sessionA.token, ownerA.id, "internal.task.create", "task");
  await createPolicy(sessionA.token, ownerA.id, "internal.reminder.create", "reminder");

  const radar = await api("/api/panel/pulse-radar?section=Radar", sessionA.token);
  assert(radar.response.status === 200 && radar.json?.ok, `Pulse read returned ${radar.response.status}: ${radar.json?.error || ""}`);
  assert(radar.json.insights?.length >= 4, "Pulse did not persist the expected real signals.");
  const first = radar.json.insights[0];
  assert(/^[0-9a-f-]{36}$/i.test(first.id), "Pulse insight does not expose a persisted UUID.");
  assert(first.status === "new", "A new persisted signal did not start as new.");
  assert(first.source?.label && first.period?.label && first.lastUpdatedAt, "Pulse signal lacks source, period or refresh evidence.");
  assert(first.evidence?.metrics && typeof first.evidence.metrics === "object", "Pulse signal lacks metric evidence.");

  const ownRead = await sessionA.client.from("lumenai_pulse_signals").select("id").eq("id", first.id);
  assert(!ownRead.error && ownRead.data?.length === 1, "Owner A cannot read its persisted Pulse signal.");
  const crossRead = await sessionB.client.from("lumenai_pulse_signals").select("id").eq("id", first.id);
  assert(!crossRead.error && crossRead.data?.length === 0, "Owner B can read business A Pulse signal.");
  const browserWrite = await sessionA.client.from("lumenai_pulse_signals").update({ status: "resolved" }).eq("id", first.id);
  assert(browserWrite.error, "Browser client can mutate server-managed Pulse lifecycle.");
  console.log("PASS Pulse signals persist evidence and remain tenant-isolated/server-managed");

  const viewed = await signalAction(sessionA.token, first.id, "view");
  assert(viewed.response.status === 200 && viewed.json.signal.status === "viewed", "View state did not persist.");
  const snoozed = await signalAction(sessionA.token, first.id, "snooze");
  assert(snoozed.response.status === 200 && snoozed.json.signal.snoozed_until, "Snooze did not persist.");
  await assertAudit(businessA, "pulse.signal.view", first.id);
  await assertAudit(businessA, "pulse.signal.snooze", first.id);

  const dismissCandidate = radar.json.insights.find((item) => item.id !== first.id);
  const dismissed = await signalAction(sessionA.token, dismissCandidate.id, "dismiss");
  assert(dismissed.response.status === 200 && dismissed.json.signal.status === "dismissed", "Dismiss did not persist.");
  await assertAudit(businessA, "pulse.signal.dismiss", dismissCandidate.id);
  console.log("PASS viewed, snoozed and dismissed states persist with audit evidence");

  const prepared = await signalAction(sessionA.token, first.id, "prepare");
  assert(prepared.response.status === 200 && prepared.json.runs?.[0], `Pulse prepare failed: ${prepared.json?.error || prepared.response.status}`);
  const runId = prepared.json.runs[0].id;
  assert(prepared.json.runs[0].signalId === first.id, "Lumenite run lost signal_id.");
  assert(prepared.json.runs[0].status === "awaiting_approval", "Pulse action bypassed human approval.");
  let signal = await readSignal(first.id, businessA);
  assert(signal.status === "awaiting_approval" && signal.action_plan_id === prepared.json.planId && signal.action_run_id === runId, "Pulse did not link plan and run.");
  const duplicatePrepare = await signalAction(sessionA.token, first.id, "prepare");
  assert(duplicatePrepare.response.status === 200 && duplicatePrepare.json.existing === true && duplicatePrepare.json.runId === runId, "Pulse prepare is not idempotent.");
  await assertAudit(businessA, "pulse.signal.action_prepared", first.id);

  const executed = await api("/api/panel/lumenite/execute", sessionA.token, {
    method: "POST",
    body: JSON.stringify({ runId, approve: true }),
  });
  assert(executed.response.status === 200 && executed.json.receipt?.verification?.verified, `Pulse execution failed: ${executed.json?.error || executed.response.status}`);
  signal = await readSignal(first.id, businessA);
  assert(signal.status === "resolved", "Successful Lumenite action did not resolve Pulse signal.");
  assert(signal.resolution?.receipt?.auditId === runId, "Pulse resolution does not contain the real receipt.");

  const refreshed = await api("/api/panel/pulse-radar?section=Radar", sessionA.token);
  const refreshedSignal = refreshed.json.insights.find((item) => item.id === first.id);
  assert(refreshedSignal?.status === "resolved" && refreshedSignal.actionRunId === runId, "Radar refresh overwrote the resolved lifecycle.");

  const undone = await api("/api/panel/lumenite/rollback", sessionA.token, {
    method: "POST",
    body: JSON.stringify({ runId }),
  });
  assert(undone.response.status === 200 && undone.json.run.status === "reverted", "Pulse-linked undo failed.");
  signal = await readSignal(first.id, businessA);
  assert(signal.status === "reverted" && signal.reverted_at, "Undo did not return reverted state to Pulse.");
  console.log("PASS Pulse -> plan -> approval -> execution -> resolved -> undo -> reverted stays synchronized");

  const retried = await signalAction(sessionA.token, first.id, "retry");
  assert(retried.response.status === 200 && retried.json.runs?.[0], `Pulse retry failed: ${retried.json?.error || retried.response.status}`);
  assert(retried.json.runs[0].id !== runId && retried.json.runs[0].status === "awaiting_approval", "Pulse retry did not create a fresh approval-gated run.");
  await assertAudit(businessA, "pulse.signal.retried", first.id);
  console.log("PASS reverted signal can retry through a fresh immutable plan");

  const { data: leadSignal } = await admin
    .from("lumenai_pulse_signals")
    .select("id")
    .eq("business_id", businessA)
    .eq("recommended_capability", "internal.reminder.create")
    .neq("status", "dismissed")
    .limit(1)
    .maybeSingle();
  assert(leadSignal?.id, "No lead-backed Pulse signal was created for failure verification.");
  const failurePlan = await signalAction(sessionA.token, leadSignal.id, "prepare");
  assert(failurePlan.response.status === 200 && failurePlan.json.runs?.[0], "Pulse failure plan was not prepared.");
  const failureRunId = failurePlan.json.runs[0].id;
  const deletedLead = await admin.from("leads").delete().eq("id", lead.data.id).eq("business_id", businessA);
  if (deletedLead.error) throw deletedLead.error;
  const failed = await api("/api/panel/lumenite/execute", sessionA.token, {
    method: "POST",
    body: JSON.stringify({ runId: failureRunId, approve: true }),
  });
  assert(failed.response.status === 404, "Missing resource did not fail the Pulse-linked action.");
  const failedSignal = await readSignal(leadSignal.id, businessA);
  assert(failedSignal.status === "failed" && failedSignal.last_error, "Failed action appeared resolved in Pulse.");
  assert(failedSignal.action_run_id === failureRunId, "Failed signal lost its run linkage.");
  console.log("PASS failed Lumenite action remains failed in Pulse with a retryable error");
} finally {
  await cleanup();
}

const cleanupCheck = await admin
  .from("businesses")
  .select("id", { count: "exact", head: true })
  .eq("metadata->>suite", "pulse_lumenite");
assert(cleanupCheck.count === 0, "Pulse lifecycle fixtures were not removed.");
console.log("PASS Pulse lifecycle fixture cleanup");
