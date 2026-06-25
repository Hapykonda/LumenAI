"use client";

import { Player } from "@remotion/player";
import { MarkerHighlight } from "@/components/ui/marker-highlight";

type MarkerHighlightStripProps = {
  before?: string;
  highlight: string;
  after?: string;
};

function MarkerScene({
  before,
  highlight,
  after,
}: MarkerHighlightStripProps) {
  return (
    <MarkerHighlight
      before={before}
      highlight={highlight}
      after={after}
      markerColor="#00E5FF"
      baseColor="rgba(255,255,255,.82)"
      highlightedTextColor="#05070d"
      backgroundColor="transparent"
      fontSize={58}
      fontWeight={900}
      speed={1}
    />
  );
}

export function MarkerHighlightStrip({
  before = "Operacion ",
  highlight,
  after = " lista para actuar.",
}: MarkerHighlightStripProps) {
  return (
    <div className="apex-panel relative hidden h-[92px] overflow-hidden border lg:block">
      <Player
        component={MarkerScene}
        inputProps={{ before, highlight, after }}
        durationInFrames={90}
        fps={30}
        compositionWidth={1200}
        compositionHeight={180}
        controls={false}
        autoPlay
        loop
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
