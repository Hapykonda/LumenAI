import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleX,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "default" | "active" | "warning" | "danger" | "muted";
  className?: string;
  icon?: ReactNode;
};

export function StatusBadge({
  children,
  tone = "default",
  className,
  icon,
}: StatusBadgeProps) {
  const style =
    tone === "active"
      ? {
          borderColor: "rgba(var(--lmn-success-rgb, 67,230,160), .24)",
          background: "rgba(var(--lmn-success-rgb, 67,230,160), .08)",
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

  const statusIcon =
    icon ??
    (tone === "active" ? (
      <CheckCircle2 aria-hidden="true" />
    ) : tone === "warning" ? (
      <AlertTriangle aria-hidden="true" />
    ) : tone === "danger" ? (
      <CircleX aria-hidden="true" />
    ) : tone === "muted" ? (
      <CircleDashed aria-hidden="true" />
    ) : (
      <Activity aria-hidden="true" />
    ));

  return (
    <span
      className={cn(
        "apex-pill lmn-status-badge inline-flex min-h-[30px] items-center border px-3 text-[11px] font-black",
        className
      )}
      data-tone={tone}
      style={style}
    >
      {statusIcon}
      {children}
    </span>
  );
}
