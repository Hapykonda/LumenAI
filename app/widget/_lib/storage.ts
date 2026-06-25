import { safeRandomId } from "./utils";

function lsKeyVisitor(publicKey: string) {
  return `lumen_visitor_id:${publicKey}`;
}
function lsKeyChat(publicKey: string) {
  return `lumen_chat_id:${publicKey}`;
}
function lsKeyDraft(publicKey: string) {
  return `lumen_draft:${publicKey}`;
}

function normKey(publicKey: string) {
  return String(publicKey || "").trim() || "no_key";
}

export function getOrCreateVisitorId(publicKey: string): string {
  if (typeof window === "undefined") return "server";
  const pk = normKey(publicKey);
  try {
    const k = lsKeyVisitor(pk);
    const existing = localStorage.getItem(k);
    if (existing && existing.trim()) return existing;

    const newId = safeRandomId("v");
    localStorage.setItem(k, newId);
    return newId;
  } catch {
    return safeRandomId("v");
  }
}

export function getStoredChatId(publicKey: string): string | null {
  if (typeof window === "undefined") return null;
  const pk = normKey(publicKey);
  try {
    const v = localStorage.getItem(lsKeyChat(pk));
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function storeChatId(publicKey: string, chatId: string) {
  if (typeof window === "undefined") return;
  const pk = normKey(publicKey);
  try {
    localStorage.setItem(lsKeyChat(pk), chatId);
  } catch {}
}

export function clearStoredChat(publicKey: string) {
  if (typeof window === "undefined") return;
  const pk = normKey(publicKey);
  try {
    localStorage.removeItem(lsKeyChat(pk));
  } catch {}
}

export function getDraft(publicKey: string) {
  if (typeof window === "undefined") return "";
  const pk = normKey(publicKey);
  try {
    return localStorage.getItem(lsKeyDraft(pk)) ?? "";
  } catch {
    return "";
  }
}

export function setDraft(publicKey: string, value: string) {
  if (typeof window === "undefined") return;
  const pk = normKey(publicKey);
  try {
    localStorage.setItem(lsKeyDraft(pk), value);
  } catch {}
}