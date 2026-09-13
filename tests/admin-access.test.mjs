import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("private admin access keeps the code server-side and signs an expiring session", async () => {
  const session = await source("lib/auth/admin-session.ts");
  assert.match(session, /import "server-only"/);
  assert.match(session, /process\.env\.LUMENAI_ADMIN_ACCESS_CODE/);
  assert.match(session, /crypto\.subtle\.sign\("HMAC"/);
  assert.match(session, /expiresAt <= Math\.floor\(Date\.now\(\) \/ 1000\)/);
  assert.match(session, /httpOnly:\s*true/);
  assert.match(session, /sameSite:\s*"strict"/);
  assert.match(session, /secure:\s*process\.env\.NODE_ENV === "production"/);
});

test("the panel accepts only a verified admin cookie and binds it to one workspace", async () => {
  const proxy = await source("proxy.ts");
  const context = await source("lib/auth/business-context.ts");
  assert.match(proxy, /await verifyAdminSession/);
  assert.doesNotMatch(proxy, /request\.cookies\.has\(ADMIN_SESSION_COOKIE\)/);
  assert.match(context, /getAdminSessionFromRequest/);
  assert.match(context, /requestedBusinessId !== adminContext\.businessId/);
  assert.match(context, /\.eq\("business_id", session\.businessId\)/);
  assert.match(context, /\.eq\("user_id", session\.userId\)/);
  assert.match(context, /accessMode:\s*"private-admin"/);
});

test("the admin entry validates a POSTed secret and never renders it", async () => {
  const route = await source("app/api/admin/session/route.ts");
  const page = await source("app/admin/page.tsx");
  assert.match(route, /export async function POST/);
  assert.match(route, /matchesAdminAccessCode\(accessCode\)/);
  assert.doesNotMatch(page, /LUMENAI_ADMIN_ACCESS_CODE|sessionSecret/);
  assert.match(page, /type="password"/);
  assert.match(page, /action="\/api\/admin\/session"/);
});
