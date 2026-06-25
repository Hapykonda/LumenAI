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
          color: "rgba(255,255,255,.88)",
        }
      : tone === "warning"
      ? {
          borderColor: "rgba(255,199,87,.22)",
          background: "rgba(255,199,87,.07)",
          color: "rgba(255,255,255,.86)",
        }
      : tone === "danger"
      ? {
          borderColor: "rgba(255,90,90,.22)",
          background: "rgba(255,90,90,.075)",
          color: "rgba(255,255,255,.86)",
        }
      : tone === "muted"
      ? {
          borderColor: "rgba(255,255,255,.035)",
          background: "rgba(255,255,255,.012)",
          color: "rgba(255,255,255,.45)",
        }
      : {
          borderColor: "rgba(255,255,255,.05)",
          background: "rgba(255,255,255,.018)",
          color: "rgba(255,255,255,.72)",
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
