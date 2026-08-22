import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  LUMENITE_ACTION_STATUSES,
  LUMENITE_PHASE_ONE_CAPABILITIES,
  authorizeAction,
  canCancelStatus,
  canUndoStatus,
  defaultAgentPolicy,
  stableSerialize,
} from "../lib/ai/lumenite/core.ts";

const root = new URL("../", import.meta.url);

function ownerPolicy(overrides = {}) {
  return {
    ...defaultAgentPolicy({
      businessId: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      role: "owner",
      capability: "internal.task.create",
    }),
    ...overrides,
  };
}

test("Phase 1 exposes exactly the five internal capabilities", () => {
  assert.deepEqual(LUMENITE_PHASE_ONE_CAPABILITIES, [
    "internal.task.create",
    "internal.lead.note.add",
    "internal.response.prepare",
    "internal.conversation.tag",
    "internal.reminder.create",
  ]);
});

test("the conservative owner policy requires explicit approval", () => {
  const decision = authorizeAction({
    policy: ownerPolicy(),
    approvalMode: "policy",
    riskLevel: "low",
    accessType: "create",
    supportsUndo: true,
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.canExecute, true);
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.initialStatus, "awaiting_approval");
});

test("autonomy levels 0, 1 and 2 remain non-executing", () => {
  const expected = [
    { level: 0, allowed: false, canExecute: false, code: "OBSERVER_ONLY" },
    { level: 1, allowed: true, canExecute: false, code: "ADVISOR_ONLY" },
    { level: 2, allowed: true, canExecute: false, code: "PREPARATION_ONLY" },
  ];
  for (const item of expected) {
    const decision = authorizeAction({
      policy: ownerPolicy({ autonomyLevel: item.level }),
      approvalMode: "policy",
      riskLevel: "low",
      accessType: "create",
      supportsUndo: true,
    });
    assert.equal(decision.allowed, item.allowed);
    assert.equal(decision.canExecute, item.canExecute);
    assert.equal(decision.reasonCode, item.code);
  }
});

test("limited autonomy can approve only when explicitly configured", () => {
  const decision = authorizeAction({
    policy: ownerPolicy({ autonomyLevel: 4, requiresApproval: false, allowsAutoExecute: true }),
    approvalMode: "policy",
    riskLevel: "low",
    accessType: "create",
    supportsUndo: true,
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.requiresApproval, false);
  assert.equal(decision.initialStatus, "approved");
});

test("high risk remains approval-gated at level 4", () => {
  const decision = authorizeAction({
    policy: ownerPolicy({ autonomyLevel: 4, requiresApproval: false, allowsAutoExecute: true }),
    approvalMode: "reinforced",
    riskLevel: "high",
    accessType: "create",
    supportsUndo: false,
  });
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.initialStatus, "awaiting_approval");
});

test("expired and out-of-hours policies fail closed", () => {
  const expired = authorizeAction({
    policy: ownerPolicy({ expiresAt: "2025-01-01T00:00:00.000Z" }),
    approvalMode: "policy",
    riskLevel: "low",
    accessType: "create",
    supportsUndo: true,
    now: new Date("2026-08-09T10:00:00.000Z"),
  });
  assert.equal(expired.allowed, false);
  assert.equal(expired.reasonCode, "POLICY_EXPIRED");

  const outsideHours = authorizeAction({
    policy: ownerPolicy({
      allowedHours: { days: [1], start: "09:00", end: "10:00", timezone: "UTC" },
    }),
    approvalMode: "policy",
    riskLevel: "low",
    accessType: "create",
    supportsUndo: true,
    now: new Date("2026-08-09T15:00:00.000Z"),
  });
  assert.equal(outsideHours.allowed, false);
  assert.equal(outsideHours.reasonCode, "OUTSIDE_ALLOWED_HOURS");
});

test("overnight permission windows are evaluated in their configured timezone", () => {
  const decision = authorizeAction({
    policy: ownerPolicy({
      allowedHours: { days: [0], start: "22:00", end: "06:00", timezone: "UTC" },
    }),
    approvalMode: "policy",
    riskLevel: "low",
    accessType: "create",
    supportsUndo: true,
    now: new Date("2026-08-09T23:30:00.000Z"),
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.initialStatus, "awaiting_approval");
});

test("stable serialization produces deterministic idempotency material", () => {
  assert.equal(
    stableSerialize({ capability: "task", input: { priority: "high", title: "Follow up" } }),
    stableSerialize({ input: { title: "Follow up", priority: "high" }, capability: "task" }),
  );
});

test("only pre-execution states can be cancelled and only undo_available can revert", () => {
  assert.equal(canCancelStatus("awaiting_approval"), true);
  assert.equal(canCancelStatus("executing"), false);
  assert.equal(canUndoStatus("undo_available"), true);
  assert.equal(canUndoStatus("completed"), false);
  assert.equal(LUMENITE_ACTION_STATUSES.includes("reverted"), true);
});

test("post-mutation verification and execution failures remain visibly partial", async () => {
  const engine = await readFile(new URL("lib/ai/lumenite/action-engine.ts", root), "utf8");
  assert.equal(LUMENITE_ACTION_STATUSES.includes("partially_completed"), true);
  assert.match(
    engine,
    /verification\.verified[\s\S]*?"partially_completed"/,
    "An unverified mutation must remain partially completed.",
  );
  assert.match(
    engine,
    /status:\s*actionApplied\s*\?\s*"partially_completed"\s*:\s*"failed"/,
    "An exception after applying data must not be reported as a clean failure.",
  );
});

test("server execution accepts a persisted run id, not an arbitrary action name", async () => {
  const route = await readFile(new URL("app/api/panel/lumenite/execute/route.ts", root), "utf8");
  assert.match(route, /body\.runId/);
  assert.doesNotMatch(route, /action_name/);
  assert.doesNotMatch(route, /rawAction/);
});

test("migration enforces tenant RLS and a unique idempotency key", async () => {
  const migration = await readFile(
    new URL("supabase/migrations/20260809044217_lumenite_action_os_foundation.sql", root),
    "utf8",
  );
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /lumenai_business_members/i);
  assert.match(migration, /lumenai_action_runs_idempotency_uidx/i);
  assert.match(migration, /for select using/i);
  assert.doesNotMatch(migration, /security definer/i);
});

test("published business knowledge is callable only from the server role", async () => {
  const migration = await readFile(
    new URL("supabase/migrations/20260809055032_harden_business_knowledge_function.sql", root),
    "utf8",
  );
  assert.match(
    migration,
    /revoke execute on function public\.get_business_kb_text\(uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.get_business_kb_text\(uuid\)[\s\S]*to service_role/i,
  );
});
