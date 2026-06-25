"use client";

import React from "react";
import { Sparkles } from "lucide-react";

type DisplayCardProps = {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
};

function cx(...v: Array<string | undefined | false | null>) {
  return v.filter(Boolean).join(" ");
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4" />,
  title = "Preset",
  description = "Descripción",
  date = "Ahora",
  iconClassName = "text-cyan-200",
  titleClassName = "text-cyan-200",
}: DisplayCardProps) {
  return (
    <div
      className={cx(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl",
        "border border-white/12 bg-black/30 backdrop-blur-xl px-4 py-3",
        "transition-all duration-700 hover:border-white/20 hover:bg-black/35",
        "shadow-[0_24px_70px_rgba(0,0,0,.55)]",
        "after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem]",
        "after:bg-gradient-to-l after:from-black/60 after:to-transparent after:content-['']",
        "[&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className
      )}
    >
      <div>
        <span className="relative inline-flex rounded-full border border-white/10 bg-white/5 p-1.5">
          <span className={cx("inline-flex", iconClassName)}>{icon}</span>
        </span>
        <p className={cx("text-lg font-medium text-white", titleClassName)}>{title}</p>
      </div>

      <p className="whitespace-nowrap text-lg text-white/85">{description}</p>
      <p className="text-white/50 text-sm">{date}</p>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(0,220,255,.22), transparent 55%), radial-gradient(circle at 75% 55%, rgba(170,90,255,.18), transparent 58%)",
        }}
      />
    </div>
  );
}

type DisplayCardsProps = {
  cards?: DisplayCardProps[];
};

export function DisplayCards({ cards }: DisplayCardsProps) {
  const fallback: DisplayCardProps[] = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-white/12 before:h-[100%] before:content-[''] before:bg-black/25 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-white/12 before:h-[100%] before:content-[''] before:bg-black/25 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
    },
  ];

  const display = cards?.length ? cards : fallback;

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100">
      {display.map((p, i) => (
        <DisplayCard key={i} {...p} />
      ))}
    </div>
  );
}

export default DisplayCards;