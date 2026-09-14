"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, MessageSquareText } from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { getOperator } from "@/lib/operators/catalog";
import { usePanel } from "./panel-context";
import type { ModuleExperience } from "./module-experience";

const moduleCopy: Record<string, { title: string; description: string; action?: string }> = {
  overview: { title: "Resumen de tu empresa", description: "Actividad reciente, prioridades y tareas pendientes.", action: "Revisar prioridades" },
  calibration: { title: "Identidad del negocio", description: "Define cómo se presenta tu empresa y cómo responde a tus clientes." },
  "config-ai": { title: "Configuración asistida", description: "Describe un cambio y revisa la propuesta antes de aplicarla." },
  "lumen-eye": { title: "Análisis del negocio", description: "Revisa el tráfico, las conversiones y el rendimiento de tus canales." },
  "pulse-radar": { title: "Pulse Radar", description: "Reúne las señales del negocio y decide qué atender primero.", action: "Ver resumen" },
  research: { title: "Investigación", description: "Consulta el mercado con fuentes, fechas y hallazgos verificables." },
  widget: { title: "Tu asistente web", description: "Configura el diseño, las respuestas y la instalación en tu sitio." },
  chats: { title: "Conversaciones", description: "Consulta mensajes y continúa la atención de tus clientes." },
  knowledge: { title: "Conocimiento", description: "Organiza la información que tu equipo y tu asistente necesitan." },
  interface: { title: "Tu espacio de trabajo", description: "Elige tu operador y ajusta la apariencia del panel." },
  access: { title: "Cuenta y permisos", description: "Administra tu perfil, tu equipo y los accesos al negocio.", action: "Volver al resumen" },
};

export function ModuleStage({ experience, compact = false }: { experience: ModuleExperience; compact?: boolean }) {
  const { operatorId } = usePanel();
  const operator = getOperator(operatorId);
  const copy = moduleCopy[experience.id] ?? { title: experience.title, description: experience.description };
  return (
    <section className="lmx-module-stage" data-visual={experience.visual} data-compact={compact ? "true" : "false"} style={{ "--lmx-module-accent": experience.accentColor } as CSSProperties} aria-labelledby={`lmx-stage-title-${experience.id}`}>
      <Image className="lmn-stage-background" src="/brand/editorial/lumenai-mesh-blue.webp" alt="" fill sizes="(max-width: 1024px) 100vw, 80vw" />
      <div className="lmx-stage-copy">
        <h1 id={`lmx-stage-title-${experience.id}`}>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="lmx-stage-actions">
          <Link href={experience.actionHref} className="lmx-stage-primary">{copy.action ?? experience.actionLabel}<ArrowUpRight aria-hidden="true" /></Link>
          <button type="button" className="lmx-stage-secondary" onClick={() => window.dispatchEvent(new Event("lumenai:pulse-open"))}><MessageSquareText aria-hidden="true" />Consultar a {operator.name}</button>
        </div>
      </div>
      <div className="lmx-stage-art">
        <div className="lmn-stage-operator">
          <OperatorAvatar operator={operatorId} mood={experience.visual === "radar" || experience.visual === "eye" ? "analyzing" : "welcome"} size={144} />
          <span>{operator.name}</span>
        </div>
      </div>
    </section>
  );
}
