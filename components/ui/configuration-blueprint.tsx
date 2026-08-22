import {
  CheckCircle2,
  Database,
  GitCompare,
  MessageSquareText,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";

type Proposal = {
  title: string;
  summary: string;
  confidence: number;
  actions: string[];
  blocked: string[];
  knowledgeItems: Array<{ title: string; type: string; content: string }>;
  automationRules: Array<{ key: string; name: string }>;
};

type ConfigurationBlueprintProps = {
  proposal: Proposal | null;
  score: number;
};

function BlueprintRow({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: typeof Sparkles;
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="lmn-blueprint-row">
      <span>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <em>{value}</em>
    </div>
  );
}

function firstMatching(items: string[], pattern: RegExp, fallback: string) {
  return items.find((item) => pattern.test(item)) || fallback;
}

export function ConfigurationBlueprint({ proposal, score }: ConfigurationBlueprintProps) {
  if (!proposal) {
    return (
      <section className="lmn-configuration-blueprint">
        <div className="lmn-blueprint-empty">
          <Sparkles className="h-5 w-5" />
          <strong>Esperando instruccion</strong>
          <p>Describe el negocio, el tono, los canales y el objetivo. Config AI preparara un blueprint revisable.</p>
        </div>
        <BlueprintRow icon={SlidersHorizontal} title="Preparacion" value={`${score}%`} detail="Estado actual del panel" />
        <BlueprintRow icon={Database} title="Knowledge" value="Por auditar" detail="Precios, politicas, servicios y FAQs" />
        <BlueprintRow icon={ShieldCheck} title="Aplicacion segura" value="Draft" detail="Nada se publica sin revision" />
      </section>
    );
  }

  const identity = firstMatching(
    proposal.actions,
    /nombre|identidad|marca|asistente|tono|personalidad/i,
    "Ajusta identidad, tono y forma de presentarse cuando el prompt lo requiere.",
  );
  const sales = firstMatching(
    proposal.actions,
    /venta|lead|conversion|whatsapp|contacto|promocion|agenda|deriv/i,
    "Prioriza conversion, captura de contacto y siguiente paso comercial.",
  );
  const rules = firstMatching(
    proposal.actions,
    /regla|guardrail|humano|politica|respuesta|seguridad/i,
    "Mantiene reglas claras y deja cambios sensibles en borrador.",
  );
  const knowledge = proposal.knowledgeItems[0]?.title || "Recomienda datos faltantes sin inventar informacion.";

  return (
    <section className="lmn-configuration-blueprint">
      <div className="lmn-blueprint-title">
        <span>Blueprint generado</span>
        <strong>{proposal.title}</strong>
        <p>{proposal.summary}</p>
      </div>

      <BlueprintRow icon={CheckCircle2} title="Cambios propuestos" value={proposal.actions.length} detail="Ajustes listos para revisar" />
      <BlueprintRow icon={Database} title="Knowledge sugerido" value={proposal.knowledgeItems.length} detail="Contenido que puede mejorar precision" />
      <BlueprintRow icon={ShieldCheck} title="Automatizaciones" value={proposal.automationRules.length} detail="Reglas preparadas por Config AI" />
      <BlueprintRow icon={Sparkles} title="Confianza" value={`${proposal.confidence}%`} detail="Seguridad de la propuesta" />

      <div className="lmn-blueprint-architecture">
        <div>
          <span><Sparkles className="h-3.5 w-3.5" /> Identidad</span>
          <p>{identity}</p>
        </div>
        <div>
          <span><Target className="h-3.5 w-3.5" /> Estrategia comercial</span>
          <p>{sales}</p>
        </div>
        <div>
          <span><ShieldCheck className="h-3.5 w-3.5" /> Reglas</span>
          <p>{rules}</p>
        </div>
        <div>
          <span><Database className="h-3.5 w-3.5" /> Knowledge</span>
          <p>{knowledge}</p>
        </div>
      </div>

      <div className="lmn-blueprint-diff">
        <div className="lmn-blueprint-diff-head">
          <GitCompare className="h-4 w-4" />
          <strong>Diff de cambios</strong>
        </div>
        <div className="grid gap-2">
          {proposal.actions.slice(0, 4).map((action) => (
            <div key={action} className="lmn-blueprint-diff-row is-create">
              <span>Modificar</span>
              <p>{action}</p>
            </div>
          ))}
          {proposal.knowledgeItems.slice(0, 3).map((item) => (
            <div key={`${item.type}-${item.title}`} className="lmn-blueprint-diff-row is-knowledge">
              <span>Crear knowledge</span>
              <p>{item.title}</p>
            </div>
          ))}
          {proposal.blocked.slice(0, 2).map((item) => (
            <div key={item} className="lmn-blueprint-diff-row is-blocked">
              <span>Confirmar</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lmn-config-live-preview">
        <div className="lmn-blueprint-diff-head">
          <MessageSquareText className="h-4 w-4" />
          <strong>Preview vivo</strong>
        </div>
        <div className="lmn-config-preview-bubble is-user">Busco una solucion y quiero saber si me conviene.</div>
        <div className="lmn-config-preview-bubble is-assistant">
          <span>{proposal.confidence >= 75 ? "\u2728" : "\u{1F4A1}"}</span>
          <p>{proposal.summary.length > 150 ? `${proposal.summary.slice(0, 150)}...` : proposal.summary}</p>
        </div>
        <div className="lmn-config-preview-route">
          <Route className="h-3.5 w-3.5" />
          <span>Al aplicar, los cambios quedan en borrador y luego puedes publicar calibracion.</span>
        </div>
      </div>
    </section>
  );
}
