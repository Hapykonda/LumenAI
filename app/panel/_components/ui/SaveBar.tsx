import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionButton } from "./ActionButton";
import { StatusBadge } from "./StatusBadge";

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
      aria-hidden={!visible}
    >
      <div
        className="lmn-save-bar pointer-events-auto mx-auto flex max-w-[1180px] flex-col gap-3 border p-3 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="lmn-save-bar-signal h-2.5 w-2.5 shrink-0 rounded-full" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold">
                {saving ? "Guardando..." : title}
              </div>

              {status ? <StatusBadge tone="active">{status}</StatusBadge> : null}
            </div>

            {description ? (
              <div className="mt-1 text-xs leading-5">
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
