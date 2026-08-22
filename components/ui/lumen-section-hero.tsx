import type { ReactNode } from "react";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";

type LumenSectionHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  status?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  visual?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  animatedLights?: boolean;
};

export function LumenSectionHero({
  eyebrow = "LumenAI",
  title,
  subtitle,
  status,
  action,
  secondary,
  visual,
  children,
  compact = false,
  animatedLights = false,
}: LumenSectionHeroProps) {
  return (
    <section className={compact ? "lmn-section-hero is-compact" : "lmn-section-hero"}>
      {animatedLights ? <AnimatedHeroLights intensity="low" className="is-section-hero" /> : null}
      <div className="lmn-section-hero-main">
        <p className="lmn-section-hero-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {status ? <div className="lmn-section-hero-status">{status}</div> : null}
      </div>
      {action || secondary || visual ? (
        <div className="lmn-section-hero-side">
          {visual}
          {(action || secondary) ? (
            <div className="lmn-section-hero-actions">
              {secondary}
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
      {children ? <div className="lmn-section-hero-content">{children}</div> : null}
    </section>
  );
}
