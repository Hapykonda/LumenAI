import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { StatusBadge } from "./StatusBadge";

type PreviewShellProps = {
  title: string;
  description?: string;
  status?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
};

export function PreviewShell({
  title,
  description,
  status,
  children,
  className,
  actions,
}: PreviewShellProps) {
  return (
    <GlassCard
      variant="base"
      accent
      className={cn("lmn-preview-shell p-5", className)}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-[-0.02em]">
            {title}
          </h3>

          {description ? (
            <p className="lmn-preview-description mt-1 text-xs leading-5">
              {description}
            </p>
          ) : null}
        </div>

        {status ? <StatusBadge tone="active">{status}</StatusBadge> : null}
      </div>

      <div>{children}</div>

      {actions ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </GlassCard>
  );
}
