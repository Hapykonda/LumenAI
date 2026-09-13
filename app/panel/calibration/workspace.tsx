"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileDiff,
  Gauge,
  History,
  LayoutDashboard,
  LoaderCircle,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Undo2,
  UserRound,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CalibrationDoc } from "./types";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import styles from "./workspace.module.css";

export type CalibrationStageKey = "base" | "persona" | "sales" | "rules" | "review";

export type CalibrationSectionKey =
  | "overview"
  | "identity"
  | "personality"
  | "tone"
  | "sales"
  | "objections"
  | "guardrails"
  | "escalation"
  | "review";

export type CalibrationWorkspaceStatus =
  | "loading"
  | "dirty"
  | "saving"
  | "saved"
  | "publishing"
  | "published"
  | "error";

export type CalibrationReadinessSignal = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  stage: CalibrationStageKey;
};

export type CalibrationReadinessSummary = {
  done: number;
  total: number;
  score: number;
  next?: CalibrationReadinessSignal;
  signals: CalibrationReadinessSignal[];
};

type BlueprintOption = {
  id: string;
  name: string;
};

type CalibrationWorkspaceProps = {
  draft: CalibrationDoc;
  published: CalibrationDoc | null;
  publicKey: string;
  businessName: string;
  stage: CalibrationStageKey;
  activeSection: CalibrationSectionKey;
  activeBlueprintId?: string;
  activeBlueprintName: string;
  blueprintOptions: BlueprintOption[];
  readiness: CalibrationReadinessSummary;
  completion: { done: number; total: number; percent: number };
  status: CalibrationWorkspaceStatus;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  error: string | null;
  lastModified?: string | null;
  editorOpen: boolean;
  editorContent: ReactNode;
  onSectionChange: (section: CalibrationSectionKey, openEditor?: boolean) => void;
  onCloseEditor: () => void;
  onBehaviorChange: (key: string, value: number) => void;
  onApplyBlueprint: (id: string) => void;
  onReload: () => void;
  onUndo: () => void;
  onResetPreset: () => void;
  onDiscard: () => void;
  onPublish: () => Promise<boolean>;
  canUndo: boolean;
};

type LabDiagnostics = {
  source?: string;
  rules?: string[];
  objections?: string[];
  knowledge?: {
    contextIncluded?: boolean;
    characters?: number;
  };
  guardrails?: {
    active?: string[];
    escalationSuggested?: boolean;
  };
};

type LabResponse = {
  ok?: boolean;
  reply?: string;
  error?: string;
  previewDiagnostics?: LabDiagnostics;
};

type SectionScore = {
  key: CalibrationSectionKey;
  stage: CalibrationStageKey;
  label: string;
  score: number;
  state: "complete" | "warning" | "error";
};

type BehaviorPoint = {
  key: string;
  label: string;
  value: number;
};

const SECTION_RAIL: Array<{
  key: CalibrationSectionKey;
  label: string;
  stage: CalibrationStageKey;
  icon: typeof Activity;
}> = [
  { key: "overview", label: "Resumen", stage: "base", icon: LayoutDashboard },
  { key: "identity", label: "Identidad", stage: "base", icon: UserRound },
  { key: "personality", label: "Personalidad", stage: "persona", icon: BrainCircuit },
  { key: "tone", label: "Tono", stage: "persona", icon: Volume2 },
  { key: "sales", label: "Ventas", stage: "sales", icon: Target },
  { key: "objections", label: "Objeciones", stage: "sales", icon: MessageSquareText },
  { key: "guardrails", label: "Guardrails", stage: "rules", icon: ShieldCheck },
  { key: "escalation", label: "Escalamiento", stage: "rules", icon: ShieldAlert },
  { key: "review", label: "Revisión final", stage: "review", icon: Rocket },
];

const BEHAVIOR_TABS: Array<{
  label: string;
  section: CalibrationSectionKey;
  stage: CalibrationStageKey;
}> = [
  { label: "Identidad", section: "identity", stage: "base" },
  { label: "Personalidad", section: "personality", stage: "persona" },
  { label: "Ventas", section: "sales", stage: "sales" },
  { label: "Objeciones", section: "objections", stage: "sales" },
  { label: "Guardrails", section: "guardrails", stage: "rules" },
];

const LAB_SCENARIOS = [
  { id: "price", label: "Consulta de precio", prompt: "Quiero saber el precio y qué opción me conviene." },
  { id: "objection", label: "Objeción", prompt: "Me parece caro y no estoy seguro de que funcione." },
  { id: "discount", label: "Solicitud de descuento", prompt: "¿Pueden hacerme un descuento si compro hoy?" },
  { id: "upset", label: "Cliente molesto", prompt: "Estoy molesto porque nadie me ha respondido." },
  { id: "human", label: "Solicitud humana", prompt: "Quiero hablar con una persona de su equipo." },
  { id: "unknown", label: "Sin información", prompt: "¿Ofrecen una garantía internacional de diez años?" },
  { id: "closing", label: "Cierre de venta", prompt: "Me interesa. ¿Cuál es el siguiente paso para contratar?" },
];

const BEHAVIOR_LABELS: Record<string, string> = {
  joy: "Alegría",
  energy: "Energía",
  sobriety: "Sobriedad",
  elegance: "Elegancia",
  closeness: "Cercanía",
  empathy: "Empatía",
  brevity: "Brevedad",
  directivity: "Dirección",
  humor: "Humor",
  audacity: "Audacia",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : fallback;
}

function hasText(value: unknown, min = 3) {
  return typeof value === "string" && value.trim().length >= min;
}

function scoreChecks(checks: boolean[]) {
  if (!checks.length) return 0;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function countDifferences(left: unknown, right: unknown): number {
  if (Object.is(left, right)) return 0;

  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null) ? 0 : 1;
  }

  const a = asRecord(left);
  const b = asRecord(right);
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (!aKeys.length && !bKeys.length) return 1;

  return Array.from(new Set([...aKeys, ...bKeys])).reduce(
    (total, key) => total + countDifferences(a[key], b[key]),
    0
  );
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Sin registro";

  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "Sin registro";
  }
}

function statusCopy(status: CalibrationWorkspaceStatus, dirty: boolean) {
  if (status === "loading") return "Cargando datos";
  if (status === "saving") return "Guardando";
  if (status === "publishing") return "Publicando";
  if (status === "published") return "Publicado";
  if (status === "error") return "Error al guardar";
  if (dirty) return "Cambios pendientes";
  return "Guardado";
}

function sectionScores(draft: CalibrationDoc): SectionScore[] {
  const identity = draft.calibration.identity;
  const personality = draft.calibration.personality;
  const brief = draft.calibration.brandBrief;
  const sales = asRecord(draft.calibration.sales);
  const guardrails = asRecord(draft.calibration.guardrails);
  const escalation = asRecord(guardrails.escalate);
  const objections = asRecord(sales.objectionHandling);
  const lexicon = draft.calibration.lexicon;

  const rows: Array<Omit<SectionScore, "score" | "state"> & { checks: boolean[] }> = [
    {
      key: "identity",
      stage: "base",
      label: "Identidad",
      checks: [
        hasText(identity.brandName),
        hasText(identity.assistantName),
        hasText(identity.tagline),
        hasText(brief.idealCustomer),
        hasText(brief.differentiation),
      ],
    },
    {
      key: "personality",
      stage: "persona",
      label: "Personalidad",
      checks: [
        hasText(personality.freeNotes, 12),
        hasText(sales.profileId),
        Boolean(personality.rules.reflectUnderstandingFirst),
        numeric(personality.rules.maxOptions) > 0,
      ],
    },
    {
      key: "sales",
      stage: "sales",
      label: "Ventas",
      checks: [
        hasText(sales.discoveryModel, 18),
        hasText(sales.closingStyle, 18),
        numeric(sales.proactivity) > 0,
        numeric(sales.closing) > 0,
      ],
    },
    {
      key: "objections",
      stage: "sales",
      label: "Objeciones",
      checks: [
        hasText(brief.objections, 10),
        Object.values(objections).some(Boolean),
        hasText(sales.objectionPlaybook, 18),
      ],
    },
    {
      key: "guardrails",
      stage: "rules",
      label: "Guardrails",
      checks: [
        Boolean(escalation.enabled),
        asStringArray(escalation.when).length >= 2,
        asStringArray(lexicon.allowedPhrases).length > 0,
        asStringArray(lexicon.forbiddenPhrases).length > 0,
      ],
    },
    {
      key: "tone",
      stage: "rules",
      label: "Brand Constitution",
      checks: [
        asStringArray(identity.values).length >= 2,
        hasText(brief.howToSound, 12),
        hasText(brief.howNotToSound, 12),
        asStringArray(lexicon.forbiddenPhrases).length > 0,
      ],
    },
  ];

  return rows.map((row) => {
    const score = scoreChecks(row.checks);
    return {
      key: row.key,
      stage: row.stage,
      label: row.label,
      score,
      state: score === 100 ? "complete" : score >= 50 ? "warning" : "error",
    };
  });
}

function sectionStateForRail(section: CalibrationSectionKey, scores: SectionScore[]) {
  if (section === "overview") {
    return scores.every((item) => item.score === 100) ? "complete" : "warning";
  }

  if (section === "tone") {
    return scores.find((item) => item.key === "tone")?.state ?? "warning";
  }

  if (section === "escalation") {
    return scores.find((item) => item.key === "guardrails")?.state ?? "warning";
  }

  if (section === "review") {
    return scores.every((item) => item.score === 100) ? "complete" : "warning";
  }

  return scores.find((item) => item.key === section)?.state ?? "warning";
}

function behaviorPoints(draft: CalibrationDoc): BehaviorPoint[] {
  const mix = asRecord(draft.calibration.personality.mix);
  const sales = asRecord(draft.calibration.sales);

  return [
    ...Object.keys(BEHAVIOR_LABELS).map((key) => ({
      key,
      label: BEHAVIOR_LABELS[key],
      value: numeric(mix[key], 50),
    })),
    { key: "proactivity", label: "Proactividad", value: numeric(sales.proactivity, 50) },
    { key: "closing", label: "Cierre", value: numeric(sales.closing, 50) },
  ];
}

function CalibrationRail({
  activeSection,
  scores,
  onSectionChange,
}: {
  activeSection: CalibrationSectionKey;
  scores: SectionScore[];
  onSectionChange: (section: CalibrationSectionKey, openEditor?: boolean) => void;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const vertical = event.key === "ArrowDown" || event.key === "ArrowUp";
    const horizontal = event.key === "ArrowRight" || event.key === "ArrowLeft";
    if (!vertical && !horizontal) return;

    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + SECTION_RAIL.length) % SECTION_RAIL.length;
    itemRefs.current[nextIndex]?.focus();
  }

  return (
    <nav className={styles.rail} aria-label="Secciones de Calibration Studio">
      <div className={styles.railMark} aria-hidden="true">
        <Sparkles />
      </div>
      <div className={styles.railItems}>
        {SECTION_RAIL.map((item, index) => {
          const Icon = item.icon;
          const state = sectionStateForRail(item.key, scores);
          const active = activeSection === item.key;

          return (
            <button
              key={item.key}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              className={styles.railButton}
              data-active={active}
              data-state={state}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              onClick={() => onSectionChange(item.key, item.key !== "overview")}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              <Icon />
              <span className={styles.railLabel}>{item.label}</span>
              <i aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className={styles.railEnd} aria-hidden="true">
        <Activity />
      </div>
    </nav>
  );
}

function StudioToolbar({
  businessName,
  assistantName,
  status,
  dirty,
  saving,
  publishing,
  lastModified,
  canUndo,
  publicKey,
  onUndo,
  onResetPreset,
  onCompare,
  onPreview,
  onPublish,
  onReload,
}: {
  businessName: string;
  assistantName: string;
  status: CalibrationWorkspaceStatus;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  lastModified?: string | null;
  canUndo: boolean;
  publicKey: string;
  onUndo: () => void;
  onResetPreset: () => void;
  onCompare: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onReload: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusText = statusCopy(status, dirty);

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarIdentity}>
        <span className={styles.logoBox}>
          <Image src="/brand/editorial/lumenai-mark-transparent.png" width={26} height={26} alt="LumenAI" priority />
        </span>
        <div className={styles.breadcrumb}>
          <span>Principal</span>
          <ChevronRight aria-hidden="true" />
          <strong>Calibration Studio</strong>
        </div>
        <span className={styles.businessStatus}>
          <i aria-hidden="true" />
          {businessName || "Negocio activo"}
        </span>
        <span className={styles.assistantIdentity}>
          <Bot aria-hidden="true" />
          {assistantName || "LumenAI"}
        </span>
      </div>

      <div className={styles.autosave} aria-live="polite">
        {saving || publishing ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Check aria-hidden="true" />}
        <div>
          <strong>{statusText}</strong>
          <span>{dirty ? "Borrador con cambios" : `Última edición ${formatTimestamp(lastModified)}`}</span>
        </div>
      </div>

      <div className={styles.toolbarActions}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Deshacer último cambio"
          title="Deshacer último cambio"
          onClick={onUndo}
          disabled={!canUndo || saving || publishing}
        >
          <Undo2 />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Restablecer preset activo"
          title="Restablecer preset activo"
          onClick={onResetPreset}
          disabled={saving || publishing}
        >
          <RefreshCw />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Comparar borrador y publicado"
          title="Comparar borrador y publicado"
          onClick={onCompare}
        >
          <FileDiff />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Abrir preview"
          title="Abrir preview"
          onClick={onPreview}
          disabled={!publicKey}
        >
          <Eye />
        </button>
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Más acciones"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <MoreHorizontal />
          </button>
          {menuOpen ? (
            <div className={styles.actionMenu}>
              <button type="button" onClick={onReload}>
                <RefreshCw />
                Recargar datos
              </button>
              <button type="button" onClick={onCompare}>
                <History />
                Historial publicado
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onPublish}
          disabled={saving || publishing || !publicKey}
          aria-label={publishing ? "Publicando calibración" : "Publicar calibración"}
        >
          {publishing ? <LoaderCircle className={styles.spin} /> : <Rocket />}
          <span className={styles.publishLabel}>Publicar calibración</span>
        </button>
      </div>
    </header>
  );
}

function EditorialHeader({
  hasPublished,
  dirty,
  completion,
  activeBlueprintId,
  blueprintOptions,
  onApplyBlueprint,
  onTest,
}: {
  hasPublished: boolean;
  dirty: boolean;
  completion: { done: number; total: number; percent: number };
  activeBlueprintId?: string;
  blueprintOptions: BlueprintOption[];
  onApplyBlueprint: (id: string) => void;
  onTest: () => void;
}) {
  const badge = dirty ? "Cambios pendientes" : hasPublished ? "Publicado" : "Draft";

  return (
    <section className={styles.editorialHeader}>
      <div>
        <span className={styles.eyebrow}>AI Behavior Direction</span>
        <div className={styles.titleLine}>
          <h1>Calibration Studio</h1>
          <span className={styles.headerBadge} data-state={dirty ? "pending" : hasPublished ? "published" : "draft"}>
            {badge}
          </span>
        </div>
        <p>Dirige cómo LumenAI piensa, responde, vende y protege la experiencia de tus clientes.</p>
      </div>

      <div className={styles.headerControls}>
        <label className={styles.presetSelect}>
          <span>Preset</span>
          <select value={activeBlueprintId || ""} onChange={(event) => onApplyBlueprint(event.target.value)}>
            <option value="" disabled>
              Seleccionar
            </option>
            {blueprintOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.completionCompact}>
          <span>{completion.done}/{completion.total} señales</span>
          <strong>{completion.percent}%</strong>
          <i style={{ "--progress": `${completion.percent}%` } as CSSProperties} aria-hidden="true" />
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onTest}>
          <MessageSquareText />
          Probar asistente
        </button>
      </div>
    </section>
  );
}

function HealthCard({
  draft,
  published,
  publicKey,
  readiness,
  differenceCount,
  onOpenPending,
}: {
  draft: CalibrationDoc;
  published: CalibrationDoc | null;
  publicKey: string;
  readiness: CalibrationReadinessSummary;
  differenceCount: number;
  onOpenPending: () => void;
}) {
  const personality = draft.calibration.personality;
  const sales = asRecord(draft.calibration.sales);
  const guardrails = asRecord(draft.calibration.guardrails);
  const escalation = asRecord(guardrails.escalate);
  const objections = asRecord(sales.objectionHandling);
  const forbidden = asStringArray(draft.calibration.lexicon.forbiddenPhrases);
  const dontDo = asStringArray(guardrails.dontDo);
  const activeRules = [
    personality.rules.reflectUnderstandingFirst,
    personality.rules.endWithQuestionOrCTA,
    numeric(personality.rules.maxOptions) > 0,
    !Boolean(sales.allowUrgency),
  ].filter(Boolean).length;
  const objectionCount = Object.values(objections).filter(Boolean).length;
  const guardrailCount = dontDo.length + forbidden.length + (escalation.enabled ? 1 : 0);

  return (
    <article className={`${styles.card} ${styles.healthCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardKicker}>Calibration Health</span>
          <h2>Salud general</h2>
        </div>
        <Gauge aria-hidden="true" />
      </div>

      <div className={styles.healthScore}>
        <strong>{readiness.score}%</strong>
        <span>{readiness.done} de {readiness.total} áreas listas</span>
        <i style={{ "--progress": `${readiness.score}%` } as CSSProperties} aria-hidden="true" />
      </div>

      <div className={styles.metricGrid}>
        <div>
          <strong>{activeRules}</strong>
          <span>Reglas activas</span>
        </div>
        <div>
          <strong>{objectionCount}</strong>
          <span>Objeciones</span>
        </div>
        <div>
          <strong>{guardrailCount}</strong>
          <span>Guardrails</span>
        </div>
        <div>
          <strong>{differenceCount}</strong>
          <span>Diferencias</span>
        </div>
      </div>

      <div className={styles.healthFacts}>
        <span>
          <i data-tone={published ? "success" : "warning"} />
          {published ? `Publicada ${formatTimestamp(String(published.compiled?.updatedAt || ""))}` : "Sin publicación"}
        </span>
        <span>
          <i data-tone={publicKey ? "success" : "danger"} />
          Preview {publicKey ? "disponible" : "sin public key"}
        </span>
      </div>

      <button type="button" className={styles.cardLink} onClick={onOpenPending}>
        {readiness.next ? "Ver pendientes" : "Revisar configuración"}
        <ArrowRight />
      </button>
    </article>
  );
}

function BehaviorSpectrumCard({
  draft,
  stage,
  activeSection,
  onSectionChange,
  onBehaviorChange,
}: {
  draft: CalibrationDoc;
  stage: CalibrationStageKey;
  activeSection: CalibrationSectionKey;
  onSectionChange: (section: CalibrationSectionKey, openEditor?: boolean) => void;
  onBehaviorChange: (key: string, value: number) => void;
}) {
  const points = useMemo(() => behaviorPoints(draft), [draft]);
  const [selectedKey, setSelectedKey] = useState("empathy");
  const selected = points.find((point) => point.key === selectedKey) || points[0];

  function adjust(delta: number) {
    onBehaviorChange(selected.key, Math.max(0, Math.min(100, selected.value + delta)));
  }

  return (
    <article className={`${styles.card} ${styles.spectrumCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardKicker}>Behavior Spectrum</span>
          <h2>Comportamiento del asistente</h2>
        </div>
        <div className={styles.spectrumValue}>
          <span>{selected.label}</span>
          <strong>{selected.value}%</strong>
        </div>
      </div>

      <div className={styles.spectrumChart} role="img" aria-label="Espectro de comportamiento configurado">
        {points.map((point) => (
          <button
            key={point.key}
            type="button"
            className={styles.spectrumBar}
            data-selected={selected.key === point.key}
            style={{ "--bar": `${Math.max(8, point.value)}%` } as CSSProperties}
            onClick={() => setSelectedKey(point.key)}
            title={`${point.label}: ${point.value}%`}
            aria-label={`${point.label}: ${point.value}%`}
          >
            <i aria-hidden="true" />
            <span>{point.label.slice(0, 3)}</span>
          </button>
        ))}
      </div>

      <div className={styles.spectrumEditor}>
        <button type="button" className={styles.iconButton} onClick={() => adjust(-5)} aria-label={`Reducir ${selected.label}`}>
          <Minus />
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={selected.value}
          aria-label={selected.label}
          onChange={(event) => onBehaviorChange(selected.key, Number(event.target.value))}
          style={{ "--range": `${selected.value}%` } as CSSProperties}
        />
        <button type="button" className={styles.iconButton} onClick={() => adjust(5)} aria-label={`Aumentar ${selected.label}`}>
          <Plus />
        </button>
      </div>

      <div className={styles.behaviorTabs} role="tablist" aria-label="Dimensiones de calibración">
        {BEHAVIOR_TABS.map((tab) => {
          const active = activeSection === tab.section || (activeSection === "tone" && tab.section === "personality");
          return (
            <button
              key={tab.section}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active || stage === tab.stage && activeSection === "overview"}
              onClick={() => onSectionChange(tab.section, false)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function PublicationProgressCard({
  scores,
  status,
  dirty,
  published,
  differenceCount,
  onOpen,
  onReview,
  onPublish,
}: {
  scores: SectionScore[];
  status: CalibrationWorkspaceStatus;
  dirty: boolean;
  published: CalibrationDoc | null;
  differenceCount: number;
  onOpen: (section: CalibrationSectionKey) => void;
  onReview: () => void;
  onPublish: () => void;
}) {
  const complete = scores.filter((item) => item.score === 100).length;
  const errors = scores.filter((item) => item.state === "error").length;

  return (
    <article className={`${styles.card} ${styles.progressCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardKicker}>Publication Progress</span>
          <h2>Preparación</h2>
        </div>
        <span className={styles.progressCount}>{complete}/{scores.length}</span>
      </div>

      <div className={styles.progressSummary}>
        <span>{scores.length - complete} pendientes</span>
        <span>{errors} errores</span>
        <span>{differenceCount} diferencias</span>
      </div>

      <div className={styles.progressRows}>
        {scores.map((item) => (
          <button key={item.key} type="button" onClick={() => onOpen(item.key)}>
            <span className={styles.rowState} data-state={item.state}>
              {item.state === "complete" ? <Check /> : item.state === "error" ? <CircleAlert /> : <AlertTriangle />}
            </span>
            <span>{item.label}</span>
            <strong>{item.score}%</strong>
            <ChevronRight />
          </button>
        ))}
      </div>

      <div className={styles.publicationState}>
        <span>
          <i data-tone={status === "error" ? "danger" : dirty ? "warning" : "success"} />
          Autosave: {statusCopy(status, dirty)}
        </span>
        <span>
          <i data-tone={published ? "success" : "warning"} />
          Producción: {published ? "publicada" : "sin versión"}
        </span>
      </div>

      <div className={styles.dualActions}>
        <button type="button" className={styles.secondaryButton} onClick={onReview}>
          Revisar pendientes
        </button>
        <button type="button" className={styles.primaryCompact} onClick={onPublish}>
          Publicar
          <ArrowRight />
        </button>
      </div>
    </article>
  );
}

function BrandIdentityCard({
  draft,
  onEdit,
}: {
  draft: CalibrationDoc;
  onEdit: () => void;
}) {
  const identity = draft.calibration.identity;
  const brief = draft.calibration.brandBrief;
  const values = asStringArray(identity.values);
  const quality = scoreChecks([
    hasText(identity.tagline),
    hasText(brief.howToSound, 12),
    hasText(brief.differentiation, 12),
    values.length >= 2,
  ]);

  return (
    <article className={`${styles.card} ${styles.brandCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardKicker}>Brand Identity</span>
          <h2>Lo que el cliente debe sentir</h2>
        </div>
        <span className={styles.qualityBadge} data-state={quality === 100 ? "complete" : "warning"}>
          {quality}% calidad
        </span>
      </div>

      <blockquote>
        {identity.tagline || "La frase de posicionamiento aún no está definida."}
      </blockquote>
      <p>
        {brief.howToSound ||
          brief.differentiation ||
          "Completa la voz y la diferenciación para consolidar una identidad reconocible."}
      </p>

      <div className={styles.valueList}>
        {values.length ? values.slice(0, 4).map((value) => <span key={value}>{value}</span>) : <span>Sin valores definidos</span>}
      </div>

      <div className={styles.lumeniteNote}>
        <Sparkles />
        <div>
          <strong>Recomendación de LumenAI</strong>
          <span>
            {quality === 100
              ? "La identidad tiene suficiente contexto para orientar respuestas consistentes."
              : "Refuerza el posicionamiento y cómo debe sonar antes de publicar."}
          </span>
        </div>
      </div>

      <button type="button" className={styles.cardLink} onClick={onEdit}>
        Editar identidad
        <ArrowRight />
      </button>
    </article>
  );
}

function ConversationLabCard({
  publicKey,
  assistantName,
}: {
  publicKey: string;
  assistantName: string;
}) {
  const [scenario, setScenario] = useState(LAB_SCENARIOS[0].id);
  const [prompt, setPrompt] = useState(LAB_SCENARIOS[0].prompt);
  const [reply, setReply] = useState("");
  const [diagnostics, setDiagnostics] = useState<LabDiagnostics | null>(null);
  const [labError, setLabError] = useState("");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function selectScenario(value: string) {
    setScenario(value);
    const selected = LAB_SCENARIOS.find((item) => item.id === value);
    if (selected) setPrompt(selected.prompt);
  }

  async function runTest() {
    const message = prompt.trim();
    if (!message || !publicKey || running) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 18_000);

    setRunning(true);
    setLabError("");
    setReply("");
    setDiagnostics(null);

    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          key: publicKey,
          visitorId: `calibration_preview_${Date.now()}`,
          message,
          history: [],
          preview: true,
          visitorContext: {
            url: window.location.href,
            referrer: "calibration-studio",
            language: document.documentElement.lang || "es",
          },
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as LabResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `La prueba respondió con estado ${response.status}.`);
      }

      setReply(String(payload.reply || "").trim());
      setDiagnostics(payload.previewDiagnostics || null);
    } catch (error: unknown) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      setLabError(aborted ? "La prueba superó el tiempo de espera. Puedes reintentar." : error instanceof Error ? error.message : "No se pudo ejecutar la prueba.");
    } finally {
      window.clearTimeout(timeout);
      setRunning(false);
    }
  }

  function clearLab() {
    abortRef.current?.abort();
    setReply("");
    setDiagnostics(null);
    setLabError("");
  }

  return (
    <article className={`${styles.card} ${styles.labCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardKicker}>Conversation Lab</span>
          <h2>Prueba el asistente ahora</h2>
        </div>
        <span className={styles.labMode}>Draft seguro</span>
      </div>

      <div className={styles.labControls}>
        <label>
          <span>Escenario</span>
          <select value={scenario} onChange={(event) => selectScenario(event.target.value)}>
            {LAB_SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.labPrompt}>
          <span>Mensaje de prueba</span>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} />
        </label>
        <button
          type="button"
          className={styles.labRun}
          onClick={() => void runTest()}
          disabled={!publicKey || !prompt.trim() || running}
        >
          {running ? <LoaderCircle className={styles.spin} /> : <Zap />}
          {running ? "Probando" : "Ejecutar"}
        </button>
      </div>

      <div className={styles.labOutput} aria-live="polite">
        {labError ? (
          <div className={styles.labError}>
            <CircleAlert />
            <span>{labError}</span>
            <button type="button" onClick={() => void runTest()}>
              Reintentar
            </button>
          </div>
        ) : reply ? (
          <>
            <div className={styles.replyBubble}>
              <span>{assistantName || "LumenAI"}</span>
              <p>{reply}</p>
            </div>
            <div className={styles.traceGrid}>
              <div>
                <span>Reglas influyentes</span>
                <strong>{diagnostics?.rules?.length || 0}</strong>
              </div>
              <div>
                <span>Knowledge</span>
                <strong>{diagnostics?.knowledge?.contextIncluded ? "Incluido" : "Sin contexto"}</strong>
              </div>
              <div>
                <span>Objeción</span>
                <strong>{diagnostics?.objections?.[0] || "No detectada"}</strong>
              </div>
              <div>
                <span>Guardrails</span>
                <strong>{diagnostics?.guardrails?.active?.length || 0}</strong>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.labEmpty}>
            <MessageSquareText />
            <div>
              <strong>Respuesta real sobre el borrador</strong>
              <span>La prueba usa el contexto autenticado y no crea leads ni conversaciones públicas.</span>
            </div>
          </div>
        )}
      </div>

      {reply || labError ? (
        <div className={styles.labFooter}>
          <button type="button" onClick={clearLab}>
            Limpiar
          </button>
          <button type="button" onClick={() => void runTest()} disabled={running}>
            Repetir prueba
          </button>
        </div>
      ) : null}
    </article>
  );
}

function GuardrailsCard({
  draft,
  onOpen,
}: {
  draft: CalibrationDoc;
  onOpen: (section: CalibrationSectionKey) => void;
}) {
  const guardrails = asRecord(draft.calibration.guardrails);
  const escalation = asRecord(guardrails.escalate);
  const dontDo = asStringArray(guardrails.dontDo);
  const forbidden = asStringArray(draft.calibration.lexicon.forbiddenPhrases);
  const promises = String(draft.calibration.brandBrief.promises || "").trim();
  const escalationRules = asStringArray(escalation.when);
  const risks = [
    !escalation.enabled ? "Escalamiento humano desactivado" : "",
    !forbidden.length ? "Lenguaje no permitido sin definir" : "",
    !dontDo.length ? "Promesas bloqueadas sin reglas explícitas" : "",
    !promises ? "Promesa comercial sin documentar" : "",
  ].filter(Boolean);

  return (
    <article className={`${styles.card} ${styles.guardrailsCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardKicker}>Guardrails & Safety</span>
          <h2>Control operativo</h2>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>

      <div className={styles.safetyMetrics}>
        <div>
          <strong>{dontDo.length + forbidden.length}</strong>
          <span>Reglas críticas</span>
        </div>
        <div>
          <strong>{escalationRules.length}</strong>
          <span>Escalamientos</span>
        </div>
        <div>
          <strong>{risks.length}</strong>
          <span>Riesgos</span>
        </div>
      </div>

      <div className={styles.safetyList}>
        <span data-state={escalation.enabled ? "success" : "critical"}>
          {escalation.enabled ? <CheckCircle2 /> : <CircleAlert />}
          Escalamiento humano
          <strong>{escalation.enabled ? "Activo" : "Crítico"}</strong>
        </span>
        <span data-state={forbidden.length ? "success" : "warning"}>
          {forbidden.length ? <CheckCircle2 /> : <AlertTriangle />}
          Lenguaje bloqueado
          <strong>{forbidden.length || "Pendiente"}</strong>
        </span>
        <span data-state={dontDo.length ? "success" : "warning"}>
          {dontDo.length ? <CheckCircle2 /> : <AlertTriangle />}
          Promesas restringidas
          <strong>{dontDo.length || "Pendiente"}</strong>
        </span>
      </div>

      {risks.length ? (
        <p className={styles.riskCopy}>{risks[0]}</p>
      ) : (
        <p className={styles.safeCopy}>No se detectan contradicciones básicas antes de publicar.</p>
      )}

      <div className={styles.dualActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => onOpen("guardrails")}>
          Revisar reglas
        </button>
        <button type="button" className={styles.cardLink} onClick={() => onOpen("escalation")}>
          Abrir escalamiento
          <ArrowRight />
        </button>
      </div>
    </article>
  );
}

function CompareDialog({
  draft,
  published,
  differenceCount,
  onClose,
}: {
  draft: CalibrationDoc;
  published: CalibrationDoc | null;
  differenceCount: number;
  onClose: () => void;
}) {
  const draftScores = sectionScores(draft);
  const publishedScores = published ? sectionScores(published) : [];
  const dialogRef = useModalAccessibility<HTMLElement>({ onClose });

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="compare-title" tabIndex={-1}>
        <div className={styles.dialogHeader}>
          <div>
            <span className={styles.cardKicker}>Draft vs Published</span>
            <h2 id="compare-title">Comparación de calibración</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar comparación">
            <X />
          </button>
        </div>

        {!published ? (
          <div className={styles.emptyDialog}>
            <FileDiff />
            <strong>No existe una versión publicada</strong>
            <span>La primera publicación establecerá la base de comparación.</span>
          </div>
        ) : (
          <>
            <div className={styles.compareSummary}>
              <div>
                <span>Diferencias detectadas</span>
                <strong>{differenceCount}</strong>
              </div>
              <div>
                <span>Publicado</span>
                <strong>{formatTimestamp(String(published.compiled?.updatedAt || ""))}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{differenceCount ? "Requiere revisión" : "Sin diferencias"}</strong>
              </div>
            </div>

            <div className={styles.compareRows}>
              <div className={styles.compareHead}>
                <span>Dimensión</span>
                <span>Draft</span>
                <span>Publicado</span>
              </div>
              {draftScores.map((draftScore) => {
                const publishedScore = publishedScores.find((item) => item.key === draftScore.key);
                return (
                  <div key={draftScore.key}>
                    <strong>{draftScore.label}</strong>
                    <span>{draftScore.score}%</span>
                    <span>{publishedScore?.score ?? 0}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function PreviewDialog({
  publicKey,
  onClose,
}: {
  publicKey: string;
  onClose: () => void;
}) {
  const previewUrl = `/widget?key=${encodeURIComponent(publicKey)}&preview=1`;
  const dialogRef = useModalAccessibility<HTMLElement>({ onClose });

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={`${styles.dialog} ${styles.previewDialog}`} role="dialog" aria-modal="true" aria-labelledby="preview-title" tabIndex={-1}>
        <div className={styles.dialogHeader}>
          <div>
            <span className={styles.cardKicker}>Widget Preview</span>
            <h2 id="preview-title">Experiencia del borrador</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar preview">
            <X />
          </button>
        </div>
        <div className={styles.previewFrame}>
          <iframe src={previewUrl} title="Preview del widget con la calibración en borrador" loading="lazy" />
        </div>
      </section>
    </div>
  );
}

function PublishDialog({
  readiness,
  differenceCount,
  publishing,
  onClose,
  onConfirm,
}: {
  readiness: CalibrationReadinessSummary;
  differenceCount: number;
  publishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const pending = readiness.signals.filter((item) => !item.done);
  const dialogRef = useModalAccessibility<HTMLElement>({
    onClose,
    closeDisabled: publishing,
  });

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !publishing && onClose()}>
      <section ref={dialogRef} className={`${styles.dialog} ${styles.publishDialog}`} role="dialog" aria-modal="true" aria-labelledby="publish-title" aria-describedby="publish-notice" tabIndex={-1}>
        <div className={styles.dialogHeader}>
          <div>
            <span className={styles.cardKicker}>Validación previa</span>
            <h2 id="publish-title">Publicar calibración</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} disabled={publishing} aria-label="Cerrar validación">
            <X />
          </button>
        </div>

        <div className={styles.publishScore}>
          <strong>{readiness.score}%</strong>
          <div>
            <span>{differenceCount} cambios llegarán al widget</span>
            <i style={{ "--progress": `${readiness.score}%` } as CSSProperties} />
          </div>
        </div>

        {pending.length ? (
          <div className={styles.validationList}>
            <span>Advertencias antes de publicar</span>
            {pending.map((item) => (
              <div key={item.key}>
                <AlertTriangle />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.validationSuccess}>
            <CheckCircle2 />
            <div>
              <strong>Validación completa</strong>
              <span>Las áreas críticas tienen configuración suficiente.</span>
            </div>
          </div>
        )}

        <p className={styles.publishNotice} id="publish-notice">
          La publicación sustituye la configuración activa del widget y registra una nueva marca de tiempo.
        </p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={publishing}>
            Volver a revisar
          </button>
          <button type="button" className={styles.primaryButton} onClick={onConfirm} disabled={publishing}>
            {publishing ? <LoaderCircle className={styles.spin} /> : <Rocket />}
            {publishing ? "Publicando" : "Confirmar publicación"}
          </button>
        </div>
      </section>
    </div>
  );
}

function EditorDrawer({
  stage,
  content,
  onClose,
}: {
  stage: CalibrationStageKey;
  content: ReactNode;
  onClose: () => void;
}) {
  const title =
    stage === "base"
      ? "Identidad y base"
      : stage === "persona"
        ? "Personalidad y tono"
        : stage === "sales"
          ? "Ventas y objeciones"
          : stage === "rules"
            ? "Guardrails y escalamiento"
            : "Revisión final";
  const dialogRef = useModalAccessibility<HTMLElement>({ onClose });

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={dialogRef} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1}>
        <div className={styles.drawerHeader}>
          <div>
            <span className={styles.cardKicker}>Edición detallada</span>
            <h2 id="drawer-title">{title}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar editor">
            <X />
          </button>
        </div>
        <div className={styles.drawerBody}>{content}</div>
      </aside>
    </div>
  );
}

function PublishDock({
  visible,
  differenceCount,
  status,
  dirty,
  saving,
  publishing,
  publishedAt,
  onDiscard,
  onCompare,
  onPublish,
}: {
  visible: boolean;
  differenceCount: number;
  status: CalibrationWorkspaceStatus;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  publishedAt?: string | null;
  onDiscard: () => void;
  onCompare: () => void;
  onPublish: () => void;
}) {
  if (!visible) return null;

  return (
    <div className={styles.publishDock} aria-live="polite">
      <div className={styles.dockSummary}>
        <span className={styles.dockCount}>{differenceCount}</span>
        <div>
          <strong>{dirty ? "Cambios pendientes" : statusCopy(status, dirty)}</strong>
          <span>
            {saving ? "Guardando borrador" : `Última publicación ${formatTimestamp(publishedAt)}`}
          </span>
        </div>
      </div>
      <div className={styles.dockActions}>
        <button type="button" onClick={onDiscard} disabled={saving || publishing || !dirty}>
          Descartar cambios
        </button>
        <button type="button" onClick={onCompare}>
          Comparar
        </button>
        <button type="button" className={styles.primaryButton} onClick={onPublish} disabled={saving || publishing}>
          {publishing ? <LoaderCircle className={styles.spin} /> : <Rocket />}
          Publicar calibración
        </button>
      </div>
    </div>
  );
}

export function CalibrationWorkspace({
  draft,
  published,
  publicKey,
  businessName,
  stage,
  activeSection,
  activeBlueprintId,
  activeBlueprintName,
  blueprintOptions,
  readiness,
  completion,
  status,
  dirty,
  saving,
  publishing,
  error,
  lastModified,
  editorOpen,
  editorContent,
  onSectionChange,
  onCloseEditor,
  onBehaviorChange,
  onApplyBlueprint,
  onReload,
  onUndo,
  onResetPreset,
  onDiscard,
  onPublish,
  canUndo,
}: CalibrationWorkspaceProps) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const scores = useMemo(() => sectionScores(draft), [draft]);
  const differenceCount = useMemo(
    () => countDifferences(draft, published),
    [draft, published]
  );
  const modalOpen = compareOpen || previewOpen || publishOpen || editorOpen;

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (publishOpen && !publishing) setPublishOpen(false);
      else if (previewOpen) setPreviewOpen(false);
      else if (compareOpen) setCompareOpen(false);
      else if (editorOpen) onCloseEditor();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [compareOpen, editorOpen, modalOpen, onCloseEditor, previewOpen, publishOpen, publishing]);

  function openPublishValidation() {
    setPublishOpen(true);
  }

  async function confirmPublish() {
    const publishedSuccessfully = await onPublish();
    if (publishedSuccessfully) setPublishOpen(false);
  }

  return (
    <div className={`lmn-module-page lmn-calibration-studio ${styles.workspace} ${dirty || saving || publishing || status === "error" ? styles.withDock : ""}`}>
      <CalibrationRail activeSection={activeSection} scores={scores} onSectionChange={onSectionChange} />

      <div className={styles.main}>
        <StudioToolbar
          businessName={businessName}
          assistantName={draft.calibration.identity.assistantName}
          status={status}
          dirty={dirty}
          saving={saving}
          publishing={publishing}
          lastModified={lastModified}
          canUndo={canUndo}
          publicKey={publicKey}
          onUndo={onUndo}
          onResetPreset={onResetPreset}
          onCompare={() => setCompareOpen(true)}
          onPreview={() => setPreviewOpen(true)}
          onPublish={openPublishValidation}
          onReload={onReload}
        />

        <EditorialHeader
          hasPublished={Boolean(published)}
          dirty={dirty}
          completion={completion}
          activeBlueprintId={activeBlueprintId}
          blueprintOptions={blueprintOptions}
          onApplyBlueprint={onApplyBlueprint}
          onTest={() => {
            const reducedMotion = window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches;
            document.getElementById("calibration-conversation-lab")?.scrollIntoView({
              behavior: reducedMotion ? "auto" : "smooth",
              block: "center",
            });
          }}
        />

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <CircleAlert />
            <div>
              <strong>No se pudo completar la operación</strong>
              <span>{error}</span>
            </div>
            <button type="button" onClick={onReload}>
              Reintentar
            </button>
          </div>
        ) : null}

        <section className={styles.bento} aria-label="Resumen de Calibration Studio">
          <HealthCard
            draft={draft}
            published={published}
            publicKey={publicKey}
            readiness={readiness}
            differenceCount={differenceCount}
            onOpenPending={() => onSectionChange(readiness.next ? readiness.next.stage === "base" ? "identity" : readiness.next.stage === "persona" ? "personality" : readiness.next.stage === "sales" ? "sales" : readiness.next.stage === "rules" ? "guardrails" : "review" : "review", true)}
          />
          <BehaviorSpectrumCard
            draft={draft}
            stage={stage}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            onBehaviorChange={onBehaviorChange}
          />
          <PublicationProgressCard
            scores={scores}
            status={status}
            dirty={dirty}
            published={published}
            differenceCount={differenceCount}
            onOpen={(section) => onSectionChange(section, true)}
            onReview={() => onSectionChange("review", true)}
            onPublish={openPublishValidation}
          />
          <BrandIdentityCard draft={draft} onEdit={() => onSectionChange("identity", true)} />
          <div id="calibration-conversation-lab" className={styles.labAnchor}>
            <ConversationLabCard
              publicKey={publicKey}
              assistantName={draft.calibration.identity.assistantName}
            />
          </div>
          <GuardrailsCard draft={draft} onOpen={(section) => onSectionChange(section, true)} />
        </section>

        <footer className={styles.workspaceFooter}>
          <span>
            <Activity />
            Preset activo: <strong>{activeBlueprintName}</strong>
          </span>
          <span>
            <Clock3 />
            Draft actualizado: <strong>{formatTimestamp(lastModified)}</strong>
          </span>
        </footer>
      </div>

      {editorOpen ? <EditorDrawer stage={stage} content={editorContent} onClose={onCloseEditor} /> : null}
      {compareOpen ? (
        <CompareDialog
          draft={draft}
          published={published}
          differenceCount={differenceCount}
          onClose={() => setCompareOpen(false)}
        />
      ) : null}
      {previewOpen && publicKey ? <PreviewDialog publicKey={publicKey} onClose={() => setPreviewOpen(false)} /> : null}
      {publishOpen ? (
        <PublishDialog
          readiness={readiness}
          differenceCount={differenceCount}
          publishing={publishing}
          onClose={() => setPublishOpen(false)}
          onConfirm={() => void confirmPublish()}
        />
      ) : null}
      <PublishDock
        visible={dirty || saving || publishing || status === "error"}
        differenceCount={differenceCount}
        status={status}
        dirty={dirty}
        saving={saving}
        publishing={publishing}
        publishedAt={published ? String(published.compiled?.updatedAt || "") : null}
        onDiscard={onDiscard}
        onCompare={() => setCompareOpen(true)}
        onPublish={openPublishValidation}
      />
    </div>
  );
}

export function CalibrationWorkspaceSkeleton() {
  return (
    <div className={`lmn-module-page lmn-calibration-studio ${styles.workspace}`} aria-label="Cargando Calibration Studio">
      <div className={`${styles.rail} ${styles.skeletonRail}`} aria-hidden="true" />
      <div className={styles.main}>
        <div className={`${styles.toolbar} ${styles.skeletonBlock}`} aria-hidden="true" />
        <div className={styles.skeletonHeader} aria-hidden="true">
          <i />
          <strong />
          <span />
        </div>
        <div className={styles.bento} aria-hidden="true">
          <div className={`${styles.card} ${styles.healthCard} ${styles.skeletonBlock}`} />
          <div className={`${styles.card} ${styles.spectrumCard} ${styles.skeletonBlock}`} />
          <div className={`${styles.card} ${styles.progressCard} ${styles.skeletonBlock}`} />
          <div className={`${styles.card} ${styles.brandCard} ${styles.skeletonBlock}`} />
          <div className={`${styles.labAnchor} ${styles.card} ${styles.skeletonBlock}`} />
          <div className={`${styles.card} ${styles.guardrailsCard} ${styles.skeletonBlock}`} />
        </div>
        <span className={styles.srOnly} role="status">
          Cargando datos de calibración
        </span>
      </div>
    </div>
  );
}

export function CalibrationWorkspaceState({
  title,
  description,
  actionLabel = "Reintentar",
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <section className={styles.statePage}>
      <div className={styles.stateMark}>
        <ShieldAlert />
      </div>
      <span className={styles.cardKicker}>Calibration Studio</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <button type="button" className={styles.primaryButton} onClick={onAction}>
        <RefreshCw />
        {actionLabel}
      </button>
    </section>
  );
}
