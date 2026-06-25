import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ActionButton } from "./ActionButton";

type PanelSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  status?: string;
  statusTone?: "default" | "active" | "warning" | "danger" | "muted";
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: ReactNode;
  secondary?: ReactNode;
  children?: ReactNode;
};

export function PanelSectionHeader({
  eyebrow: _eyebrow = "LumenAI",
  title,
  description,
  status,
  statusTone = "default",
  actionLabel,
  actionHref,
  actionIcon,
  secondary,
  children,
}: PanelSectionHeaderProps) {
  void _eyebrow;

  return (
    <section
      className="lmn-section-header"
      data-has-content={children ? "true" : "false"}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="lmn-section-title-wrap">
            <h2 className="lmn-section-title">
              <span>{title}</span>
            </h2>
            <div className="lmn-section-title-line" aria-hidden="true">
              <span />
            </div>
          </div>

          <p className="mt-3 max-w-[760px] text-sm leading-6 text-white/58 md:text-[15px]">
            {description}
          </p>

          {status ? (
            <p
              className="mt-2 text-xs font-bold uppercase tracking-[0.14em]"
              data-tone={statusTone}
            >
              {status}
            </p>
          ) : null}

        </div>

        {secondary || (actionLabel && actionHref) ? (
          <div className="lmn-section-actions flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {secondary}

            {actionLabel && actionHref ? (
              <ActionButton href={actionHref} variant="primary">
                {actionLabel}
                {actionIcon ?? <ArrowRight className="h-3.5 w-3.5" />}
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {children ? <div className="lmn-section-header-content">{children}</div> : null}
    </section>
  );
}
