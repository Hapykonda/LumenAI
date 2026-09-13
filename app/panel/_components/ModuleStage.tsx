"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { getOperator } from "@/lib/operators/catalog";
import { usePanel } from "./panel-context";
import type { ModuleExperience } from "./module-experience";

function StageArtwork({ experience }: { experience: ModuleExperience }) {
  const { operatorId } = usePanel();
  const operator = getOperator(operatorId);
  return (
    <div className="lme-stage-artwork" data-artwork={experience.visual}>
      <Image src={experience.visual === "eye" || experience.visual === "radar" || experience.visual === "research" ? "/brand/editorial/signal-horizon.png" : "/brand/editorial/cobalt-folds.png"} alt="" fill sizes="(max-width: 760px) 100vw, 440px" />
      <div className="lme-stage-artwork-shade" />
      <span className="lme-artwork-code">{experience.eyebrow.split(" · ")[0].toUpperCase()} / {experience.index}</span>
      <div className="lme-operator-presence">
        <OperatorAvatar operator={operatorId} mood={experience.visual === "radar" || experience.visual === "eye" ? "analyzing" : "welcome"} size={152} />
        <span><small>TU OPERADOR</small><strong>{operator.name}</strong><em>Contexto para decidir mejor.</em></span>
      </div>
    </div>
  );
}

export function ModuleStage({
  experience,
  compact = false,
}: {
  experience: ModuleExperience;
  compact?: boolean;
}) {
  const Icon = experience.icon;
  const { operatorId } = usePanel();

  return (
    <section
      className="lmx-module-stage"
      data-visual={experience.visual}
      data-compact={compact ? "true" : "false"}
      style={{ "--lmx-module-accent": experience.accentColor } as CSSProperties}
      aria-labelledby={`lmx-stage-title-${experience.id}`}
    >
      <div className="lmx-stage-grid" aria-hidden="true" />
      <div className="lmx-stage-copy">
        <div className="lmx-stage-meta">
          <span className="lmx-stage-index">{experience.index}</span>
          <span className="lmx-stage-eyebrow"><Icon aria-hidden="true" /> {experience.eyebrow}</span>
          <span className="lmx-stage-live"><i aria-hidden="true" /> LUMENAI / WORKSPACE</span>
        </div>
        <h1 id={`lmx-stage-title-${experience.id}`}>
          <span>{experience.title}</span>
          <em>{experience.accent}</em>
        </h1>
        <p>{experience.description}</p>
        <div className="lmx-stage-actions">
          <Link href={experience.actionHref} className="lmx-stage-primary">
            {experience.actionLabel}<ArrowUpRight aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="lmx-stage-secondary"
            onClick={() => window.dispatchEvent(new Event("lumenai:pulse-open"))}
          >
            <Sparkles aria-hidden="true" /> Preguntar a {getOperator(operatorId).name}
          </button>
        </div>
      </div>

      <div className="lmx-stage-art">
        <StageArtwork experience={experience} />
      </div>

      <div className="lmx-stage-rail" aria-label="Flujo del módulo">
        <LumenLogo compact size="sm" />
        {experience.signals.map((signal, index) => (
          <span key={signal}><i>{String(index + 1).padStart(2, "0")}</i>{signal}</span>
        ))}
        <b>LUMENAI / {experience.id.toUpperCase()}</b>
      </div>
    </section>
  );
}
