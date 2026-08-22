import type { AuthorizedBusinessContext } from "@/lib/auth/business-context";
import { getAuthorizedBusinessContext } from "@/lib/auth/business-context";
import {
  isRecord,
  OWNER_PROFILE_BUCKET,
  ownerProfileAvatarEndpoint,
  ownerProfileFromMetadata,
} from "@/lib/owner-profile";

export async function requireProfileContext(request: Request) {
  return getAuthorizedBusinessContext({ request });
}

export function managedOwnerAvatarPath(
  metadataValue: unknown,
  context: Pick<AuthorizedBusinessContext, "businessId" | "userId">,
) {
  const metadata = isRecord(metadataValue) ? metadataValue : {};
  const expectedPrefix = `${context.businessId}/${context.userId}/`;
  const storedPath = String(metadata.avatar_path ?? "").replaceAll("\\", "/");

  if (
    storedPath.startsWith(expectedPrefix) &&
    !storedPath.includes("../") &&
    !storedPath.includes("/..")
  ) {
    return storedPath;
  }

  const legacyUrl = String(metadata.avatar_url ?? "").trim();
  try {
    const parsed = new URL(legacyUrl);
    const marker = `/storage/v1/object/public/${OWNER_PROFILE_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const legacyPath = decodeURIComponent(
      parsed.pathname.slice(markerIndex + marker.length),
    ).replaceAll("\\", "/");
    if (
      legacyPath.startsWith(`${context.userId}/`) &&
      !legacyPath.includes("../") &&
      !legacyPath.includes("/..")
    ) {
      return legacyPath;
    }
  } catch {
    return null;
  }

  return null;
}

export async function readOwnerProfile(context: AuthorizedBusinessContext) {
  const { data, error } = await context.admin
    .from("profiles")
    .select("id,role,metadata,updated_at")
    .eq("id", context.userId)
    .maybeSingle();

  if (error || !data) throw error ?? new Error("profile_not_found");

  const path = managedOwnerAvatarPath(data.metadata, context);
  return {
    row: data,
    path,
    profile: ownerProfileFromMetadata({
      metadata: data.metadata,
      role: data.role,
      email: context.user.email,
      authMetadata: context.user.user_metadata,
      ...(path
        ? { avatarUrl: ownerProfileAvatarEndpoint(data.updated_at) }
        : {}),
    }),
  };
}

export function safeProfileError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.toLowerCase();

  if (message.includes("jwt") || message.includes("token")) {
    return "La sesion ya no es valida. Vuelve a iniciar sesion.";
  }
  if (message.includes("permission") || message.includes("policy")) {
    return "No tienes permisos para modificar este perfil.";
  }
  return fallback;
}
