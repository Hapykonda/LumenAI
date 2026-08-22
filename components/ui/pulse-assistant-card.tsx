"use client";

import Link from "next/link";
import { ArrowRight, Brain, MessageCircle, SlidersHorizontal, Sparkles } from "lucide-react";
import { ProfessionalTypingMessage } from "@/components/ui/professional-typing-message";
import { InsightSticker } from "@/components/ui/insight-sticker";
import type { InsightMood, PulseRecommendation } from "@/lib/pulse-insights";

type PulseAssistantCardProps = {
  greeting: string;
  summary: string;
  mood?: InsightMood;
  recommendations?: PulseRecommendation[];
  thinking?: boolean;
};

const quickActions = [
  { href: "/panel/knowledge", label: "Revisar conocimiento", icon: Brain },
  { href: "/panel/widget", label: "Probar widget", icon: MessageCircle },
  { href: "/panel/calibration", label: "Ajustar calibracion", icon: SlidersHorizontal },
  { href: "/panel/autoconfig", label: "Configurar automaticamente", icon: Sparkles },
];

export function PulseAssistantCard({
  greeting,
  summary,
  mood = "calm",
  recommendations = [],
  thinking = false,
}: PulseAssistantCardProps) {
  return (
    <section className="lmn-pulse-assistant-card">
      <div className="lmn-pulse-assistant-head">
        <InsightSticker type="activity" severity={mood === "warning" ? "warning" : "info"} mood={mood} />
        <div>
          <span>Pulse Assistant</span>
          <strong>{greeting}</strong>
        </div>
      </div>

      <ProfessionalTypingMessage
        thinking={thinking}
        badge="Estado"
        segments={[
          { text: summary.split(".")[0] || summary, highlight: true },
          { text: summary.includes(".") ? `.${summary.split(".").slice(1).join(".")}` : "" },
        ]}
      />

      <div className="lmn-pulse-assistant-actions">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Icon className="h-3.5 w-3.5" />
              {action.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          );
        })}
      </div>

      {recommendations.length ? (
        <div className="lmn-pulse-assistant-mini">
          {recommendations.slice(0, 2).map((item) => (
            <div key={item.title}>
              <InsightSticker type={item.type} severity={item.severity} emoji={item.emoji} />
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
