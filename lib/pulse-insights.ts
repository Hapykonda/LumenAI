export type InsightType =
  | "system"
  | "knowledge"
  | "widget"
  | "sales"
  | "lead"
  | "calibration"
  | "chat"
  | "activity";

export type InsightSeverity = "info" | "success" | "warning" | "critical";
export type InsightMood = "calm" | "active" | "focused" | "warning" | "growth" | "opportunity";
export type PulseOverallStatus = "healthy" | "needs_setup" | "opportunity" | "warning" | "empty";

export type PulseRecommendation = {
  id?: string;
  title: string;
  message: string;
  reasoning?: string;
  priority?: "low" | "medium" | "high";
  type: InsightType;
  severity: InsightSeverity;
  emoji?: string;
  cta?: string;
  ctaLabel?: string;
  href?: string;
};

const emojiByType: Record<InsightType, Partial<Record<InsightSeverity, string>>> = {
  system: {
    info: "\u{1F535}",
    success: "\u2705",
    warning: "\u26A0\uFE0F",
    critical: "\u{1F6A8}",
  },
  knowledge: {
    info: "\u{1F4DA}",
    success: "\u{1F9E0}",
    warning: "\u{1F4A1}",
    critical: "\u26A0\uFE0F",
  },
  widget: {
    info: "\u{1F9E9}",
    success: "\u{1F310}",
    warning: "\u{1F440}",
    critical: "\u{1F6A8}",
  },
  sales: {
    info: "\u{1F4AC}",
    success: "\u{1F4C8}",
    warning: "\u{1F9F2}",
    critical: "\u26A0\uFE0F",
  },
  lead: {
    info: "\u{1F9F2}",
    success: "\u{1F4C8}",
    warning: "\u{1F440}",
    critical: "\u{1F6A8}",
  },
  calibration: {
    info: "\u{1F39B}\uFE0F",
    success: "\u2699\uFE0F",
    warning: "\u{1F6E0}\uFE0F",
    critical: "\u{1F6A8}",
  },
  chat: {
    info: "\u{1F4AC}",
    success: "\u2728",
    warning: "\u{1F440}",
    critical: "\u{1F6A8}",
  },
  activity: {
    info: "\u26A1",
    success: "\u{1F7E2}",
    warning: "\u26A0\uFE0F",
    critical: "\u{1F534}",
  },
};

const moodFallback: Record<InsightMood, string> = {
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
  return emojiByType[type]?.[severity] ?? moodFallback[mood] ?? "\u2728";
}

export function toneFromSeverity(severity: InsightSeverity) {
  if (severity === "success") return "good";
  if (severity === "warning") return "warn";
  if (severity === "critical") return "risk";
  return "info";
}
