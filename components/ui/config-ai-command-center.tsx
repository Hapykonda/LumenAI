"use client";

import { KeyboardEvent } from "react";
import { ArrowRight, Loader2, Rocket, Send, WandSparkles } from "lucide-react";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";
import { ConfigurationBlueprint } from "@/components/ui/configuration-blueprint";
import { ProfessionalTypingMessage } from "@/components/ui/professional-typing-message";

type Proposal = {
  title: string;
  summary: string;
  confidence: number;
  actions: string[];
  blocked: string[];
  knowledgeItems: Array<{ title: string; type: string; content: string }>;
  automationRules: Array<{ key: string; name: string }>;
};

type ConfigAiCommandCenterProps = {
  score: number;
  aiConfigured: boolean;
  businessName: string;
  assistantName: string;
  proposal: Proposal | null;
  value: string;
  suggestions?: string[];
  busy?: boolean;
  publishing?: boolean;
  onChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  onApply?: () => void;
  onPublish?: () => void;
};

export function ConfigAiCommandCenter({
  score,
  aiConfigured,
  businessName,
  assistantName,
  proposal,
  value,
  suggestions = [],
  busy = false,
  publishing = false,
  onChange,
  onSubmit,
  onApply,
  onPublish,
}: ConfigAiCommandCenterProps) {
  const status = busy ? "Disenando propuesta" : proposal ? "Propuesta lista" : aiConfigured ? "Copiloto listo" : "Modo seguro";
  const message = proposal
    ? `${proposal.title}. ${proposal.summary}`
    : `Describe como quieres que ${assistantName} trabaje para ${businessName}. LumenAI preparara una configuracion lista para revisar antes de aplicar cambios.`;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <section className="lmn-config-ai-command-center">
      <AnimatedHeroLights intensity={proposal ? "high" : "medium"} />
      <div className="lmn-config-ai-command-copy">
        <span className="lmn-command-eyebrow">
          <WandSparkles className="h-3.5 w-3.5" />
          Config AI Command Center
        </span>
        <h2>Config AI</h2>
        <p className="lmn-config-ai-subtitle">
          Describe como quieres que trabaje tu asistente y LumenAI preparara una configuracion lista para revisar.
        </p>
        <ProfessionalTypingMessage
          thinking={busy}
          badge={status}
          segments={[
            { text: aiConfigured ? "Motor activo. " : "Modo seguro. ", highlight: true },
            { text: message },
          ]}
          speedMs={12}
        />

        <div className="lmn-config-ai-composer">
          <textarea
            aria-label="Instrucciones para Config AI"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            rows={5}
            placeholder="Ej: Quiero que mi asistente venda zapatillas urbanas con tono cercano, destaque promociones y derive clientes por WhatsApp."
          />
          <div className="lmn-config-ai-composer-footer">
            <span>Ctrl/⌘ + Enter para generar blueprint</span>
            <button type="button" disabled={busy || !value.trim()} onClick={() => onSubmit()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generar propuesta
            </button>
          </div>
        </div>

        {suggestions.length ? (
          <div className="lmn-config-ai-suggestions">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button key={suggestion} type="button" disabled={busy} onClick={() => onSubmit(suggestion)}>
                <span>{suggestion}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="lmn-config-ai-actions">
          <button type="button" disabled={!proposal || busy} onClick={onApply}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            Aplicar configuracion
          </button>
          <button type="button" disabled={!proposal || publishing} onClick={onPublish}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publicar calibracion
          </button>
        </div>
      </div>

      <ConfigurationBlueprint proposal={proposal} score={score} />
    </section>
  );
}
