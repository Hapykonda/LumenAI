import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionButton } from "./ActionButton";
import { StatusBadge } from "./StatusBadge";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

type SaveBarProps = {
  visible: boolean;
  title: string;
  description?: string;
  status?: string;
  saving?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  extraActions?: ReactNode;
  className?: string;
};

export function SaveBar({
  visible,
  title,
  description,
  status,
  saving,
  primaryLabel = "Guardar",
  secondaryLabel = "Restaurar",
  onPrimary,
  onSecondary,
  primaryDisabled,
  secondaryDisabled,
  extraActions,
  className,
}: SaveBarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4",
        "transition duration-150",
        visible ? "opacity-100" : "translate-y-5 opacity-0",
        className
      )}
    >
      <div
        className="lmn-save-bar pointer-events-auto mx-auto flex max-w-[1180px] flex-col gap-3 border p-3 md:flex-row md:items-center md:justify-between"
        style={{
          borderColor: "rgba(255,255,255,.052)",
          background: `
            radial-gradient(700px 180px at 20% 0%, rgba(${accentA}, .075), transparent 60%),
            radial-gradient(600px 180px at 90% 0%, rgba(${accentB}, .06), transparent 55%),
            rgba(5,7,11,.76)
          `,
          boxShadow:
            "0 16px 38px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.028)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: `rgba(${accentA}, .95)`,
              boxShadow: `0 0 14px rgba(${accentA}, .34)`,
            }}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-white">
                {saving ? "Guardando..." : title}
              </div>

              {status ? <StatusBadge tone="active">{status}</StatusBadge> : null}
            </div>

            {description ? (
              <div className="mt-1 text-xs leading-5 text-white/46">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {extraActions}

          {onSecondary ? (
            <ActionButton
              type="button"
              variant="secondary"
              onClick={onSecondary}
              disabled={secondaryDisabled || saving}
            >
              {secondaryLabel}
            </ActionButton>
          ) : null}

          {onPrimary ? (
            <ActionButton
              type="button"
              variant="primary"
              onClick={onPrimary}
              disabled={primaryDisabled || saving}
            >
              {saving ? "Guardando..." : primaryLabel}
            </ActionButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
