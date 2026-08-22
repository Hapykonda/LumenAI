import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InsightSticker } from "@/components/ui/insight-sticker";
import type { PulseRecommendation } from "@/lib/pulse-insights";

type RecommendationCardProps = {
  recommendation: PulseRecommendation;
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const content = (
    <>
      <InsightSticker
        type={recommendation.type}
        severity={recommendation.severity}
        emoji={recommendation.emoji}
      />
      <span className="min-w-0 flex-1">
        <strong>{recommendation.title}</strong>
        <span>{recommendation.message}</span>
      </span>
      <span className="lmn-recommendation-cta">
        {recommendation.ctaLabel || recommendation.cta || "Revisar"}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </>
  );

  if (recommendation.href) {
    return (
      <Link href={recommendation.href} className={`lmn-recommendation-card is-${recommendation.severity}`}>
        {content}
      </Link>
    );
  }

  return <div className={`lmn-recommendation-card is-${recommendation.severity}`}>{content}</div>;
}
