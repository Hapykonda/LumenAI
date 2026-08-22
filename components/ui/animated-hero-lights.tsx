type AnimatedHeroLightsProps = {
  intensity?: "low" | "medium" | "high";
  className?: string;
};

export function AnimatedHeroLights({ intensity = "medium", className = "" }: AnimatedHeroLightsProps) {
  return (
    <div className={["lmn-animated-hero-lights", `is-${intensity}`, className].filter(Boolean).join(" ")} aria-hidden="true">
      <span className="lmn-hero-light is-upper" />
      <span className="lmn-hero-light is-lower" />
      <span className="lmn-hero-light is-upper-secondary" />
      <span className="lmn-hero-light is-lower-secondary" />
      <span className="lmn-hero-light is-thread" />
    </div>
  );
}
