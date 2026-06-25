"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { Bot, BookOpen, MessageCircle, Target } from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { MagicCard } from "@/components/ui/magic-card";
import { cn } from "@/lib/utils";

function FlowNode({
  refProp,
  icon,
  label,
  active = false,
}: {
  refProp: RefObject<HTMLDivElement | null>;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      ref={refProp}
      className={cn(
        "relative z-10 grid h-16 w-16 place-items-center rounded-[18px] border bg-[#080B12]/90 shadow-[0_14px_32px_rgba(0,0,0,.30)]",
        active
          ? "border-cyan-200/24 text-cyan-100"
          : "border-white/[0.075] text-white/64"
      )}
      title={label}
    >
      {icon}
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase text-white/38">
        {label}
      </span>
    </div>
  );
}

export function LumenMagicFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const knowledgeRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);

  return (
    <MagicCard
      gradientFrom="#00E5FF"
      gradientTo="#1B43FF"
      gradientColor="rgba(0, 229, 255, .08)"
      gradientOpacity={0.28}
      className="rounded-[24px]"
    >
      <div
        ref={containerRef}
        className="relative min-h-[190px] overflow-hidden rounded-[24px] border border-white/[0.065] bg-black/30 p-5"
      >
        <DotPattern
          width={18}
          height={18}
          cx={1}
          cy={1}
          cr={1}
          className="opacity-[.22] [mask-image:radial-gradient(circle_at_50%_50%,black,transparent_72%)]"
        />
        <div className="relative z-10 flex h-full min-h-[128px] items-center justify-between gap-5">
          <FlowNode
            refProp={knowledgeRef}
            icon={<BookOpen className="h-5 w-5" />}
            label="Knowledge"
          />
          <FlowNode
            refProp={aiRef}
            icon={<Bot className="h-5 w-5" />}
            label="IA"
            active
          />
          <FlowNode
            refProp={widgetRef}
            icon={<MessageCircle className="h-5 w-5" />}
            label="Widget"
          />
          <FlowNode
            refProp={leadRef}
            icon={<Target className="h-5 w-5" />}
            label="Leads"
          />
        </div>

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={knowledgeRef}
          toRef={aiRef}
          curvature={-18}
          duration={3.5}
          pathColor="rgba(255,255,255,.18)"
          gradientStartColor="#00E5FF"
          gradientStopColor="#1B43FF"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={aiRef}
          toRef={widgetRef}
          curvature={18}
          delay={0.6}
          duration={3.5}
          pathColor="rgba(255,255,255,.18)"
          gradientStartColor="#00E5FF"
          gradientStopColor="#6C3BFF"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={widgetRef}
          toRef={leadRef}
          curvature={-18}
          delay={1.2}
          duration={3.5}
          pathColor="rgba(255,255,255,.18)"
          gradientStartColor="#008CFF"
          gradientStopColor="#6C3BFF"
        />
      </div>
    </MagicCard>
  );
}
