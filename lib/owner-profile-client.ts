"use client";

import { supabase } from "@/lib/supabase/client";
import type { OwnerProfile } from "@/lib/owner-profile";

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_PROFILE_SOURCE_SIZE = 10 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function authHeaders(contentType?: string) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers();

  if (contentType) headers.set("Content-Type", contentType);
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  return headers;
}

async function profileRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const json = (await response.json().catch(() => null)) as
    | (T & { ok?: boolean; error?: string })
    | null;

  if (!response.ok || !json || json.ok === false) {
    throw new Error(json?.error || "No se pudo completar la operación del perfil.");
  }

  return json;
}

export function validateOwnerProfileImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.has(file.type)) {
    return "Usa una imagen PNG, JPG o WebP.";
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    return "La imagen no puede superar 2 MB.";
  }
  return null;
}

export function validateOwnerProfileSourceImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.has(file.type)) {
    return "Usa una imagen PNG, JPG o WebP.";
  }
  if (file.size > MAX_PROFILE_SOURCE_SIZE) {
    return "La imagen original no puede superar 10 MB.";
  }
  return null;
}

export async function getOwnerProfile() {
  const headers = await authHeaders();
  return profileRequest<{ ok: true; profile: OwnerProfile }>("/api/panel/profile", {
    headers,
  });
}

export async function updateOwnerProfile(
  profile: Pick<OwnerProfile, "displayName" | "jobTitle" | "bio">,
) {
  const headers = await authHeaders("application/json");
  return profileRequest<{ ok: true; profile: OwnerProfile }>("/api/panel/profile", {
    method: "PATCH",
    headers,
    body: JSON.stringify(profile),
  });
}

export async function uploadOwnerProfileImage(file: File) {
  const validation = validateOwnerProfileImage(file);
  if (validation) throw new Error(validation);

  const headers = await authHeaders();
  const form = new FormData();
  form.set("file", file);

  return profileRequest<{ ok: true; profile: OwnerProfile }>(
    "/api/panel/profile/avatar",
    {
      method: "POST",
      headers,
      body: form,
    },
  );
}

export async function deleteOwnerProfileImage() {
  const headers = await authHeaders("application/json");
  return profileRequest<{ ok: true; profile: OwnerProfile }>("/api/panel/profile/avatar", {
    method: "DELETE",
    headers,
    body: JSON.stringify({}),
  });
}
