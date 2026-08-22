"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { ProfessionalTypingMessage } from "@/components/ui/professional-typing-message";

type CalibrationLivePreviewProps = {
  assistantName: string;
  businessName: string;
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  empathy: number;
  directivity: number;
  closing: number;
};

function toneLabel(value: number, high: string, medium: string, low: string) {
  if (value >= 76) return high;
  if (value >= 46) return medium;
  return low;
}

export function CalibrationLivePreview({
  assistantName,
  businessName,
  greeting,
  primaryColor = "#2F7CFF",
  secondaryColor = "#5BE0C2",
  empathy,
  directivity,
  closing,
}: CalibrationLivePreviewProps) {
  const firstLine = (greeting || `Hola, soy ${assistantName}. Te ayudo a resolver dudas y avanzar con ${businessName}.`)
    .split("\n")[0]
    .trim();
  const style = {
    ["--lmn-preview-primary" as string]: primaryColor,
    ["--lmn-preview-secondary" as string]: secondaryColor,
  };

  return (
    <section className="lmn-calibration-live-preview" style={style}>
      <div className="lmn-calibration-live-head">
        <span>
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <strong>{assistantName}</strong>
          <small>{businessName} · preview vivo</small>
        </div>
        <em>Draft</em>
      </div>

      <div className="lmn-calibration-chat-preview">
        <div className="is-assistant">
          <ProfessionalTypingMessage
            badge="Saludo"
            segments={[
              { text: firstLine ? `${firstLine} ` : "", highlight: true },
              { text: "Puedo guiarte con una recomendacion clara y el siguiente paso." },
            ]}
            speedMs={12}
          />
        </div>
        <div className="is-user">Quiero cotizar y saber si me conviene.</div>
        <div className="is-assistant is-compact">
          <MessageCircle className="h-3.5 w-3.5" />
          {toneLabel(directivity, "Te hago 2 preguntas y te recomiendo la opcion mas conveniente.", "Revisamos opciones y elegimos juntos.", "Puedo explicarte todo con calma antes de decidir.")}
        </div>
      </div>

      <div className="lmn-calibration-live-signals">
        <div>
          <span>Empatia</span>
          <strong>{empathy}%</strong>
          <small>{toneLabel(empathy, "cercana", "balanceada", "directa")}</small>
        </div>
        <div>
          <span>Direccion</span>
          <strong>{directivity}%</strong>
          <small>{toneLabel(directivity, "proactiva", "guiada", "suave")}</small>
        </div>
        <div>
          <span>Cierre</span>
          <strong>{closing}%</strong>
          <small>{toneLabel(closing, "comercial", "consultivo", "informativo")}</small>
        </div>
      </div>
    </section>
  );
}
