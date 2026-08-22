import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceTone = "default" | "quiet" | "strong" | "ambient";
type SurfacePadding = "none" | "sm" | "md" | "lg";

const surfacePadding: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
};

type ObsidianSurfaceProps<T extends ElementType> = {
  as?: T;
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  interactive?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "as" | "children" | "className">;

export function ObsidianSurface<T extends ElementType = "section">({
  as,
  tone = "default",
  padding = "md",
  interactive = false,
  children,
  className,
  ...props
}: ObsidianSurfaceProps<T>) {
  const Component = as || "section";

  return (
    <Component
      {...props}
      className={cn(
        "lmn-obsidian-surface",
        surfacePadding[padding],
        interactive && "lmn-obsidian-surface-interactive",
        className
      )}
      data-tone={tone}
      data-interactive={interactive ? "true" : "false"}
    >
      {children}
    </Component>
  );
}

export function ObsidianKicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("lmn-obsidian-kicker", className)}>{children}</div>;
}

export function ObsidianStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("lmn-obsidian-stack", className)}>{children}</div>;
}

export function ObsidianGrid({
  children,
  className,
  min = "220px",
}: {
  children: ReactNode;
  className?: string;
  min?: string;
}) {
  return (
    <div
      className={cn("lmn-obsidian-grid", className)}
      style={{ "--lmn-grid-min": min } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function ObsidianMetric({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "preview";
}) {
  return (
    <ObsidianSurface as="article" className="lmn-obsidian-metric" padding="md" tone="quiet" interactive>
      {icon ? <div className="lmn-obsidian-metric-icon">{icon}</div> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small data-tone={tone}>{detail}</small> : null}
    </ObsidianSurface>
  );
}
