"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ArrowRight, MessageCircleMore, RotateCcw, Sparkles, X } from "lucide-react";
import { PulsePersona } from "@/components/brand/pulse-persona";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import { getOperator } from "@/lib/operators/catalog";
import { usePanel } from "./panel-context";
import styles from "./section-intro-gate.module.css";

type SectionIntroGateProps = {
  title: ReactNode;
  description: ReactNode;
  bullets: string[];
  primaryActionLabel?: string;
  skipActionLabel?: string;
  storageKey: string;
  children: ReactNode;
  reverseLayout?: boolean;
};

export default function SectionIntroGate({
  title,
  description,
  bullets,
  primaryActionLabel = "Entrar al área",
  skipActionLabel = "Omitir",
  storageKey: rawStorageKey,
  children,
  reverseLayout = false,
}: SectionIntroGateProps) {
  const { operatorId } = usePanel();
  const operator = getOperator(operatorId);
  const titleId = useId();
  const descriptionId = useId();
  const storageKey = `${rawStorageKey}:studio-v2`;
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const close = useCallback(
    (result: "completed" | "skipped" = "completed") => {
      try {
        window.localStorage.setItem(storageKey, result);
      } catch {
        // The tutorial remains usable when storage is unavailable.
      }
      setOpen(false);
    },
    [storageKey],
  );

  const dialogRef = useModalAccessibility<HTMLElement>({
    active: open,
    onClose: () => close("skipped"),
  });

  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(window.localStorage.getItem(storageKey));
    } catch {
      seen = false;
    }
    const frame = window.requestAnimationFrame(() => {
      setOpen(!seen);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  function advance() {
    if (activeStep < bullets.length - 1) {
      setActiveStep((current) => current + 1);
      return;
    }
    close("completed");
  }

  function openAssistant() {
    close("completed");
    window.setTimeout(() => {
      window.dispatchEvent(new Event("lumenai:pulse-open"));
    }, 120);
  }

  return (
    <>
      {children}

      {hydrated && !open ? (
        <button
          type="button"
          className={styles.reopen}
          onClick={() => {
            setActiveStep(0);
            setOpen(true);
          }}
          aria-label={`Volver a ver el tutorial de esta sección con ${operator.name}`}
        >
          <PulsePersona size={30} expression="greeting" />
          <span>Tutorial</span>
          <RotateCcw aria-hidden="true" />
        </button>
      ) : null}

      {hydrated && open ? (
        <div className={styles.backdrop} data-publishing="false">
          <section
            ref={dialogRef}
            className={styles.dialog}
            data-reverse={reverseLayout ? "true" : "false"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
          >
            <button
              type="button"
              className={styles.close}
              onClick={() => close("skipped")}
              aria-label={skipActionLabel}
            >
              <X aria-hidden="true" />
            </button>

            <div className={styles.personaStage} aria-hidden="true">
              <span className={styles.orbitOne} />
              <span className={styles.orbitTwo} />
              <PulsePersona className={styles.persona} size={230} expression="greeting" />
              <span className={styles.personaLabel}>
                <Sparkles />
                {operator.name} · operador elegido
              </span>
              <span className={styles.stageIndex}>LUMEN / {String(activeStep + 1).padStart(2, "0")}</span>
            </div>

            <div className={styles.content}>
              <span className={styles.eyebrow}>Recorrido de la sección</span>
              <h2 id={titleId}>{title}</h2>
              <p id={descriptionId}>{description}</p>

              <div className={styles.progress} aria-label={`Paso ${activeStep + 1} de ${bullets.length}`}>
                <span style={{ width: `${((activeStep + 1) / Math.max(bullets.length, 1)) * 100}%` }} />
                <small>{String(activeStep + 1).padStart(2, "0")} / {String(bullets.length).padStart(2, "0")}</small>
              </div>

              <ol className={styles.steps}>
                {bullets.map((bullet, index) => (
                  <li key={bullet} data-active={index === activeStep ? "true" : "false"}>
                    <button type="button" onClick={() => setActiveStep(index)} aria-current={index === activeStep ? "step" : undefined}>
                      <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.stepCopy}>{bullet}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={advance} data-autofocus>
                  {activeStep === bullets.length - 1 ? primaryActionLabel : "Siguiente paso"}
                  <ArrowRight aria-hidden="true" />
                </button>
                <button type="button" className={styles.assistant} onClick={openAssistant}>
                  <MessageCircleMore aria-hidden="true" />
                  Preguntar a {operator.name}
                </button>
                <button type="button" className={styles.skip} onClick={() => close("skipped")}>
                  {skipActionLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
