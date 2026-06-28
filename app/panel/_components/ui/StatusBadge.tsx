import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "default" | "active" | "warning" | "danger" | "muted";
  className?: string;
};

export function StatusBadge({
  children,
  tone = "default",
  className,
}: StatusBadgeProps) {
  const style =
    tone === "active"
      ? {
          borderColor: `rgba(${accentA}, .22)`,
          background: `linear-gradient(135deg, rgba(${accentA}, .085), rgba(${accentB}, .055))`,
          color: "var(--lmn-text)",
        }
      : tone === "warning"
      ? {
          borderColor: "color-mix(in srgb, var(--lmn-warning) 32%, transparent)",
          background: "color-mix(in srgb, var(--lmn-warning) 10%, transparent)",
          color: "var(--lmn-text)",
        }
      : tone === "danger"
      ? {
          borderColor: "color-mix(in srgb, var(--lmn-danger) 32%, transparent)",
          background: "color-mix(in srgb, var(--lmn-danger) 10%, transparent)",
          color: "var(--lmn-text)",
        }
      : tone === "muted"
      ? {
          borderColor: "var(--lmn-border)",
          background: "color-mix(in srgb, var(--lmn-surface-2) 74%, transparent)",
          color: "var(--lmn-muted)",
        }
      : {
          borderColor: "var(--lmn-border)",
          background: "color-mix(in srgb, var(--lmn-surface) 78%, transparent)",
          color: "var(--lmn-text-soft)",
        };

  return (
    <span
      className={cn(
        "apex-pill lmn-status-badge inline-flex min-h-[30px] items-center border px-3 text-[11px] font-black",
        className
      )}
      data-tone={tone}
      style={style}
    >
      {children}
    </span>
  );
}
