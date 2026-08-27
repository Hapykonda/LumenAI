import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

type FieldGroupProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function FieldGroup({
  title,
  description,
  children,
  className,
  action,
}: FieldGroupProps) {
  return (
    <GlassCard
      variant="base"
      accent
      className={cn("lmn-field-group p-5 md:p-6", className)}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-[-0.03em]">
            {title}
          </h3>

          {description ? (
            <p className="lmn-field-group-description mt-2 max-w-[760px] text-sm leading-6">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="grid gap-4">{children}</div>
    </GlassCard>
  );
}
