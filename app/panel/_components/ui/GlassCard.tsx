import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: "base" | "soft" | "strong";
  accent?: boolean;
  hover?: boolean;
};

export function GlassCard({
  children,
  className,
  style,
  variant = "base",
  accent = false,
  hover = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "lmn-matte-card lmn-agency-card relative overflow-hidden border",
        hover && "lmn-agency-card-interactive transition duration-150",
        className
      )}
      data-accent={accent ? "true" : "false"}
      data-hover={hover ? "true" : "false"}
      data-variant={variant}
      style={style}
    >
      <span className="lmn-agency-card-accent" aria-hidden="true" />
      <div className="lmn-agency-card-content relative">{children}</div>
    </div>
  );
}
