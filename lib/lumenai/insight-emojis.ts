import type { InsightMood, InsightSeverity, InsightType } from "@/lib/pulse-insights";

const byType: Record<InsightType, Partial<Record<InsightSeverity, string>>> = {
  widget: { success: "\u{1F310}", info: "\u{1F9E9}", warning: "\u{1F440}", critical: "\u{1F6A8}" },
  knowledge: { success: "\u{1F9E0}", info: "\u{1F4DA}", warning: "\u{1F4A1}", critical: "\u26A0\uFE0F" },
  chat: { success: "\u{1F4AC}", info: "\u{1F5E3}\uFE0F", warning: "\u{1F440}", critical: "\u{1F6A8}" },
  sales: { success: "\u{1F4C8}", info: "\u{1F9F2}", warning: "\u{1F4A1}", critical: "\u{1F6A8}" },
  lead: { success: "\u{1F4C8}", info: "\u{1F9F2}", warning: "\u{1F440}", critical: "\u{1F6A8}" },
  calibration: { success: "\u2699\uFE0F", info: "\u{1F39B}\uFE0F", warning: "\u{1F6E0}\uFE0F", critical: "\u26A0\uFE0F" },
  system: { success: "\u2705", info: "\u{1F535}", warning: "\u26A0\uFE0F", critical: "\u{1F6A8}" },
  activity: { success: "\u2728", info: "\u26A1", warning: "\u{1F440}", critical: "\u{1F534}" },
};

const byMood: Record<InsightMood, string> = {
  calm: "\u2728",
  active: "\u26A1",
  focused: "\u{1F535}",
  warning: "\u26A0\uFE0F",
  growth: "\u{1F4C8}",
  opportunity: "\u{1F4A1}",
};

export function getInsightEmoji(
  type: InsightType = "system",
  severity: InsightSeverity = "info",
  mood: InsightMood = "calm",
) {
  return byType[type]?.[severity] ?? byMood[mood] ?? "\u{1F44B}";
}
