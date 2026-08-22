import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type PulseActionItem = {
  label: string;
  description: string;
  href: string;
  priority: "primary" | "secondary";
};

export function PulseActionStack({ actions }: { actions: PulseActionItem[] }) {
  return (
    <section className="lmn-pulse-action-stack">
      <div className="lmn-pulse-block-heading">
        <span>Action Stack</span>
        <strong>Siguiente mejor acción</strong>
      </div>
      <div className="grid gap-2">
        {actions.slice(0, 5).map((action) => (
          <Link key={`${action.label}-${action.href}`} href={action.href} className={`lmn-pulse-action-card is-${action.priority}`}>
            <span>
              <strong>{action.label}</strong>
              <small>{action.description}</small>
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </section>
  );
}
