import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  rightRail?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  rightRail,
  actions,
  className,
}: PageShellProps) {
  return (
    <section className={cn("lmn-page-shell lmn-obsidian-page", className)}>
      <header className="lmn-page-shell-header">
        <div>
          {eyebrow ? <div className="lmn-page-shell-eyebrow">{eyebrow}</div> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="lmn-page-shell-actions">{actions}</div> : null}
      </header>

      <div className={rightRail ? "lmn-page-shell-grid" : "lmn-page-shell-stack"}>
        <div>{children}</div>
        {rightRail ? <aside className="lmn-right-rail">{rightRail}</aside> : null}
      </div>
    </section>
  );
}
