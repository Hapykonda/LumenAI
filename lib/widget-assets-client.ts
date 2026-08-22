export const MAX_WIDGET_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type AssetKind = "avatar" | "logo";

type AssetResponse = {
  ok?: boolean;
  url?: string;
  path?: string;
  error?: string;
};

export function validateWidgetImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Usa una imagen PNG, JPG, WebP o GIF.";
  }

  if (file.size > MAX_WIDGET_IMAGE_SIZE) {
    return "La imagen debe pesar menos de 2 MB.";
  }

  return null;
}

export function isManagedWidgetAsset(value: unknown) {
  const url = String(value ?? "").trim();
  return url.includes("/storage/v1/object/public/lumenai-widget-assets/");
}

export async function uploadWidgetAsset(file: File, kind: AssetKind = "avatar") {
  const validation = validateWidgetImage(file);
  if (validation) throw new Error(validation);

  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);

  const response = await fetch("/api/panel/widget/asset", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const json = (await response.json().catch(() => ({}))) as AssetResponse;

  if (!response.ok || json.ok === false || !json.url) {
    throw new Error(json.error || "No se pudo subir la imagen.");
  }

  return {
    url: json.url,
    path: json.path ?? "",
  };
}

export async function deleteWidgetAsset(value: unknown) {
  if (!isManagedWidgetAsset(value)) return false;

  const response = await fetch("/api/panel/widget/asset", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: String(value) }),
    credentials: "include",
  });
  const json = (await response.json().catch(() => ({}))) as AssetResponse;

  if (!response.ok || json.ok === false) {
    throw new Error(json.error || "No se pudo eliminar la imagen anterior.");
  }

  return true;
}

export async function publishWidgetAvatar(avatarUrl: string) {
  const response = await fetch("/api/panel/widget", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarUrl }),
    credentials: "include",
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as AssetResponse;

  if (!response.ok || json.ok === false) {
    throw new Error(json.error || "No se pudo publicar la foto del perfil.");
  }

  return true;
}
