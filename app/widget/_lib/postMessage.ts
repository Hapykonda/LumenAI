// app/widget/_lib/postMessage.ts

function getParentOriginFromReferrer(): string | null {
  try {
    const ref = document?.referrer || "";
    if (!ref) return null;
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

function isInIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.parent && window.parent !== window;
  } catch {
    return false;
  }
}

/**
 * Envía mensajes al parent (host) cuando el widget está en iframe.
 * - Si `allowedOrigin` viene configurado, se usa (más seguro).
 * - Si no, intentamos deducir el origin desde document.referrer.
 * - Si nada existe, caemos en "*" para dev/local.
 */
export function postToParent(message: unknown, allowedOrigin?: string | null) {
  if (typeof window === "undefined") return;
  if (!isInIframe()) return; // si abres /widget directo, no spameamos postMessage

  const safeAllowed = typeof allowedOrigin === "string" && allowedOrigin.trim() ? allowedOrigin.trim() : null;
  const refOrigin = getParentOriginFromReferrer();

  const targetOrigin = safeAllowed || refOrigin || "*";

  try {
    window.parent.postMessage(message, targetOrigin);
  } catch {
    // no-op
  }
}
