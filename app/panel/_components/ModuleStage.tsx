"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Radio, Sparkles } from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { usePanel } from "./panel-context";
import type { ModuleExperience } from "./module-experience";

function StageArtwork({ experience }: { experience: ModuleExperience }) {
  const { operatorId } = usePanel();

  if (experience.visual === "command") {
    return (
      <div className="lmx-stage-keyvisual">
        <Image
          src="/brand/studio/lumenai-cinematic-keyvisual.webp"
          alt="Escultura luminosa con el símbolo de LumenAI"
          fill
          priority
          sizes="(max-width: 980px) 100vw, 48vw"
        />
        <span className="lmx-stage-keyvisual-shade" />
      </div>
    );
  }

  if (experience.visual === "campaign") {
    return (
      <div className="lmx-stage-poster">
        <Image
          src="/brand/studio/lumenai-editorial-poster.webp"
          alt="Póster editorial con el símbolo de LumenAI"
          fill
          sizes="360px"
        />
      </div>
    );
  }

  if (experience.visual === "radar") {
    return (
      <div className="lmx-stage-radar-operator">
        <span className="lmx-stage-radar-ring lmx-stage-radar-ring-a" />
        <span className="lmx-stage-radar-ring lmx-stage-radar-ring-b" />
        <OperatorAvatar operator={operatorId} mood="analyzing" size={230} priority />
        <span className="lmx-stage-operator-label">
          <Radio aria-hidden="true" /> Pulse está leyendo el sistema
        </span>
      </div>
    );
  }

  const Icon = experience.icon;
  return (
    <div className="lmx-stage-symbol" data-visual={experience.visual}>
      <span className="lmx-stage-symbol-grid" />
      <span className="lmx-stage-symbol-orbit" />
      <span className="lmx-stage-symbol-orbit lmx-stage-symbol-orbit-secondary" />
      <span className="lmx-stage-symbol-core">
        <Icon aria-hidden="true" />
      </span>
      <span className="lmx-stage-symbol-index">{experience.index}</span>
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
          <span className="lmx-stage-live"><i aria-hidden="true" /> {experience.status}</span>
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
            <Sparkles aria-hidden="true" /> Preguntar a Pulse
          </button>
        </div>
      </div>

      <div className="lmx-stage-art" aria-hidden="true">
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
