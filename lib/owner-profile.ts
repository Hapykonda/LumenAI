export type OwnerProfile = {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatarUrl: string;
  email: string;
  role: string;
};

export const EMPTY_OWNER_PROFILE: OwnerProfile = {
  displayName: "",
  jobTitle: "",
  bio: "",
  avatarUrl: "",
  email: "",
  role: "owner",
};

export const OWNER_PROFILE_EVENT = "lumenai:owner-profile-update";
export const OWNER_PROFILE_AVATAR_ENDPOINT = "/api/panel/profile/avatar";
export const OWNER_PROFILE_BUCKET = "lumenai-profile-assets";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function cleanOwnerProfileText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeOwnerAvatarUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (
    raw === OWNER_PROFILE_AVATAR_ENDPOINT ||
    raw.startsWith(`${OWNER_PROFILE_AVATAR_ENDPOINT}?`)
  ) {
    return raw;
  }

  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function hasManagedOwnerAvatar(
  metadataValue: unknown,
  context?: { businessId?: unknown; userId?: unknown },
) {
  const metadata = isRecord(metadataValue) ? metadataValue : {};
  const path = cleanOwnerProfileText(metadata.avatar_path, 500);
  const legacyUrl = cleanOwnerProfileText(metadata.avatar_url, 1000);
  const businessId = cleanOwnerProfileText(context?.businessId, 80);
  const userId = cleanOwnerProfileText(context?.userId, 80);

  if (context) {
    const currentPath = path.replaceAll("\\", "/");
    const validCurrentPath = Boolean(
      businessId &&
        userId &&
        currentPath.startsWith(`${businessId}/${userId}/`) &&
        !currentPath.includes("../") &&
        !currentPath.includes("/.."),
    );
    const validLegacyUrl = Boolean(
      userId &&
        legacyUrl.includes(`/storage/v1/object/public/${OWNER_PROFILE_BUCKET}/${userId}/`),
    );
    return validCurrentPath || validLegacyUrl;
  }

  return Boolean(
    path || legacyUrl.includes(`/storage/v1/object/public/${OWNER_PROFILE_BUCKET}/`),
  );
}

export function ownerProfileAvatarEndpoint(version: unknown) {
  const cleanVersion = cleanOwnerProfileText(version, 120);
  return cleanVersion
    ? `${OWNER_PROFILE_AVATAR_ENDPOINT}?v=${encodeURIComponent(cleanVersion)}`
    : OWNER_PROFILE_AVATAR_ENDPOINT;
}

export function ownerProfileFromMetadata(input: {
  metadata?: unknown;
  role?: unknown;
  email?: unknown;
  authMetadata?: unknown;
  avatarUrl?: unknown;
}): OwnerProfile {
  const metadata = isRecord(input.metadata) ? input.metadata : {};
  const authMetadata = isRecord(input.authMetadata) ? input.authMetadata : {};
  const hasResolvedAvatar = Object.prototype.hasOwnProperty.call(input, "avatarUrl");
  const hasAvatarOverride = Object.prototype.hasOwnProperty.call(metadata, "avatar_url");

  return {
    displayName:
      cleanOwnerProfileText(metadata.display_name, 80) ||
      cleanOwnerProfileText(authMetadata.full_name, 80) ||
      cleanOwnerProfileText(authMetadata.name, 80),
    jobTitle: cleanOwnerProfileText(metadata.job_title, 80),
    bio: cleanOwnerProfileText(metadata.bio, 240),
    avatarUrl: hasResolvedAvatar
      ? normalizeOwnerAvatarUrl(input.avatarUrl)
      : hasAvatarOverride
        ? normalizeOwnerAvatarUrl(metadata.avatar_url)
        : normalizeOwnerAvatarUrl(authMetadata.avatar_url) ||
          normalizeOwnerAvatarUrl(authMetadata.picture),
    email: cleanOwnerProfileText(input.email, 160),
    role: cleanOwnerProfileText(input.role, 40) || "owner",
  };
}
