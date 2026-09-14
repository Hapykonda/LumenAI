"use client";

import Image from "next/image";
import { useState } from "react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { getOperator, LUMEN_OPERATORS, type OperatorId, type OperatorMood } from "@/lib/operators/catalog";
import styles from "./operator-showcase.module.css";

const expressions: { mood: OperatorMood; label: string; copy: string }[] = [
  { mood: "welcome", label: "Bienvenida", copy: "Un punto de partida claro. Tu operador te acompaña mientras conoces el sistema." },
  { mood: "thinking", label: "Reflexión", copy: "Tiempo para comprender. Una expresión tranquila acompaña la preparación de una respuesta." },
  { mood: "analyzing", label: "Análisis", copy: "Atención en las señales. El operador indica que está interpretando el contexto disponible." },
  { mood: "explaining", label: "Explicación", copy: "Del dato al siguiente paso. Tu operador ayuda a entender una recomendación." },
  { mood: "working", label: "Trabajo", copy: "Una acción en curso. El estado visual acompaña al progreso que muestra el sistema." },
  { mood: "good-news", label: "Buenas noticias", copy: "Una señal positiva merece claridad. La expresión acompaña al resultado y a su evidencia." },
  { mood: "bad-news", label: "Atención", copy: "Algo necesita revisión. Un gesto sereno acompaña la alerta y la explicación del problema." },
  { mood: "celebrating", label: "Celebración", copy: "Un objetivo cumplido. Una reacción breve reconoce el avance sin interrumpir tu trabajo." },
  { mood: "dancing", label: "Alegría", copy: "Un momento para celebrar. El movimiento es breve y respeta la preferencia de movimiento reducido." },
];

export function OperatorShowcase() {
  const [operatorId, setOperatorId] = useState<OperatorId>("pulse");
  const [mood, setMood] = useState<OperatorMood>("welcome");
  const [surface, setSurface] = useState<"dark" | "light">("dark");
  const operator = getOperator(operatorId);
  const expression = expressions.find((item) => item.mood === mood)!;

  return (
    <div className={styles.showcase} data-surface={surface}>
      <Image src="/brand/editorial/lumenai-mesh-blue.webp" alt="" fill sizes="(max-width: 760px) 100vw, 1200px" className={styles.backdrop} />
      <div className={styles.shade} />
      <div className={styles.toolbar}>
        <span>Elige tu operador</span>
        <div role="group" aria-label="Fondo de la vista previa">
          <button type="button" aria-pressed={surface === "dark"} onClick={() => setSurface("dark")}>Oscuro</button>
          <button type="button" aria-pressed={surface === "light"} onClick={() => setSurface("light")}>Claro</button>
        </div>
      </div>
      <div className={styles.scene}>
        <div className={styles.copy} aria-live="polite" aria-atomic="true">
          <span>{operator.role}</span>
          <h3>{operator.name}</h3>
          <p>{operator.personality}.</p>
          <div className={styles.context}><strong>{expression.label}</strong><p>{expression.copy}</p></div>
        </div>
        <div className={styles.presence}>
          <OperatorAvatar key={`${operatorId}-${mood}`} operator={operatorId} mood={mood} size={240} label={`${operator.name}: ${expression.label}`} />
        </div>
      </div>
      <div className={styles.controls}>
        <div className={styles.operators} role="group" aria-label="Elegir operador de la vista previa">
          {LUMEN_OPERATORS.map((item) => <button type="button" key={item.id} aria-pressed={operatorId === item.id} onClick={() => setOperatorId(item.id)}>{item.name}</button>)}
        </div>
        <label className={styles.expression}>Expresión<select value={mood} onChange={(event) => setMood(event.target.value as OperatorMood)}>{expressions.map((item) => <option key={item.mood} value={item.mood}>{item.label}</option>)}</select></label>
      </div>
      <p className={styles.note}>Puedes cambiar tu elección desde Interfaz, en el panel.</p>
    </div>
  );
}
