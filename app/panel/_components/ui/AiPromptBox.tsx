"use client";

import { PromptInputBox } from "@/components/ai-prompt-box";
import { cn } from "@/lib/utils";

type AiPromptBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  suggestions?: string[];
  onSuggestion?: (value: string) => void;
  className?: string;
};

export function AiPromptBox({
  value,
  onChange,
  onSubmit,
  placeholder = "Pidele a LumenAI que configure el panel...",
  disabled,
  busy,
  suggestions = [],
  onSuggestion,
  className,
}: AiPromptBoxProps) {
  function handleSend(message: string) {
    const clean = message.trim();
    if (!clean || disabled || busy) return;

    onSubmit(clean);
  }

  return (
    <div className={cn("lmn-config-prompt-21st", className)}>
      {suggestions.length ? (
        <div className="lmn-config-prompt-21st-suggestions" aria-label="Acciones rapidas">
          {suggestions.slice(0, 5).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled || busy}
              onClick={() => {
                if (disabled || busy) return;
                if (onSuggestion) {
                  onSuggestion(suggestion);
                  return;
                }
                onChange(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <PromptInputBox
        value={value}
        onValueChange={onChange}
        onSend={handleSend}
        isLoading={busy}
        placeholder={placeholder}
        className="lmn-config-prompt-21st-box"
      />
    </div>
  );
}
