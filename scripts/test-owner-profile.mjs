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
if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Supabase profile test environment is incomplete.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = "lumenai-profile-assets";
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `LumenAI-Profile-${crypto.randomUUID()}!a9`;
const userIds = [];
const businessIds = [];
const storagePaths = new Set();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const email = `lumenai-profile-${label}-${suffix}@example.test`;
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test_fixture: "lumenai_owner_profile" },
  });
  if (result.error || !result.data.user) throw result.error || new Error("User creation failed.");
  userIds.push(result.data.user.id);
  return { id: result.data.user.id, email };
}

async function createBusiness(user, label) {
  const result = await admin
    .from("businesses")
    .insert({
      name: `LumenAI Profile ${label}`,
      owner_id: user.id,
      user_id: user.id,
      created_by: user.id,
      public_key: `profile-${label}-${suffix}`,
      metadata: { test_fixture: true },
    })
    .select("id")
    .single();
  if (result.error || !result.data?.id) throw result.error || new Error("Business creation failed.");
  businessIds.push(result.data.id);

  const profile = await admin.from("profiles").upsert({
    id: user.id,
    business_id: result.data.id,
    active_business_id: result.data.id,
    metadata: { test_fixture: true },
  });
  if (profile.error) throw profile.error;
  return result.data.id;
}

async function signIn(user) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.signInWithPassword({ email: user.email, password });
  if (result.error || !result.data.session?.access_token) {
    throw result.error || new Error("Sign in failed.");
  }
  return { client, token: result.data.session.access_token };
}

async function api(pathname, token, init = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

function avatarForm(content = png, type = "image/png", name = "avatar.png") {
  const form = new FormData();
  form.set("file", new File([content], name, { type }));
  return form;
}

async function cleanup() {
  const paths = [...storagePaths];
  if (paths.length) await admin.storage.from(bucket).remove(paths);
  if (businessIds.length) await admin.from("businesses").delete().in("id", businessIds);
  if (userIds.length) {
    await admin.from("profiles").delete().in("id", userIds);
    for (const userId of userIds) await admin.auth.admin.deleteUser(userId);
  }
}

try {
  const [userA, userB] = await Promise.all([createUser("a"), createUser("b")]);
  const [businessA, businessB] = await Promise.all([
    createBusiness(userA, "A"),
    createBusiness(userB, "B"),
  ]);
  const [authA, authB] = await Promise.all([signIn(userA), signIn(userB)]);

  const bucketResult = await admin.storage.getBucket(bucket);
  assert(!bucketResult.error, "The owner profile bucket does not exist.");
  assert(bucketResult.data.public === false, "The owner profile bucket is public.");
  assert(bucketResult.data.file_size_limit === 2 * 1024 * 1024, "The bucket size limit is incorrect.");

  const directPath = `${businessA}/${userA.id}/rls-${suffix}.png`;
  storagePaths.add(directPath);
  const insert = await authA.client.storage.from(bucket).upload(directPath, png, {
    contentType: "image/png",
    upsert: false,
  });
  assert(!insert.error, `Owner insert failed: ${insert.error?.message}`);

  const select = await authA.client.storage.from(bucket).download(directPath);
  assert(!select.error && select.data?.size, "Owner select/download failed.");

  const crossTenant = await authB.client.storage.from(bucket).download(directPath);
  assert(crossTenant.error || !crossTenant.data, "Tenant B downloaded tenant A's avatar.");

  const crossBusinessPath = `${businessB}/${userA.id}/forbidden.png`;
  const crossBusinessInsert = await authA.client.storage
    .from(bucket)
    .upload(crossBusinessPath, png, { contentType: "image/png" });
  assert(crossBusinessInsert.error, "Owner A inserted into business B.");

  const crossUserPath = `${businessA}/${userB.id}/forbidden.png`;
  const crossUserInsert = await authA.client.storage
    .from(bucket)
    .upload(crossUserPath, png, { contentType: "image/png" });
  assert(crossUserInsert.error, "Owner A inserted into user B's folder.");

  const upsert = await authA.client.storage.from(bucket).upload(directPath, png, {
    contentType: "image/png",
    upsert: true,
  });
  assert(!upsert.error, `Owner update/upsert failed: ${upsert.error?.message}`);

  const remove = await authA.client.storage.from(bucket).remove([directPath]);
  assert(!remove.error, `Owner delete failed: ${remove.error?.message}`);
  storagePaths.delete(directPath);

  const unauthenticated = await api("/api/panel/profile/avatar", null);
  assert(unauthenticated.status === 401, `Unauthenticated avatar returned ${unauthenticated.status}.`);

  const spoofed = await api("/api/panel/profile/avatar", authA.token, {
    method: "POST",
    body: avatarForm(Buffer.from("not-an-image")),
  });
  assert(spoofed.status === 415, `Spoofed image returned ${spoofed.status}.`);

  const firstUpload = await api("/api/panel/profile/avatar", authA.token, {
    method: "POST",
    body: avatarForm(),
  });
  const firstJson = await firstUpload.json();
  assert(firstUpload.status === 200, `Profile upload returned ${firstUpload.status}.`);
  assert(firstJson.profile?.avatarUrl?.startsWith("/api/panel/profile/avatar?v="), "Private avatar URL is missing.");

  const firstProfile = await admin.from("profiles").select("metadata").eq("id", userA.id).single();
  const firstPath = firstProfile.data?.metadata?.avatar_path;
  assert(String(firstPath).startsWith(`${businessA}/${userA.id}/`), "Avatar path is not business/user scoped.");
  storagePaths.add(firstPath);

  const binary = await api("/api/panel/profile/avatar", authA.token);
  assert(binary.status === 200, `Authenticated avatar read returned ${binary.status}.`);
  assert(binary.headers.get("cache-control")?.includes("private"), "Avatar response is not privately cached.");
  assert(binary.headers.get("x-content-type-options") === "nosniff", "Avatar response allows MIME sniffing.");

  const secondUpload = await api("/api/panel/profile/avatar", authA.token, {
    method: "POST",
    body: avatarForm(),
  });
  assert(secondUpload.status === 200, `Profile replacement returned ${secondUpload.status}.`);
  const secondProfile = await admin.from("profiles").select("metadata").eq("id", userA.id).single();
  const secondPath = secondProfile.data?.metadata?.avatar_path;
  storagePaths.add(secondPath);
  assert(secondPath !== firstPath, "Profile replacement did not create a fresh object version.");
  const oldObject = await admin.storage.from(bucket).download(firstPath);
  assert(oldObject.error || !oldObject.data, "Replaced avatar object was not removed.");
  storagePaths.delete(firstPath);

  const deleted = await api("/api/panel/profile/avatar", authA.token, { method: "DELETE" });
  const deletedJson = await deleted.json();
  assert(deleted.status === 200, `Profile delete returned ${deleted.status}.`);
  assert(!deletedJson.profile?.avatarUrl, "Deleted avatar still appears in the profile.");
  storagePaths.delete(secondPath);
  const missingBinary = await api("/api/panel/profile/avatar", authA.token);
  assert(missingBinary.status === 404, `Deleted avatar read returned ${missingBinary.status}.`);

  console.log("PASS private bucket configuration and limits");
  console.log("PASS Storage insert/select/update/upsert/delete for the owner");
  console.log("PASS cross-business, cross-user and cross-tenant Storage access denied");
  console.log("PASS API authentication and binary signature validation");
  console.log("PASS upload/read/replace/delete profile avatar lifecycle");
} finally {
  await cleanup();
}
