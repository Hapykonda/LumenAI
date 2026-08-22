import type { ReactNode } from "react";
import { LumenSystemState } from "@/components/ui/lumen-system-state";

type LumenEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function LumenEmptyState({
  title,
  description,
  action,
  icon,
}: LumenEmptyStateProps) {
  return (
    <LumenSystemState
      state="empty"
      title={title}
      description={description}
      action={action}
      icon={icon}
      compact
    />
  );
}
