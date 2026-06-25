"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type GlowingEffectProps = {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
};

export const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 64,
    spread = 40,
    variant = "default",
    glow = true,
    className,
    movementDuration = 2,
    borderWidth = 3,
    disabled = false,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);
    const currentAngleRef = useRef<number>(0);

    const handleMove = useCallback(
      (e?: PointerEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } = element.getBoundingClientRect();
          const mouseX = (e as any)?.x ?? lastPosition.current.x;
          const mouseY = (e as any)?.y ?? lastPosition.current.y;

          if (e) lastPosition.current = { x: mouseX, y: mouseY };

          const center = [left + width * 0.5, top + height * 0.5];
          const distanceFromCenter = Math.hypot(mouseX - center[0], mouseY - center[1]);
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");
          if (!isActive) return;

          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || currentAngleRef.current;

          let targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;
          currentAngleRef.current = newAngle;

          // simple easing without extra deps
          const start = currentAngle;
          const end = newAngle;
          const startTime = performance.now();
          const dur = Math.max(120, movementDuration * 1000);

          const step = (t: number) => {
            const p = Math.min(1, (t - startTime) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            const v = start + (end - start) * eased;
            element.style.setProperty("--start", String(v));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    useEffect(() => {
      if (disabled) return;

      const onMove = (e: PointerEvent) => handleMove(e);
      window.addEventListener("pointermove", onMove, { passive: true });

      const onScroll = () => handleMove();
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
      };
    }, [handleMove, disabled]);

    return (
      <>
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            disabled && "!block opacity-100 border-white/10"
          )}
        />
        <div
          ref={containerRef}
          style={
            {
              "--blur": `${blur}px`,
              "--spread": spread,
              "--start": "0",
              "--active": "0",
              "--glowingeffect-border-width": `${borderWidth}px`,
              "--repeating-conic-gradient-times": "5",
              "--gradient":
                variant === "white"
                  ? `repeating-conic-gradient(from 236.84deg at 50% 50%, #fff, #fff calc(25% / var(--repeating-conic-gradient-times)))`
                  : `radial-gradient(circle, #6425da 10%, #dd7bbb00 20%),
                     radial-gradient(circle at 40% 40%, #0099ff 5%, #d79f1e00 15%),
                     radial-gradient(circle at 60% 60%, #58b9bd 10%, #5a922c00 20%), 
                     radial-gradient(circle at 40% 60%, #051824 10%, #4c789400 20%),
                     repeating-conic-gradient(
                       from 236.84deg at 50% 50%,
                       #2aaed6 0%,
                       #1ed7a0 calc(25% / var(--repeating-conic-gradient-times)),
                       #23aeff calc(50% / var(--repeating-conic-gradient-times)), 
                       #40aaec calc(75% / var(--repeating-conic-gradient-times)),
                       #0ecfff calc(100% / var(--repeating-conic-gradient-times))
                     )`,
            } as React.CSSProperties
          }
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-[var(--blur)]",
            className,
            disabled && "!hidden"
          )}
        >
          <div
            className={cn(
              "rounded-[inherit]",
              'after:content-[""] after:rounded-[inherit] after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:[background:var(--gradient)] after:[background-attachment:fixed]",
              "after:opacity-[var(--active)] after:transition-opacity after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:[mask-composite:intersect]",
              "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
            )}
          />
        </div>
      </>
    );
  }
);

GlowingEffect.displayName = "GlowingEffect";