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
const password = `LumenAI-Test-${crypto.randomUUID()}!a9`;
const users = [];
const businesses = [];

function testClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createTestUser(label) {
  const email = `lumenai-auth-${label}-${suffix}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test_fixture: "lumenai_authorization" },
  });
  if (error || !data.user) throw error || new Error("Test user was not created.");
  users.push(data.user.id);
  return { id: data.user.id, email };
}

async function createBusiness(user, label) {
  const { data, error } = await admin
    .from("businesses")
    .insert({
      name: `LumenAI Authorization ${label}`,
      owner_id: user.id,
      user_id: user.id,
      created_by: user.id,
      public_key: `auth-${label}-${suffix}`,
      metadata: { test_fixture: true },
    })
    .select("id")
    .single();
  if (error || !data?.id) throw error || new Error("Test business was not created.");
  businesses.push(data.id);

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    business_id: data.id,
    active_business_id: data.id,
    metadata: { test_fixture: true },
  });
  if (profileError) throw profileError;
  return data.id;
}

async function accessToken(email) {
  const client = testClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw error || new Error("Test session was not created.");
  }
  return data.session.access_token;
}

async function api(pathname, token, init = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  if (businesses.length) {
    await admin.from("businesses").delete().in("id", businesses);
  }
  if (users.length) {
    await admin.from("profiles").delete().in("id", users);
    for (const userId of users) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

try {
  const userA = await createTestUser("a");
  const userB = await createTestUser("b");
  const userWithoutMembership = await createTestUser("none");
  const businessA = await createBusiness(userA, "A");
  const businessB = await createBusiness(userB, "B");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userWithoutMembership.id,
    business_id: businessA,
    active_business_id: businessA,
    metadata: { test_fixture: true },
  });
  if (profileError) throw profileError;

  const [tokenA, tokenB, tokenWithoutMembership] = await Promise.all([
    accessToken(userA.email),
    accessToken(userB.email),
    accessToken(userWithoutMembership.email),
  ]);

  const overviewA = await api("/api/panel/overview", tokenA);
  const overviewAJson = await overviewA.json();
  assert(overviewA.status === 200, `Owner A overview returned ${overviewA.status}.`);
  assert(overviewAJson.business?.id === businessA, "Owner A received the wrong business.");
  const commandMetrics = overviewAJson.commandCenter?.metrics || [];
  assert(
    commandMetrics.map((metric) => metric.key).join(",") ===
      "health,alerts,approvals,lumenite,pulse,opportunities,conversations,leads,activity,coverage",
    "Overview command center priority order is incomplete.",
  );
  for (const metric of commandMetrics) {
    assert(metric.value !== undefined, `${metric.key} has no value.`);
    assert(metric.meaning, `${metric.key} has no meaning.`);
    assert(metric.source, `${metric.key} has no source.`);
    assert(metric.period, `${metric.key} has no period.`);
    assert(metric.updatedAt, `${metric.key} has no update time.`);
    assert(metric.comparison, `${metric.key} has no comparison.`);
    assert(metric.state, `${metric.key} has no state.`);
    assert(metric.href && metric.actionLabel, `${metric.key} has no related action.`);
  }

  const overviewB = await api("/api/panel/overview", tokenB);
  const overviewBJson = await overviewB.json();
  assert(overviewB.status === 200, `Owner B overview returned ${overviewB.status}.`);
  assert(overviewBJson.business?.id === businessB, "Owner B received the wrong business.");

  const mismatch = await api("/api/panel/chat", tokenA, {
    method: "POST",
    body: JSON.stringify({
      chatId: crypto.randomUUID(),
      message: "Authorization mismatch test",
      businessId: businessB,
    }),
  });
  const mismatchJson = await mismatch.json();
  assert(mismatch.status === 409, `Business mismatch returned ${mismatch.status}.`);
  assert(mismatchJson.code === "BUSINESS_MISMATCH", "Mismatch did not return its typed code.");

  const noMembership = await api("/api/panel/overview", tokenWithoutMembership);
  const noMembershipJson = await noMembership.json();
  assert(noMembership.status === 403, `Missing membership returned ${noMembership.status}.`);
  assert(
    noMembershipJson.code === "MEMBERSHIP_REQUIRED",
    "Missing membership did not return its typed code.",
  );

  const unauthenticated = await api("/api/panel/overview", null);
  const unauthenticatedJson = await unauthenticated.json();
  assert(unauthenticated.status === 401, `Unauthenticated request returned ${unauthenticated.status}.`);
  assert(
    unauthenticatedJson.code === "UNAUTHENTICATED",
    "Unauthenticated request did not return its typed code.",
  );

  console.log("PASS authenticated owner A is isolated to business A");
  console.log("PASS authenticated owner B is isolated to business B");
  console.log("PASS command center order and metric provenance contract");
  console.log("PASS client business mismatch is rejected with BUSINESS_MISMATCH");
  console.log("PASS missing membership is rejected with MEMBERSHIP_REQUIRED");
  console.log("PASS unauthenticated access is rejected with UNAUTHENTICATED");
} finally {
  await cleanup();
}
