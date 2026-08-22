import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { LumenEmptyState } from "@/components/ui/lumen-empty-state";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <LumenEmptyState
      title={title}
      description={description}
      action={action}
      icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
    />
  );
}
