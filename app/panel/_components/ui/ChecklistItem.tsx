import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";

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
        "flex items-start gap-3 rounded-[12px] border px-3 py-3",
        className
      )}
      style={{
        borderColor: "rgba(255,255,255,.034)",
        background: "rgba(255,255,255,.014)",
      }}
    >
      <div className="mt-[1px] shrink-0">
        {done ? (
          <CheckCircle2
            className="h-4 w-4"
            style={{ color: `rgb(${accentA})` }}
          />
        ) : warning ? (
          <AlertCircle className="h-4 w-4 text-yellow-300/80" />
        ) : (
          <Circle className="h-4 w-4 text-white/22" />
        )}
      </div>

      <div className="min-w-0">
        <div className={done ? "text-sm font-medium text-white/78" : "text-sm font-medium text-white/62"}>
          {label}
        </div>

        {description ? (
          <div className="mt-1 text-xs leading-5 text-white/40">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
