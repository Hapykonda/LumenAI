import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the server context authenticates and validates an active membership", async () => {
  const code = await source("lib/auth/business-context.ts");

  assert.match(code, /auth\.getUser/);
  assert.match(code, /active_business_id/);
  assert.match(code, /lumenai_business_members/);
  assert.match(code, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(code, /typedMembership\.status !== "active"/);
  assert.match(code, /requestedBusinessId !== businessId/);
  assert.match(code, /"BUSINESS_MISMATCH"/);
});

test("the context exposes every required typed authorization error", async () => {
  const code = await source("lib/auth/business-context.ts");
  const required = [
    "UNAUTHENTICATED",
    "BUSINESS_NOT_SELECTED",
    "MEMBERSHIP_REQUIRED",
    "BUSINESS_MISMATCH",
    "PERMISSION_DENIED",
    "RESOURCE_NOT_FOUND",
    "MEMBERSHIP_INACTIVE",
  ];

  for (const errorCode of required) {
    assert.match(code, new RegExp(`"${errorCode}"`));
  }
});

test("panel authorization does not fall back to metadata or a first business", async () => {
  const guardedFiles = [
    "lib/auth/business-context.ts",
    "lib/supabase/lumen/requireBusiness.ts",
    "lib/supabase/lumen/getActiveBusinessClient.ts",
    "app/api/panel/calibration/_lib.ts",
    "app/api/panel/calibration/_lib/sb.ts",
    "app/api/panel/leads/route.ts",
    "app/api/panel/chat/route.ts",
    "app/api/panel/chats/route.ts",
    "app/api/panel/chat/messages/route.ts",
    "app/api/panel/chats/[id]/read/route.ts",
    "app/api/panel/overview/route.ts",
    "app/api/panel/widget/route.ts",
    "app/api/panel/widget/asset/route.ts",
  ];

  for (const file of guardedFiles) {
    const code = await source(file);
    assert.doesNotMatch(code, /user_metadata\s*\?\?|user_metadata\.business/i, file);
    assert.doesNotMatch(code, /readFirstBusinessFallback|readOwnedBusiness|resolveBusinessId/, file);
    assert.doesNotMatch(code, /\.from\("businesses"\)[\s\S]{0,180}\.limit\(1\)/, file);
  }
});

test("client business ids can only be used as mismatch assertions", async () => {
  const chat = await source("app/api/panel/chat/route.ts");

  assert.match(chat, /requestedBusinessId: businessIdFromBody/);
  assert.doesNotMatch(chat, /businessId\s*=\s*businessIdFromBody/);
  assert.doesNotMatch(chat, /business_id:\s*body\??\./);
});

