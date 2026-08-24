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
  storageKey,
  children,
  reverseLayout = false,
}: SectionIntroGateProps) {
  const { operatorId } = usePanel();
  const operator = getOperator(operatorId);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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
          onClick={() => setOpen(true)}
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
                {operator.name} · guía activa
              </span>
            </div>

            <div className={styles.content}>
              <span className={styles.eyebrow}>Recorrido de la sección</span>
              <h2 id={titleId}>{title}</h2>
              <p id={descriptionId}>{description}</p>

              <ol className={styles.steps}>
                {bullets.map((bullet, index) => (
                  <li key={bullet}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{bullet}</p>
                  </li>
                ))}
              </ol>

              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => close("completed")} data-autofocus>
                  {primaryActionLabel}
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
