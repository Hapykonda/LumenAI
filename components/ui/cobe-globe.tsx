"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import createGlobe from "cobe";

type RgbTriplet = [number, number, number];

interface Marker {
  id: string;
  location: [number, number];
  label: string;
}

interface Arc {
  id: string;
  from: [number, number];
  to: [number, number];
  label?: string;
}

interface GlobeProps {
  markers?: Marker[];
  arcs?: Arc[];
  className?: string;
  markerColor?: RgbTriplet;
  baseColor?: RgbTriplet;
  arcColor?: RgbTriplet;
  glowColor?: RgbTriplet;
  dark?: number;
  mapBrightness?: number;
  markerSize?: number;
  markerElevation?: number;
  arcWidth?: number;
  arcHeight?: number;
  speed?: number;
  theta?: number;
  diffuse?: number;
  mapSamples?: number;
  emptyLabel?: string;
}

const THEME_EVENT = "lumen-theme:update";
const FALLBACK_ACCENT: RgbTriplet = [0.22, 0.62, 1];
const FALLBACK_ACCENT_2: RgbTriplet = [0.78, 0.48, 1];

function parseRgbVar(name: string, fallback: RgbTriplet): RgbTriplet {
  if (typeof window === "undefined") return fallback;

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  const values = raw
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (values.length < 3) return fallback;

  return [
    Math.max(0, Math.min(1, values[0] / 255)),
    Math.max(0, Math.min(1, values[1] / 255)),
    Math.max(0, Math.min(1, values[2] / 255)),
  ];
}

function useThemeColors() {
  const read = useCallback(
    () => ({
      accent: parseRgbVar("--lmn-accent-rgb", FALLBACK_ACCENT),
      accent2: parseRgbVar("--lmn-accent-2-rgb", FALLBACK_ACCENT_2),
    }),
    []
  );

  const [colors, setColors] = useState(read);

  useEffect(() => {
    const sync = () => setColors(read());

    sync();
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [read]);

  return colors;
}

export function Globe({
  markers = [],
  arcs = [],
  className = "",
  markerColor,
  baseColor = [1, 1, 1],
  arcColor,
  glowColor = [0.08, 0.1, 0.15],
  dark = 0,
  mapBrightness = 10,
  markerSize = 0.025,
  markerElevation = 0.01,
  arcWidth = 0.5,
  arcHeight = 0.25,
  speed = 0.003,
  theta = 0.2,
  diffuse = 1.5,
  mapSamples = 12000,
  emptyLabel = "Sin datos geo",
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const velocity = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const hiddenRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const phiRef = useRef(0);
  const themeColors = useThemeColors();

  const resolvedMarkerColor = markerColor ?? themeColors.accent;
  const resolvedArcColor = arcColor ?? themeColors.accent2;

  const globeMarkers = useMemo(
    () =>
      markers.map((marker) => ({
        location: marker.location,
        size: markerSize,
        id: marker.id,
      })),
    [markers, markerSize]
  );

  const globeArcs = useMemo(
    () =>
      arcs.map((arc) => ({
        from: arc.from,
        to: arc.to,
        id: arc.id,
      })),
    [arcs]
  );

  const runtimeRef = useRef({
    speed,
    theta,
    dark,
    diffuse,
    mapSamples,
    mapBrightness,
    baseColor,
    glowColor,
    markerColor: resolvedMarkerColor,
    arcColor: resolvedArcColor,
    markerElevation,
    arcWidth,
    arcHeight,
    markers: globeMarkers,
    arcs: globeArcs,
  });

  useEffect(() => {
    runtimeRef.current = {
      speed,
      theta,
      dark,
      diffuse,
      mapSamples,
      mapBrightness,
      baseColor,
      glowColor,
      markerColor: resolvedMarkerColor,
      arcColor: resolvedArcColor,
      markerElevation,
      arcWidth,
      arcHeight,
      markers: globeMarkers,
      arcs: globeArcs,
    };
  }, [
    speed,
    theta,
    dark,
    diffuse,
    mapSamples,
    mapBrightness,
    baseColor,
    glowColor,
    resolvedMarkerColor,
    resolvedArcColor,
    markerElevation,
    arcWidth,
    arcHeight,
    globeMarkers,
    globeArcs,
  ]);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (pointerInteracting.current === null) return;

    const deltaX = event.clientX - pointerInteracting.current.x;
    const deltaY = event.clientY - pointerInteracting.current.y;
    dragOffset.current = { phi: deltaX / 320, theta: deltaY / 1100 };

    const now = Date.now();
    if (lastPointer.current) {
      const dt = Math.max(now - lastPointer.current.t, 1);
      const maxVelocity = 0.12;
      velocity.current = {
        phi: Math.max(
          -maxVelocity,
          Math.min(maxVelocity, ((event.clientX - lastPointer.current.x) / dt) * 0.24)
        ),
        theta: Math.max(
          -maxVelocity,
          Math.min(maxVelocity, ((event.clientY - lastPointer.current.y) / dt) * 0.065)
        ),
      };
    }
    lastPointer.current = { x: event.clientX, y: event.clientY, t: now };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
      lastPointer.current = null;
    }

    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      hiddenRef.current = document.visibilityState === "hidden";
      reducedMotionRef.current = media.matches;
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    media.addEventListener?.("change", sync);

    return () => {
      document.removeEventListener("visibilitychange", sync);
      media.removeEventListener?.("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number | null = null;
    let revealTimer: number | null = null;

    const renderFrame = () => {
      if (!globe) return;
      const config = runtimeRef.current;

      if (!hiddenRef.current && !reducedMotionRef.current) {
        if (!isPausedRef.current) {
          phiRef.current += config.speed;

          if (
            Math.abs(velocity.current.phi) > 0.0001 ||
            Math.abs(velocity.current.theta) > 0.0001
          ) {
            phiOffsetRef.current += velocity.current.phi;
            thetaOffsetRef.current += velocity.current.theta;
            velocity.current.phi *= 0.94;
            velocity.current.theta *= 0.94;
          }

          const thetaMin = -0.38;
          const thetaMax = 0.38;
          if (thetaOffsetRef.current < thetaMin) {
            thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1;
          } else if (thetaOffsetRef.current > thetaMax) {
            thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1;
          }
        }

        globe.update({
          phi: phiRef.current + phiOffsetRef.current + dragOffset.current.phi,
          theta: config.theta + thetaOffsetRef.current + dragOffset.current.theta,
          dark: config.dark,
          mapBrightness: config.mapBrightness,
          markerColor: config.markerColor,
          baseColor: config.baseColor,
          arcColor: config.arcColor,
          markerElevation: config.markerElevation,
          markers: config.markers,
          arcs: config.arcs,
        });
      }

      animationId = requestAnimationFrame(renderFrame);
    };

    const init = () => {
      const width = Math.floor(canvas.offsetWidth);
      if (width <= 0 || globe) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
      const config = runtimeRef.current;

      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
        phi: phiRef.current,
        theta: config.theta,
        dark: config.dark,
        diffuse: config.diffuse,
        mapSamples: config.mapSamples,
        mapBrightness: config.mapBrightness,
        baseColor: config.baseColor,
        markerColor: config.markerColor,
        glowColor: config.glowColor,
        markerElevation: config.markerElevation,
        markers: config.markers,
        arcs: config.arcs,
        arcColor: config.arcColor,
        arcWidth: config.arcWidth,
        arcHeight: config.arcHeight,
        opacity: 0.74,
      });

      renderFrame();
      revealTimer = window.setTimeout(() => {
        canvas.style.opacity = "1";
      }, 80);

      return true;
    };

    if (!init()) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0 && init()) {
          resizeObserver.disconnect();
        }
      });
      resizeObserver.observe(canvas);

      return () => {
        resizeObserver.disconnect();
        if (animationId) cancelAnimationFrame(animationId);
        if (revealTimer) window.clearTimeout(revealTimer);
        globe?.destroy();
      };
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (revealTimer) window.clearTimeout(revealTimer);
      globe?.destroy();
    };
  }, []);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 620ms ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />

      {markers.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="apex-cut border border-white/[0.070] bg-black/45 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white/46 backdrop-blur-sm">
            {emptyLabel}
          </div>
        </div>
      ) : null}

      {markers.map((marker) => (
        <div
          key={marker.id}
          style={{
            position: "absolute",
            positionAnchor: `--cobe-${marker.id}`,
            bottom: "anchor(top)",
            left: "anchor(center)",
            translate: "-50% 0",
            marginBottom: 8,
            padding: "4px 8px",
            border: "1px solid rgba(255,255,255,.11)",
            borderRadius: 8,
            background: "rgba(4,7,13,.72)",
            color: "rgba(255,255,255,.90)",
            fontFamily: "var(--font-sans)",
            fontSize: "0.62rem",
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            whiteSpace: "nowrap" as const,
            pointerEvents: "none" as const,
            opacity: `var(--cobe-visible-${marker.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 6px))`,
            boxShadow: "0 10px 24px rgba(0,0,0,.28)",
            transition: "opacity 0.55s ease, filter 0.55s ease",
          }}
        >
          {marker.label}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translate3d(-50%, -1px, 0)",
              border: "5px solid transparent",
              borderTopColor: "rgba(4,7,13,.72)",
            }}
          />
        </div>
      ))}

      {arcs
        .filter((arc) => arc.label)
        .map((arc) => (
          <div
            key={arc.id}
            style={{
              position: "absolute",
              positionAnchor: `--cobe-arc-${arc.id}`,
              bottom: "anchor(top)",
              left: "anchor(center)",
              translate: "-50% 0",
              marginBottom: 8,
              padding: "4px 8px",
              border: "1px solid rgba(255,255,255,.11)",
              borderRadius: 8,
              background: "rgba(255,255,255,.86)",
              color: "#05070d",
              fontFamily: "var(--font-sans)",
              fontSize: "0.62rem",
              fontWeight: 850,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              whiteSpace: "nowrap" as const,
              pointerEvents: "none" as const,
              opacity: `var(--cobe-visible-arc-${arc.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-arc-${arc.id}, 0)) * 6px))`,
              transition: "opacity 0.55s ease, filter 0.55s ease",
            }}
          >
            {arc.label}
            <span
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translate3d(-50%, -1px, 0)",
                border: "5px solid transparent",
                borderTopColor: "rgba(255,255,255,.86)",
              }}
            />
          </div>
        ))}
    </div>
  );
}
