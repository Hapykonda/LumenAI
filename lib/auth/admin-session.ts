import "server-only";

import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "lmn_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AdminSession = {
  userId: string;
  businessId: string;
  expiresAt: number;
};

function requiredAdminEnv() {
  const accessCode = process.env.LUMENAI_ADMIN_ACCESS_CODE?.trim();
  const sessionSecret = process.env.LUMENAI_ADMIN_SESSION_SECRET?.trim();
  const userId = process.env.LUMENAI_ADMIN_USER_ID?.trim();
  const businessId = process.env.LUMENAI_ADMIN_BUSINESS_ID?.trim();

  if (!accessCode || !sessionSecret || !userId || !businessId) return null;
  return { accessCode, sessionSecret, userId, businessId };
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function isAdminAccessConfigured() {
  return Boolean(requiredAdminEnv());
}

export async function matchesAdminAccessCode(candidate: string) {
  const config = requiredAdminEnv();
  if (!config || !candidate) return false;
  return constantTimeEqual(await digest(candidate), await digest(config.accessCode));
}

export async function createAdminSession() {
  const config = requiredAdminEnv();
  if (!config) throw new Error("El acceso administrativo no está configurado.");

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = `${config.userId}.${config.businessId}.${expiresAt}`;
  const signature = toBase64Url(await hmac(payload, config.sessionSecret));
  return `${payload}.${signature}`;
}

export async function verifyAdminSession(rawValue?: string | null): Promise<AdminSession | null> {
  const config = requiredAdminEnv();
  if (!config || !rawValue) return null;

  const parts = rawValue.split(".");
  if (parts.length !== 4) return null;
  const [userId, businessId, expiresRaw, suppliedSignature] = parts;
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  if (userId !== config.userId || businessId !== config.businessId) return null;

  const payload = `${userId}.${businessId}.${expiresAt}`;
  const expectedSignature = toBase64Url(await hmac(payload, config.sessionSecret));
  const valid = constantTimeEqual(
    new TextEncoder().encode(suppliedSignature),
    new TextEncoder().encode(expectedSignature),
  );

  return valid ? { userId, businessId, expiresAt } : null;
}

export async function getAdminSessionFromRequest(request?: Request) {
  if (request) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const value = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
      ?.slice(ADMIN_SESSION_COOKIE.length + 1);
    return verifyAdminSession(value ? decodeURIComponent(value) : null);
  }

  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: ADMIN_SESSION_TTL_SECONDS,
  path: "/",
};
