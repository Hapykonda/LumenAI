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
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Supabase test environment is incomplete.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `LumenAI-Actions-${crypto.randomUUID()}!a9`;
let userId = null;
let businessId = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function createPolicy(token, action) {
  const result = await api("/api/panel/lumenite/policies", token, {
    method: "POST",
    body: JSON.stringify({
      name: `E2E ${action.capability}`,
      subjectUserId: userId,
      role: null,
      integrationId: null,
      capability: action.capability,
      resourceType: action.resourceType,
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
  assert(result.response.status === 201, `Policy ${action.capability}: ${result.response.status} ${result.json?.error || ""}`);
}

async function createPlan(token, action, requestKey = crypto.randomUUID()) {
  const result = await api("/api/panel/lumenite/plan", token, {
    method: "POST",
    headers: { "Idempotency-Key": requestKey },
    body: JSON.stringify({
      agent: "growth",
      instruction: action.instruction,
      source: "api",
      context: {
        suggestedAction: {
          capability: action.capability,
          input: action.input,
          reason: "Prueba integral autenticada de Action OS.",
          expectedResult: "Un recurso interno verificado y reversible.",
        },
      },
    }),
  });
  return { ...result, requestKey };
}

async function readOne(table, id) {
  const { data, error } = await admin
    .from(table)
    .select("id,business_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function assertAudit(action, targetId) {
  const { data, error } = await admin
    .from("lumenai_audit_log")
    .select("id")
    .eq("business_id", businessId)
    .eq("action", action)
    .eq("target_id", targetId)
    .limit(1);
  if (error) throw error;
  assert(data?.length === 1, `Missing audit ${action} for ${targetId}.`);
}

async function runAction(token, action) {
  const planned = await createPlan(token, action);
  assert(planned.response.status === 200, `Plan ${action.capability}: ${planned.response.status} ${planned.json?.error || ""}`);
  assert(planned.json.runs?.length === 1, `${action.capability} did not create one run.`);
  assert(planned.json.runs[0].capability === action.capability, `${action.capability} was replaced by another capability.`);
  assert(planned.json.runs[0].status === "awaiting_approval", `${action.capability} bypassed approval.`);
  assert(planned.json.dryRun?.length === 1, `${action.capability} did not return a simulation.`);

  const duplicatePlan = await createPlan(token, action, planned.requestKey);
  assert(duplicatePlan.response.status === 200, `Duplicate plan ${action.capability} failed.`);
  assert(duplicatePlan.json.deduplicated === true, `${action.capability} plan was not deduplicated.`);
  assert(duplicatePlan.json.planId === planned.json.planId, `${action.capability} duplicate changed plan ID.`);
  assert(duplicatePlan.json.runs[0].id === planned.json.runs[0].id, `${action.capability} duplicate changed run ID.`);

  const runId = planned.json.runs[0].id;
  const unapproved = await api("/api/panel/lumenite/execute", token, {
    method: "POST",
    body: JSON.stringify({ runId }),
  });
  assert(unapproved.response.status === 409, `${action.capability} executed without explicit approval.`);

  const executed = await api("/api/panel/lumenite/execute", token, {
    method: "POST",
    body: JSON.stringify({ runId, approve: true }),
  });
  assert(executed.response.status === 200, `Execute ${action.capability}: ${executed.response.status} ${executed.json?.error || ""}`);
  assert(executed.json.run.status === "undo_available", `${action.capability} did not expose undo.`);
  assert(executed.json.receipt?.verification?.verified === true, `${action.capability} was not verified.`);
  assert(executed.json.receipt?.resource?.id, `${action.capability} receipt has no resource ID.`);
  assert(executed.json.receipt?.auditId === runId, `${action.capability} receipt is not tied to its run.`);
  const resourceId = executed.json.receipt.resource.id;
  assert(await readOne(action.table, resourceId), `${action.capability} resource does not exist in its tenant.`);
  await assertAudit("lumenite.plan.created", planned.json.planId);
  await assertAudit("lumenite.action.completed", runId);

  const duplicateExecution = await api("/api/panel/lumenite/execute", token, {
    method: "POST",
    body: JSON.stringify({ runId, approve: true }),
  });
  assert(duplicateExecution.response.status === 200, `Duplicate execute ${action.capability} failed.`);
  assert(duplicateExecution.json.deduplicated === true, `${action.capability} execution was not deduplicated.`);
  assert(duplicateExecution.json.receipt?.resource?.id === resourceId, `${action.capability} duplicate created another resource.`);

  const rolledBack = await api("/api/panel/lumenite/rollback", token, {
    method: "POST",
    body: JSON.stringify({ runId }),
  });
  assert(rolledBack.response.status === 200, `Undo ${action.capability}: ${rolledBack.response.status} ${rolledBack.json?.error || ""}`);
  assert(rolledBack.json.run.status === "reverted", `${action.capability} was not reverted.`);
  assert(rolledBack.json.verification?.verified === true, `${action.capability} undo was not verified.`);
  assert(!(await readOne(action.table, resourceId)), `${action.capability} resource survived undo.`);
  await assertAudit("lumenite.action.reverted", runId);

  const duplicateUndo = await api("/api/panel/lumenite/rollback", token, {
    method: "POST",
    body: JSON.stringify({ runId }),
  });
  assert(duplicateUndo.response.status === 200 && duplicateUndo.json.deduplicated === true, `${action.capability} undo is not idempotent.`);
  console.log(`PASS ${action.capability}: plan, simulate, approve, execute, verify, receipt, audit, idempotency and undo`);
}

async function cleanup() {
  if (businessId) await admin.from("businesses").delete().eq("id", businessId);
  if (userId) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

try {
  const email = `lumenai-actions-${suffix}@example.test`;
  const createdUser = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test_fixture: "lumenite_actions" },
  });
  if (createdUser.error || !createdUser.data.user) throw createdUser.error || new Error("Test user was not created.");
  userId = createdUser.data.user.id;

  const business = await admin
    .from("businesses")
    .insert({
      name: "LumenAI Action Verification",
      owner_id: userId,
      user_id: userId,
      created_by: userId,
      public_key: `actions-${suffix}`,
      metadata: { test_fixture: true },
    })
    .select("id")
    .single();
  if (business.error || !business.data?.id) throw business.error || new Error("Test business was not created.");
  businessId = business.data.id;

  const profile = await admin.from("profiles").upsert({
    id: userId,
    business_id: businessId,
    active_business_id: businessId,
    metadata: { display_name: "Action Owner" },
  });
  if (profile.error) throw profile.error;

  const chat = await admin
    .from("chats")
    .insert({ business_id: businessId, title: "Action OS conversation", channel: "widget", visitor_id: `visitor-${suffix}` })
    .select("id")
    .single();
  if (chat.error || !chat.data?.id) throw chat.error || new Error("Fixture chat was not created.");
  const lead = await admin
    .from("leads")
    .insert({ business_id: businessId, chat_id: chat.data.id, name: "Action OS Lead", email: `lead-${suffix}@example.test` })
    .select("id")
    .single();
  if (lead.error || !lead.data?.id) throw lead.error || new Error("Fixture lead was not created.");

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = await authClient.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session?.access_token) throw session.error || new Error("Test session was not created.");
  const token = session.data.session.access_token;

  const actions = [
    {
      capability: "internal.task.create",
      resourceType: "task",
      table: "lumenai_followup_tasks",
      instruction: "Crea una tarea interna de seguimiento",
      input: { title: "Revisar cuenta", description: "Seguimiento Action OS", dueAt: null, priority: "high", leadId: lead.data.id, conversationId: null },
    },
    {
      capability: "internal.lead.note.add",
      resourceType: "lead_note",
      table: "lumenai_lead_notes",
      instruction: "Añade una nota al lead",
      input: { leadId: lead.data.id, content: "El lead solicita una demostracion esta semana." },
    },
    {
      capability: "internal.response.prepare",
      resourceType: "response_draft",
      table: "lumenai_response_drafts",
      instruction: "Prepara un borrador de respuesta",
      input: { conversationId: chat.data.id, content: "Gracias por escribirnos. Podemos coordinar una demostracion.", channel: "chat" },
    },
    {
      capability: "internal.conversation.tag",
      resourceType: "conversation_tag",
      table: "lumenai_conversation_tags",
      instruction: "Etiqueta la conversacion",
      input: { conversationId: chat.data.id, tag: `demo-${suffix.slice(-6)}`, color: "#22c55e" },
    },
    {
      capability: "internal.reminder.create",
      resourceType: "reminder",
      table: "lumenai_reminders",
      instruction: "Crea un recordatorio interno",
      input: { title: "Contactar al lead", note: "Confirmar disponibilidad", remindAt: new Date(Date.now() + 86_400_000).toISOString(), resourceType: "lead", resourceId: lead.data.id },
    },
  ];

  for (const action of actions) await createPolicy(token, action);
  for (const action of actions) await runAction(token, action);

  const cancelledPlan = await createPlan(token, actions[0]);
  assert(cancelledPlan.response.status === 200 && cancelledPlan.json.runs?.[0], "Cancellation fixture plan failed.");
  const cancelledRunId = cancelledPlan.json.runs[0].id;
  const cancelled = await api("/api/panel/lumenite/action-runs", token, {
    method: "PATCH",
    body: JSON.stringify({ runId: cancelledRunId, decision: "cancel", reason: "E2E cancellation verification" }),
  });
  assert(cancelled.response.status === 200 && cancelled.json.run.status === "cancelled", "Pending run was not cancelled.");
  const { data: cancelledApproval } = await admin
    .from("lumenai_action_approvals")
    .select("decision")
    .eq("action_run_id", cancelledRunId)
    .single();
  assert(cancelledApproval?.decision === "expired", "Cancellation left a pending approval behind.");
  const cancelledExecution = await api("/api/panel/lumenite/execute", token, {
    method: "POST",
    body: JSON.stringify({ runId: cancelledRunId, approve: true }),
  });
  assert(cancelledExecution.response.status === 409, "Cancelled run was executable.");
  await assertAudit("lumenite.action.cancelled", cancelledRunId);
  console.log("PASS cancellation closes the run and its pending approval");

  const failedPlan = await createPlan(token, actions[1]);
  assert(failedPlan.response.status === 200 && failedPlan.json.runs?.[0], "Failure fixture plan failed.");
  const failedRunId = failedPlan.json.runs[0].id;
  const removedLead = await admin
    .from("leads")
    .delete()
    .eq("id", lead.data.id)
    .eq("business_id", businessId);
  if (removedLead.error) throw removedLead.error;
  const failed = await api("/api/panel/lumenite/execute", token, {
    method: "POST",
    body: JSON.stringify({ runId: failedRunId, approve: true }),
  });
  assert(failed.response.status === 404, `Missing tenant resource returned ${failed.response.status}.`);
  const { data: failedRun } = await admin
    .from("lumenai_action_runs")
    .select("status,error_code,receipt")
    .eq("id", failedRunId)
    .single();
  assert(failedRun?.status === "failed", "Pre-mutation failure was not persisted as failed.");
  assert(failedRun?.error_code === "RESOURCE_NOT_FOUND", "Failure code was not preserved.");
  assert(!failedRun?.receipt || Object.keys(failedRun.receipt).length === 0, "A failed mutation produced a success receipt.");
  await assertAudit("lumenite.action.failed", failedRunId);
  console.log("PASS invalid tenant resource fails before mutation with audit evidence");

  const { count: fixtureBusinesses } = await admin
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("metadata->>test_fixture", "true");
  assert((fixtureBusinesses ?? 0) >= 1, "Fixture disappeared before cleanup verification.");
} finally {
  await cleanup();
}

const { count: remainingBusinesses } = await admin
  .from("businesses")
  .select("id", { count: "exact", head: true })
  .eq("metadata->>test_fixture", "true")
  .eq("name", "LumenAI Action Verification");
assert(remainingBusinesses === 0, "Action test business cleanup failed.");
console.log("PASS fixture cleanup left no action-test business");
