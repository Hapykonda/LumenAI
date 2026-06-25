export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function safeRandomId(prefix: string) {
  const anyCrypto: any = (globalThis as any).crypto;
  return (
    (typeof anyCrypto?.randomUUID === "function" && anyCrypto.randomUUID()) ||
    `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
  );
}

export function hexToRgb(hex: string) {
  const h = String(hex || "").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full || "000000", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function normalizeWhatsAppLink(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length >= 8) return `https://wa.me/${digits}`;
  return `https://wa.me/`;
}

export function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function initials(name: string) {
  const s = String(name || "").trim();
  if (!s) return "L";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "L";
  const b = parts.length > 1 ? parts[1]?.[0] : "";
  return (a + b).toUpperCase();
}

export function isNearBottom(el: HTMLElement, thresholdPx = 140) {
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance < thresholdPx;
}

export function isProbablyMobile() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}