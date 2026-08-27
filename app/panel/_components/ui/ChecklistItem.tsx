import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ChecklistItemProps = {
  label: string;
  description?: string;
  done?: boolean;
  warning?: boolean;
  className?: string;
};

export function ChecklistItem({
  label,
  description,
  done,
  warning,
  className,
}: ChecklistItemProps) {
  return (
    <div
      className={cn(
        "lmn-checklist-item flex items-start gap-3 border px-3 py-3",
        className
      )}
    >
      <div className="mt-[1px] shrink-0">
        {done ? (
          <CheckCircle2
            className="h-4 w-4 text-[var(--module-accent,#246bfd)]"
            aria-hidden="true"
          />
        ) : warning ? (
          <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        ) : (
          <Circle className="h-4 w-4" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-semibold">
          {label}
        </div>

        {description ? (
          <div className="mt-1 text-xs leading-5">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
