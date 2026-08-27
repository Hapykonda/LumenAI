"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Activity, ArrowUpRight, Radio, Sparkles } from "lucide-react";
import { OperatorAvatar } from "@/components/brand/operator-avatar";
import { LumenLogo } from "@/components/brand/lumen-logo";
import { usePanel } from "./panel-context";
import type { ModuleExperience } from "./module-experience";

function SpecificVisualBody({ experience }: { experience: ModuleExperience }) {
  const Icon = experience.icon;

  switch (experience.visual) {
    case "flow":
      return (
        <div className="lmx-viz-flow">
          <span><i>01</i><strong>Intención</strong><small>definida</small></span>
          <b aria-hidden="true" />
          <span><i>02</i><strong>Control</strong><small>humano</small></span>
          <b aria-hidden="true" />
          <span><i>03</i><strong>Acción</strong><small>verificada</small></span>
        </div>
      );
    case "approval":
      return (
        <div className="lmx-viz-approval">
          <span><i>01</i><strong>Actualizar catálogo</strong><em data-state="ready">Listo</em></span>
          <span><i>02</i><strong>Enviar campaña</strong><em data-state="review">Revisar</em></span>
          <span><i>03</i><strong>Cambiar permisos</strong><em data-state="locked">Bloqueado</em></span>
        </div>
      );
    case "shield":
      return (
        <div className="lmx-viz-shield">
          <span className="lmx-viz-shield-core"><Icon aria-hidden="true" /><b>NIVEL 02</b></span>
          <span><i />Datos</span>
          <span><i />Horario</span>
          <span><i />Riesgo</span>
        </div>
      );
    case "spectrum":
      return (
        <div className="lmx-viz-spectrum">
          <div><span>Precisión</span><i><b style={{ width: "88%" }} /></i><em>88</em></div>
          <div><span>Cercanía</span><i><b style={{ width: "72%" }} /></i><em>72</em></div>
          <div><span>Conversión</span><i><b style={{ width: "81%" }} /></i><em>81</em></div>
          <footer><strong>VOICE DNA</strong><span>A</span><span>B</span><span>C</span><span>D</span></footer>
        </div>
      );
    case "conversation":
      return (
        <div className="lmx-viz-conversation">
          <div className="lmx-viz-chat">
            <span><i>YOU</i>Vendemos consultoría B2B y necesitamos una voz más precisa.</span>
            <span><i>AI</i>Preparé una arquitectura en tres capas.</span>
          </div>
          <div className="lmx-viz-blueprint">
            <small>BLUEPRINT / 03</small>
            <span><i />Identidad</span><span><i />Ventas</span><span><i />Límites</span>
          </div>
        </div>
      );
    case "eye":
      return (
        <div className="lmx-viz-eye">
          <span className="lmx-viz-crosshair"><i /><b /><Icon aria-hidden="true" /></span>
          <div><span><i />Actividad</span><strong>24h</strong></div>
          <div><span><i />Anomalías</span><strong>02</strong></div>
          <div><span><i />Cobertura</span><strong>78%</strong></div>
        </div>
      );
    case "research":
      return (
        <div className="lmx-viz-research">
          <span data-layer="3"><i>03</i><strong>Síntesis ejecutiva</strong><small>Confianza alta</small></span>
          <span data-layer="2"><i>02</i><strong>Hallazgos</strong><small>8 señales</small></span>
          <span data-layer="1"><i>01</i><strong>Fuentes</strong><small>12 referencias</small></span>
        </div>
      );
    case "growth":
      return (
        <div className="lmx-viz-growth">
          <header><span>PIPELINE</span><strong>+24.8%</strong></header>
          <div className="lmx-viz-bars"><i style={{ height: "34%" }} /><i style={{ height: "49%" }} /><i style={{ height: "42%" }} /><i style={{ height: "68%" }} /><i style={{ height: "82%" }} /><i style={{ height: "74%" }} /></div>
          <footer><span>DESCUBRIR</span><span>PRIORIZAR</span><span>CONVERTIR</span></footer>
        </div>
      );
    case "twin":
      return (
        <div className="lmx-viz-twin">
          <section><small>ESCENARIO A</small><strong>Base actual</strong><span><i style={{ width: "58%" }} /></span><em>58</em></section>
          <b>VS</b>
          <section data-winning="true"><small>ESCENARIO B</small><strong>Nueva oferta</strong><span><i style={{ width: "84%" }} /></span><em>84</em></section>
        </div>
      );
    case "knowledge":
      return (
        <div className="lmx-viz-knowledge">
          <aside><span>01</span><span>02</span><span>03</span><span>04</span></aside>
          <section><small>MEMORIA / PUBLICADA</small><strong>Políticas comerciales</strong><p><i />Precios y servicios</p><p><i />Pagos y garantías</p><p><i />Preguntas frecuentes</p></section>
        </div>
      );
    case "chat":
      return (
        <div className="lmx-viz-inbox">
          <aside><span data-active="true"><i>MP</i><b>María P.</b><small>Quiero cotizar</small></span><span><i>CL</i><b>Carlos L.</b><small>Seguimiento</small></span></aside>
          <section><small>CONVERSACIÓN ACTIVA</small><span>Hola, ¿podrían orientarme?</span><span data-user="true">Claro. ¿Qué necesitas resolver?</span><footer><i />Respuesta preparada</footer></section>
        </div>
      );
    case "leads":
      return (
        <div className="lmx-viz-leads">
          <section><small>NUEVOS</small><span>12</span><i style={{ width: "100%" }} /></section>
          <section><small>CALIFICADOS</small><span>08</span><i style={{ width: "72%" }} /></section>
          <section><small>PROPUESTA</small><span>05</span><i style={{ width: "48%" }} /></section>
          <section><small>CIERRE</small><span>03</span><i style={{ width: "31%" }} /></section>
        </div>
      );
    case "widget":
      return (
        <div className="lmx-viz-widget">
          <div className="lmx-viz-browser"><header><i /><i /><i /><span>tumarca.cl</span></header><main><small>CONCIERGE / ONLINE</small><span>¿En qué puedo ayudarte hoy?</span><p>Escribe tu consulta… <b>↗</b></p></main></div>
          <aside><span>DESKTOP</span><span>MOBILE</span><strong>LIVE</strong></aside>
        </div>
      );
    case "integration":
      return (
        <div className="lmx-viz-integration">
          <span className="lmx-viz-integration-core"><Icon aria-hidden="true" /><small>LUMEN</small></span>
          <span data-node="1">CRM<i /></span><span data-node="2">MAIL<i /></span><span data-node="3">WEB<i /></span><span data-node="4">DATA<i /></span>
        </div>
      );
    case "settings":
      return (
        <div className="lmx-viz-settings">
          <span><i>01</i><strong>Identidad</strong><em data-on="true" /></span>
          <span><i>02</i><strong>Operador</strong><em data-on="true" /></span>
          <span><i>03</i><strong>Experiencia</strong><em /></span>
          <footer><b>CAMBIOS SINCRONIZADOS</b><small>v3.0</small></footer>
        </div>
      );
    case "appearance":
      return (
        <div className="lmx-viz-appearance">
          <div><i style={{ background: "#2d6cff" }} /><i style={{ background: "#745cff" }} /><i style={{ background: "#16a36f" }} /><i style={{ background: "#f06b4f" }} /></div>
          <strong>Aa</strong><span>Una interfaz clara<br /><b>para decidir mejor.</b></span>
          <footer><small>TYPE / INTER</small><small>CONTRAST / AA</small></footer>
        </div>
      );
    case "health":
      return (
        <div className="lmx-viz-health">
          <div className="lmx-viz-health-score"><span>94</span><small>SCORE</small></div>
          <section><span><i data-state="ok" />API<strong>100%</strong></span><span><i data-state="ok" />Widget<strong>99.9%</strong></span><span><i data-state="warn" />Pagos<strong>Pendiente</strong></span></section>
        </div>
      );
    default:
      return (
        <div className="lmx-stage-diagram-body">
          <span className="lmx-stage-symbol-core"><Icon aria-hidden="true" /></span>
          <div className="lmx-stage-diagram-signals">
            {experience.signals.map((signal, index) => (
              <span key={signal}><i>{String(index + 1).padStart(2, "0")}</i><strong>{signal}</strong><em style={{ width: `${82 - index * 15}%` }} /></span>
            ))}
          </div>
        </div>
      );
  }
}

function StageArtwork({ experience }: { experience: ModuleExperience }) {
  const { operatorId } = usePanel();

  if (experience.visual === "command") {
    return (
      <div className="lmx-stage-keyvisual lmx-stage-agency-flyer">
        <Image
          src="/brand/studio/lumenai-cinematic-keyvisual.webp"
          alt="Escultura luminosa con el símbolo de LumenAI"
          fill
          priority
          sizes="(max-width: 980px) 100vw, 48vw"
        />
        <span className="lmx-stage-keyvisual-shade" />
        <span className="lmx-stage-flyer-copy">
          <small>LUMENAI / WEEKLY SIGNAL</small>
          <strong>Intelligence<br />Layer</strong>
        </span>
      </div>
    );
  }

  if (experience.visual === "campaign") {
    return (
      <div className="lmx-stage-poster">
        <Image
          src="/brand/studio/lumenai-editorial-poster.webp"
          alt="Póster editorial con el símbolo de LumenAI"
          fill
          sizes="360px"
        />
      </div>
    );
  }

  if (experience.visual === "radar") {
    return (
      <div className="lmx-stage-radar-operator">
        <span className="lmx-stage-radar-ring lmx-stage-radar-ring-a" />
        <span className="lmx-stage-radar-ring lmx-stage-radar-ring-b" />
        <OperatorAvatar operator={operatorId} mood="analyzing" size={132} priority />
        <span className="lmx-stage-operator-label">
          <Radio aria-hidden="true" /> Pulse está leyendo el sistema
        </span>
      </div>
    );
  }

  return (
    <div className="lmx-stage-diagram lmx-stage-specific" data-visual={experience.visual} aria-hidden="true">
      <header>
        <span><Activity aria-hidden="true" /> Modelo operativo</span>
        <b>LIVE</b>
      </header>
      <div className="lmx-stage-specific-body"><SpecificVisualBody experience={experience} /></div>
      <footer><span>LUMENAI/{experience.id.toUpperCase()}</span><b>{experience.index}</b></footer>
    </div>
  );
}

export function ModuleStage({
  experience,
  compact = false,
}: {
  experience: ModuleExperience;
  compact?: boolean;
}) {
  const Icon = experience.icon;

  return (
    <section
      className="lmx-module-stage"
      data-visual={experience.visual}
      data-compact={compact ? "true" : "false"}
      style={{ "--lmx-module-accent": experience.accentColor } as CSSProperties}
      aria-labelledby={`lmx-stage-title-${experience.id}`}
    >
      <div className="lmx-stage-grid" aria-hidden="true" />
      <div className="lmx-stage-copy">
        <div className="lmx-stage-meta">
          <span className="lmx-stage-index">{experience.index}</span>
          <span className="lmx-stage-eyebrow"><Icon aria-hidden="true" /> {experience.eyebrow}</span>
          <span className="lmx-stage-live"><i aria-hidden="true" /> {experience.status}</span>
        </div>
        <h1 id={`lmx-stage-title-${experience.id}`}>
          <span>{experience.title}</span>
          <em>{experience.accent}</em>
        </h1>
        <p>{experience.description}</p>
        <div className="lmx-stage-actions">
          <Link href={experience.actionHref} className="lmx-stage-primary">
            {experience.actionLabel}<ArrowUpRight aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="lmx-stage-secondary"
            onClick={() => window.dispatchEvent(new Event("lumenai:pulse-open"))}
          >
            <Sparkles aria-hidden="true" /> Preguntar a Pulse
          </button>
        </div>
      </div>

      <div className="lmx-stage-art">
        <StageArtwork experience={experience} />
      </div>

      <div className="lmx-stage-rail" aria-label="Flujo del módulo">
        <LumenLogo compact size="sm" />
        {experience.signals.map((signal, index) => (
          <span key={signal}><i>{String(index + 1).padStart(2, "0")}</i>{signal}</span>
        ))}
        <b>LUMENAI / {experience.id.toUpperCase()}</b>
      </div>
    </section>
  );
}
