"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  BrainCircuit,
  Check,
  ChevronRight,
  Eye,
  Gauge,
  Mic,
  Pause,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  StopCircle,
  Target,
  Wand2,
} from "lucide-react";
import { Slider } from "@/components/interfaces-slider";
import type { CalibrationDoc } from "./types";
import { ensureShape } from "./defaults";
import { GlassCard } from "../_components/ui/GlassCard";
import { ActionButton } from "../_components/ui/ActionButton";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { SaveBar } from "../_components/ui/SaveBar";
import { BorderBeam } from "@/components/ui/border-beam";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { ShineBorder } from "@/components/ui/shine-border";

type AnyObj = Record<string, unknown>;
type SavedProfile = {
  id?: string;
  name?: string;
  createdAt?: string;
  mix?: unknown;
  rules?: unknown;
  freeNotes?: unknown;
  sales?: unknown;
  [key: string]: unknown;
};
type PrimaryCTA = CalibrationDoc["calibration"]["identity"]["primaryCTA"];
type ApiGet = {
  publicKey?: string;
  draft?: unknown;
  published?: unknown;
};

type StageKey = "base" | "persona" | "sales" | "rules" | "review";
type CalibrationAssetVariant =
  | "identity"
  | "personality"
  | "sales-intelligence"
  | "guardrails"
  | "publish"
  | "audio"
  | "sales-flow"
  | "widget-preview"
  | "empty";
type StudioStatus =
  | "loading"
  | "dirty"
  | "saving"
  | "saved"
  | "publishing"
  | "published"
  | "error";
type ReadinessSignal = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  stage: StageKey;
};
type CalibrationReadiness = {
  done: number;
  total: number;
  score: number;
  next?: ReadinessSignal;
  signals: ReadinessSignal[];
};

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";
const PANEL_THEME_EVENT = "lumen-theme:update";

const STAGES: Array<{
  key: StageKey;
  title: string;
  label: string;
  detail: string;
  icon: typeof BrainCircuit;
}> = [
  {
    key: "base",
    title: "Base",
    label: "Identidad",
    detail: "Quien habla y que promete",
    icon: BrainCircuit,
  },
  {
    key: "persona",
    title: "Voz",
    label: "Personalidad",
    detail: "Como suena el asistente",
    icon: Wand2,
  },
  {
    key: "sales",
    title: "Venta",
    label: "Motor comercial",
    detail: "Como diagnostica y cierra",
    icon: Target,
  },
  {
    key: "rules",
    title: "Control",
    label: "Reglas",
    detail: "Limites, palabras y escalado",
    icon: ShieldCheck,
  },
  {
    key: "review",
    title: "Live",
    label: "Preview",
    detail: "Revisar y publicar",
    icon: Eye,
  },
];

const STAGE_VISUALS: Record<
  StageKey,
  { variant: CalibrationAssetVariant; title: string; text: string }
> = {
  base: {
    variant: "identity",
    title: "Identidad visible",
    text: "Nombre, promesa y accion principal quedan listos para que el asistente hable como el negocio.",
  },
  persona: {
    variant: "personality",
    title: "Voz comercial",
    text: "Define el tono que el cliente siente: profesional, cercano, rapido y persuasivo sin ruido.",
  },
  sales: {
    variant: "sales-intelligence",
    title: "Motor de venta",
    text: "La IA diagnostica, reencuadra objeciones y propone el siguiente paso con criterio.",
  },
  rules: {
    variant: "guardrails",
    title: "Control operativo",
    text: "Limites, escalado humano, lenguaje y widget quedan protegidos antes de publicar.",
  },
  review: {
    variant: "publish",
    title: "Salida a produccion",
    text: "Revisa completitud, publica el borrador y sincroniza la experiencia real del widget.",
  },
};

const PSYCHOLOGY_BLUEPRINTS = [
  {
    id: "elite-consultive",
    name: "Closer consultivo",
    tag: "Recomendado",
    description:
      "Diagnostica rapido, valida la necesidad y guia hacia un siguiente paso sin presion.",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 38,
            energy: 56,
            sobriety: 72,
            elegance: 76,
            closeness: 64,
            empathy: 82,
            brevity: 68,
            directivity: 78,
            humor: 8,
            audacity: 42,
          },
          freeNotes:
            "Prioriza claridad, confianza y avance. Haz una sola pregunta decisiva por turno.",
        },
        sales: {
          profileId: "elite-consultive",
          psychologyDefault: true,
          qualification: "high",
          proactivity: 78,
          closing: 82,
          allowUrgency: false,
          discoveryModel: "SPIN ligero: situacion, problema, impacto y resultado esperado.",
          closingStyle: "Cierre suave con micro-compromiso: contacto, agenda o dato clave.",
          objectionPlaybook:
            "Valida la objecion, reencuadra con valor real, reduce riesgo y pregunta el siguiente paso.",
          objectionHandling: {
            price: true,
            time: true,
            trust: true,
            comparison: true,
          },
        },
      },
    },
  },
  {
    id: "premium-support",
    name: "Soporte premium",
    tag: "Confianza",
    description:
      "Calma, orden y precision. Ideal para negocios que necesitan soporte serio y derivacion clara.",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 26,
            energy: 38,
            sobriety: 86,
            elegance: 82,
            closeness: 54,
            empathy: 76,
            brevity: 72,
            directivity: 56,
            humor: 0,
            audacity: 16,
          },
          freeNotes:
            "Responder con sobriedad, no prometer de mas y derivar cuando falte informacion critica.",
        },
        sales: {
          profileId: "premium-support",
          psychologyDefault: true,
          qualification: "medium",
          proactivity: 54,
          closing: 58,
          allowUrgency: false,
          closingStyle: "Orientar primero, vender despues. Cerrar solo cuando haya intencion clara.",
        },
      },
    },
  },
  {
    id: "growth-seller",
    name: "Growth vendedor",
    tag: "Conversion",
    description:
      "Mas directo y activo. Detecta intencion, prioriza leads calientes y empuja acciones claras.",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 44,
            energy: 74,
            sobriety: 58,
            elegance: 66,
            closeness: 64,
            empathy: 70,
            brevity: 78,
            directivity: 88,
            humor: 8,
            audacity: 58,
          },
          freeNotes:
            "Si el usuario muestra intencion de compra, pedir contacto o agendar de forma natural.",
        },
        sales: {
          profileId: "growth-seller",
          psychologyDefault: true,
          qualification: "high",
          proactivity: 88,
          closing: 90,
          allowUrgency: false,
          closingStyle: "Proponer el camino mas corto y pedir un dato concreto para avanzar.",
        },
      },
    },
  },
  {
    id: "receptionist",
    name: "Recepcionista experta",
    tag: "Agenda",
    description:
      "Recibe, ordena datos, explica horarios y deriva al equipo cuando corresponde.",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 50,
            energy: 48,
            sobriety: 62,
            elegance: 62,
            closeness: 78,
            empathy: 78,
            brevity: 66,
            directivity: 64,
            humor: 6,
            audacity: 16,
          },
          freeNotes:
            "Recolectar nombre, necesidad y contacto cuando la conversacion deba pasar a humano.",
        },
        sales: {
          profileId: "receptionist",
          psychologyDefault: true,
          qualification: "medium",
          proactivity: 62,
          closing: 56,
          allowUrgency: false,
          closingStyle: "Ordenar datos y ofrecer derivacion o agenda.",
        },
      },
    },
  },
];

const MIX_FIELDS = [
  ["empathy", "Empatia", "Entiende antes de vender."],
  ["brevity", "Brevedad", "Responde corto y accionable."],
  ["directivity", "Direccion", "Guia hacia el siguiente paso."],
  ["elegance", "Elegancia", "Lenguaje premium y claro."],
  ["energy", "Energia", "Ritmo vivo sin ser agresivo."],
  ["closeness", "Cercania", "Trato humano y natural."],
] as const;

function isObj(v: unknown): v is AnyObj {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(a: unknown, b: unknown): unknown {
  if (!isObj(a) || !isObj(b)) return b;
  const out: AnyObj = { ...a };

  for (const k of Object.keys(b)) {
    out[k] = isObj(out[k]) && isObj(b[k]) ? deepMerge(out[k], b[k]) : b[k];
  }

  return out;
}

function compactJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeHex(hex?: unknown, fallback = "#00E5FF") {
  const raw = String(hex || "").trim();
  if (!raw) return fallback;

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#([0-9a-fA-F]{6})$/.test(withHash)
    ? withHash.toUpperCase()
    : fallback;
}

function hexToRgbString(hex: string) {
  const safe = normalizeHex(hex);
  const value = safe.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function listToText(list: unknown) {
  if (!Array.isArray(list)) return "";
  return list.map((x) => String(x ?? "").trim()).filter(Boolean).join("\n");
}

function textToList(text: string) {
  return text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function dictionaryToText(dict: unknown) {
  if (!isObj(dict)) return "";
  return Object.entries(dict as Record<string, string>)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function textToDictionary(text: string) {
  const out: Record<string, string> = {};

  text.split("\n").forEach((line) => {
    const clean = line.trim();
    if (!clean) return;

    const [key, ...rest] = clean.split("=");
    if (!key || !rest.length) return;

    out[key.trim()] = rest.join("=").trim();
  });

  return out;
}

function applyLivePanelTheme(input: {
  primaryColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  if (typeof window === "undefined") return;

  const primary = normalizeHex(input.primaryColor || input.gradientFrom, "#2F7CFF");
  const secondary = normalizeHex(input.gradientTo || input.gradientFrom, "#5BE0C2");
  const root = document.documentElement;

  root.style.setProperty("--lmn-accent", primary);
  root.style.setProperty("--lmn-accent-2", secondary);
  root.style.setProperty("--lmn-accent-rgb", hexToRgbString(primary));
  root.style.setProperty("--lmn-accent-2-rgb", hexToRgbString(secondary));

  window.localStorage.setItem("lmn_theme_primary", primary);
  window.localStorage.setItem("lmn_theme_secondary", secondary);
  window.localStorage.setItem("widget_primary_color", primary);
  window.localStorage.setItem("widget_secondary_color", secondary);

  window.dispatchEvent(
    new CustomEvent(PANEL_THEME_EVENT, {
      detail: { primary, secondary },
    })
  );
}

function formatDate(value: unknown) {
  if (!value) return "Sin publicar";

  try {
    return new Date(String(value)).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Sin publicar";
  }
}

function statusLabel(status: StudioStatus, dirty: boolean) {
  if (status === "loading") return "Cargando";
  if (status === "saving") return "Guardando";
  if (status === "publishing") return "Publicando";
  if (status === "published") return "Publicado";
  if (status === "error") return "Error";
  if (dirty) return "Cambios pendientes";
  return "Borrador guardado";
}

function hasUsefulText(value: unknown, min = 3) {
  return typeof value === "string" && value.trim().length >= min;
}

function hasMinItems(value: unknown, min = 1) {
  return Array.isArray(value) && value.filter(Boolean).length >= min;
}

function buildCalibrationReadiness(
  draft: CalibrationDoc,
  publicKey: string,
  published: CalibrationDoc | null
): CalibrationReadiness {
  const identity = draft.calibration.identity;
  const personality = draft.calibration.personality;
  const brandBrief = draft.calibration.brandBrief;
  const sales = draft.calibration.sales || {};
  const guardrails = draft.calibration.guardrails || {};
  const lexicon = draft.calibration.lexicon;
  const widget = draft.widget || {};
  const theme = isObj(widget.theme) ? widget.theme : {};
  const escalate = isObj(guardrails.escalate) ? guardrails.escalate : {};

  const signals: ReadinessSignal[] = [
    {
      key: "identity",
      label: "Identidad entrenada",
      detail: "Marca, asistente, promesa y cliente ideal estan listos.",
      stage: "base",
      done:
        hasUsefulText(identity.brandName) &&
        hasUsefulText(identity.assistantName) &&
        hasUsefulText(identity.tagline) &&
        hasUsefulText(brandBrief.idealCustomer) &&
        hasUsefulText(brandBrief.differentiation),
    },
    {
      key: "voice",
      label: "Voz calibrada",
      detail: "Personalidad, reglas y notas libres guian el tono real.",
      stage: "persona",
      done:
        hasUsefulText(personality.freeNotes, 12) &&
        Boolean(sales.profileId) &&
        Boolean(personality.rules?.reflectUnderstandingFirst) &&
        Number(personality.rules?.maxOptions || 0) <= 3,
    },
    {
      key: "sales",
      label: "Motor comercial",
      detail: "Diagnostico, objeciones y cierre tienen instrucciones accionables.",
      stage: "sales",
      done:
        Boolean(sales.psychologyDefault) &&
        hasUsefulText(sales.discoveryModel, 18) &&
        hasUsefulText(sales.closingStyle, 18) &&
        hasUsefulText(brandBrief.objections, 10),
    },
    {
      key: "guardrails",
      label: "Guardrails activos",
      detail: "La IA sabe que evitar, cuando escalar y como hablar.",
      stage: "rules",
      done:
        Boolean(escalate.enabled) &&
        hasMinItems(escalate.when, 2) &&
        hasMinItems(lexicon.allowedPhrases, 1) &&
        hasMinItems(lexicon.forbiddenPhrases, 1),
    },
    {
      key: "widget",
      label: "Widget publicable",
      detail: "Saludo, acciones rapidas y color del asistente estan definidos.",
      stage: "rules",
      done:
        hasUsefulText(widget.greeting, 12) &&
        hasMinItems(widget.quickActions, 2) &&
        hasUsefulText(theme.primaryColor) &&
        hasUsefulText(theme.gradientTo),
    },
    {
      key: "production",
      label: "Salida a produccion",
      detail: "Existe public key y una version publicada para clientes reales.",
      stage: "review",
      done: Boolean(publicKey && published?.compiled?.updatedAt),
    },
  ];

  const done = signals.filter((item) => item.done).length;

  return {
    done,
    total: signals.length,
    score: Math.round((done / signals.length) * 100),
    next: signals.find((item) => !item.done),
    signals,
  };
}

export default function CalibrationStudio() {
  const [loading, setLoading] = useState(true);
  const [publicKey, setPublicKey] = useState("");
  const [draft, setDraft] = useState<CalibrationDoc>(() => ensureShape(null));
  const [published, setPublished] = useState<CalibrationDoc | null>(null);
  const [stage, setStage] = useState<StageKey>("base");
  const [status, setStatus] = useState<StudioStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const savedSnapshotRef = useRef("");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const identity = draft.calibration.identity;
  const personality = draft.calibration.personality;
  const brandBrief = draft.calibration.brandBrief;
  const lexicon = draft.calibration.lexicon;
  const sales = draft.calibration.sales || {};
  const guardrails = draft.calibration.guardrails || {};
  const widget = draft.widget || {};
  const theme = widget.theme || {};
  const savedProfiles = Array.isArray(personality.savedProfiles)
    ? (personality.savedProfiles as SavedProfile[])
    : [];

  const draftSnapshot = useMemo(() => compactJson(draft), [draft]);
  const dirty = loadedRef.current && draftSnapshot !== savedSnapshotRef.current;

  const completion = useMemo(() => {
    const checks = [
      Boolean(identity.brandName?.trim()),
      Boolean(identity.assistantName?.trim()),
      Boolean(identity.tagline?.trim()),
      Boolean(brandBrief.idealCustomer?.trim()),
      Boolean(brandBrief.differentiation?.trim()),
      Boolean(brandBrief.objections?.trim()),
      Boolean(personality.freeNotes?.trim()),
      Boolean(widget.greeting?.trim()),
      Boolean(Array.isArray(widget.quickActions) && widget.quickActions.length >= 2),
      Boolean(sales.psychologyDefault),
    ];
    const done = checks.filter(Boolean).length;

    return {
      done,
      total: checks.length,
      percent: Math.round((done / checks.length) * 100),
    };
  }, [identity, brandBrief, personality, widget, sales]);

  const readiness = useMemo(
    () => buildCalibrationReadiness(draft, publicKey, published),
    [draft, publicKey, published]
  );

  const activeBlueprint = PSYCHOLOGY_BLUEPRINTS.find(
    (item) => item.id === sales.profileId
  );

  const previewUrl = publicKey
    ? `/widget?key=${encodeURIComponent(publicKey)}&preview=1`
    : "";

  async function load() {
    setLoading(true);
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/panel/calibration", { cache: "no-store" });

      if (!res.ok) throw new Error(`GET /api/panel/calibration -> ${res.status}`);

      const data = (await res.json()) as ApiGet;
      const nextDraft = ensureShape(data.draft);
      const nextPublished = data.published ? ensureShape(data.published) : null;
      const snapshot = compactJson(nextDraft);

      setPublicKey(data.publicKey || "");
      setDraft(nextDraft);
      setPublished(nextPublished);
      savedSnapshotRef.current = snapshot;
      loadedRef.current = true;
      setStatus("saved");
    } catch (e: unknown) {
      setStatus("error");
      setError(getErrorMessage(e, "Error cargando calibracion"));
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft(nextDraft = draft, options?: { force?: boolean }) {
    if (!options?.force && (saving || publishing)) return;

    setSaving(true);
    setStatus("saving");
    setError(null);

    try {
      const safeDraft = ensureShape(nextDraft);
      const res = await fetch("/api/panel/calibration/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: safeDraft }),
      });

      if (!res.ok) throw new Error(`PUT /api/panel/calibration/draft -> ${res.status}`);

      savedSnapshotRef.current = compactJson(safeDraft);
      setDraft(safeDraft);
      setStatus("saved");
    } catch (e: unknown) {
      setStatus("error");
      setError(getErrorMessage(e, "Error guardando borrador"));
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
    if (saving || publishing) return;

    setPublishing(true);
    setStatus("publishing");
    setError(null);

    try {
      const safeDraft = ensureShape(draft);

      if (dirty) {
        await saveDraft(safeDraft, { force: true });
      }

      const res = await fetch("/api/panel/calibration/publish", {
        method: "POST",
      });

      if (!res.ok) throw new Error(`POST /api/panel/calibration/publish -> ${res.status}`);

      setPublished(safeDraft);
      setStatus("published");
      savedSnapshotRef.current = compactJson(safeDraft);
    } catch (e: unknown) {
      setStatus("error");
      setError(getErrorMessage(e, "Error publicando calibracion"));
    } finally {
      setPublishing(false);
    }
  }

  function updateDraft(patch: Partial<CalibrationDoc>) {
    setDraft((current) => {
      const next = ensureShape(deepMerge(current, patch));
      setStatus("dirty");
      setError(null);
      return next;
    });
  }

  function updateIdentity(patch: Partial<CalibrationDoc["calibration"]["identity"]>) {
    updateDraft({
      calibration: {
        identity: {
          ...identity,
          ...patch,
        },
      },
    } as Partial<CalibrationDoc>);
  }

  function updateBrandBrief(key: string, value: string) {
    updateDraft({
      calibration: {
        brandBrief: {
          ...brandBrief,
          [key]: value,
        },
      },
    } as Partial<CalibrationDoc>);
  }

  function updatePersonality(patch: AnyObj) {
    updateDraft({
      calibration: {
        personality: {
          ...personality,
          ...patch,
        },
      },
    } as Partial<CalibrationDoc>);
  }

  function updatePersonalityMix(key: string, value: number) {
    updatePersonality({
      mix: {
        ...personality.mix,
        [key]: value,
      },
    });
  }

  function updateRules(patch: AnyObj) {
    updatePersonality({
      rules: {
        ...personality.rules,
        ...patch,
      },
    });
  }

  function updateSales(patch: AnyObj) {
    updateDraft({
      calibration: {
        sales: {
          ...sales,
          ...patch,
        },
      },
    } as Partial<CalibrationDoc>);
  }

  function updateGuardrails(patch: AnyObj) {
    updateDraft({
      calibration: {
        guardrails: {
          ...guardrails,
          ...patch,
        },
      },
    } as Partial<CalibrationDoc>);
  }

  function updateLexicon(patch: AnyObj) {
    updateDraft({
      calibration: {
        lexicon: {
          ...lexicon,
          ...patch,
        },
      },
    } as Partial<CalibrationDoc>);
  }

  function updateWidget(patch: AnyObj) {
    updateDraft({
      widget: {
        ...widget,
        ...patch,
      },
    } as Partial<CalibrationDoc>);
  }

  function updateWidgetTheme(patch: AnyObj) {
    const nextTheme = {
      ...theme,
      ...patch,
    };

    if (
      patch.primaryColor !== undefined ||
      patch.gradientFrom !== undefined ||
      patch.gradientTo !== undefined
    ) {
      applyLivePanelTheme(nextTheme);
    }

    updateWidget({
      theme: nextTheme,
    });
  }

  function applyBlueprint(id: string) {
    const preset = PSYCHOLOGY_BLUEPRINTS.find((item) => item.id === id);
    if (!preset) return;

    const next = ensureShape(deepMerge(draft, preset.patch));
    setDraft(next);
    setStatus("dirty");
    setStage("persona");
  }

  function saveCurrentPersonality() {
    const name = activeBlueprint?.name || identity.assistantName || "Personalidad LumenAI";
    const profile = {
      id: `profile_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      mix: personality.mix,
      rules: personality.rules,
      freeNotes: personality.freeNotes,
      sales: {
        profileId: sales.profileId || "custom",
        proactivity: sales.proactivity,
        closing: sales.closing,
        qualification: sales.qualification,
        closingStyle: sales.closingStyle,
        discoveryModel: sales.discoveryModel,
      },
    };

    updatePersonality({
      savedProfiles: [profile, ...savedProfiles].slice(0, 12),
    });
  }

  function applySavedProfile(profile: SavedProfile) {
    updateDraft({
      calibration: {
        personality: {
          ...personality,
          mix: profile.mix || personality.mix,
          rules: profile.rules || personality.rules,
          freeNotes: profile.freeNotes || personality.freeNotes,
        },
        sales: {
          ...sales,
          ...(profile.sales || {}),
        },
      },
    } as Partial<CalibrationDoc>);
  }

  useEffect(() => {
    void load();

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !dirty || saving || publishing) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveDraft(draft);
    }, 1200);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [draftSnapshot]);

  if (loading) {
    return (
      <div className="grid gap-5">
        <CalibrationHero
          completion={completion.percent}
          status="Cargando"
          statusTone="muted"
          onReload={() => void load()}
          onPublish={() => void publishNow()}
          publishDisabled
        />
      </div>
    );
  }

  const statusTone =
    status === "error"
      ? "danger"
      : status === "dirty"
      ? "warning"
      : status === "published" || status === "saved"
      ? "active"
      : "default";

  const saveBarVisible = dirty || saving || publishing || status === "error";

  return (
    <div className={saveBarVisible ? "grid gap-5 pb-28" : "grid gap-5"}>
      <CalibrationHero
        completion={completion.percent}
        status={statusLabel(status, dirty)}
        statusTone={statusTone}
        onReload={() => void load()}
        onPublish={() => void publishNow()}
        publishDisabled={saving || publishing || !publicKey}
      />

      {error ? (
        <GlassCard variant="soft" className="border-red-400/20 p-4 text-sm font-semibold text-red-100">
          {error}
        </GlassCard>
      ) : null}

      <CalibrationCommandCenter
        stage={stage}
        completion={completion}
        activeBlueprintName={activeBlueprint?.name || "Closer consultivo"}
        savedProfilesCount={savedProfiles.length}
        publicKey={publicKey}
        publishedAt={published?.compiled?.updatedAt}
        onStageChange={setStage}
      />

      <CalibrationReadinessPanel
        readiness={readiness}
        onStageChange={setStage}
      />

      <StageRail stage={stage} completion={completion.percent} onChange={setStage} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0">
          {stage === "base" ? (
            <BaseStage
              identity={identity}
              brandBrief={brandBrief}
              updateIdentity={updateIdentity}
              updateBrandBrief={updateBrandBrief}
            />
          ) : null}

          {stage === "persona" ? (
            <PersonalityStage
              activeId={sales.profileId}
              savedProfiles={savedProfiles}
              mix={personality.mix}
              rules={personality.rules}
              freeNotes={personality.freeNotes}
              onApplyBlueprint={applyBlueprint}
              onApplySavedProfile={applySavedProfile}
              onSaveProfile={saveCurrentPersonality}
              onMixChange={updatePersonalityMix}
              onRulesChange={updateRules}
              onNotesChange={(value) => updatePersonality({ freeNotes: value })}
            />
          ) : null}

          {stage === "sales" ? (
            <SalesStage
              sales={sales}
              brandBrief={brandBrief}
              updateSales={updateSales}
              updateBrandBrief={updateBrandBrief}
            />
          ) : null}

          {stage === "rules" ? (
            <RulesStage
              lexicon={lexicon}
              guardrails={guardrails}
              widget={widget}
              theme={theme}
              updateLexicon={updateLexicon}
              updateGuardrails={updateGuardrails}
              updateWidget={updateWidget}
              updateWidgetTheme={updateWidgetTheme}
            />
          ) : null}

          {stage === "review" ? (
            <ReviewStage
              publicKey={publicKey}
              published={published}
              previewUrl={previewUrl}
              completion={completion}
              onSave={() => void saveDraft()}
              onPublish={() => void publishNow()}
              saving={saving || publishing}
              dirty={dirty}
            />
          ) : null}
        </main>

        <aside className="grid gap-4 xl:sticky xl:top-4 xl:self-start">
          <CalibrationStageVisual stage={stage} />

          <AssistantPreview draft={draft} />

          <GlassCard variant="soft" accent className="p-5">
            <div className="flex items-start gap-3">
              <div className="apex-cut grid h-10 w-10 shrink-0 place-items-center border border-white/[0.07] bg-white/[0.02]">
                <Gauge className="h-4 w-4 text-white/70" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white">Lo que ya afecta al asistente</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Identidad, personalidad, ventas, frases, reglas, saludo y colores se guardan como borrador. Al publicar pasan al widget real.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-white/48">
              <FactLine label="Public key" value={publicKey || "Sin key"} />
              <FactLine label="Ultima publicacion" value={formatDate(published?.compiled?.updatedAt)} />
              <FactLine label="Perfiles guardados" value={String(savedProfiles.length)} />
            </div>
          </GlassCard>
        </aside>
      </section>

      <SaveBar
        visible={saveBarVisible}
        title={
          status === "error"
            ? "Hubo un problema"
            : publishing
            ? "Publicando calibracion"
            : saving
            ? "Guardando borrador"
            : dirty
            ? "Cambios pendientes"
            : "Calibracion lista"
        }
        description="El borrador no cambia el widget publico hasta que publiques."
        status={status === "error" ? "Error" : dirty ? "Draft" : "Listo"}
        saving={saving || publishing}
        primaryLabel="Guardar"
        secondaryLabel="Publicar"
        onPrimary={() => void saveDraft()}
        onSecondary={() => void publishNow()}
        primaryDisabled={saving || publishing || !dirty}
        secondaryDisabled={saving || publishing || !publicKey}
      />
    </div>
  );
}

function CalibrationHero({
  completion,
  status,
  statusTone,
  onReload,
  onPublish,
  publishDisabled,
}: {
  completion: number;
  status: string;
  statusTone: "default" | "active" | "warning" | "danger" | "muted";
  onReload(): void;
  onPublish(): void;
  publishDisabled?: boolean;
}) {
  return (
    <section
      className="lmn-calibration-hero"
      aria-labelledby="lumenai-calibration-title"
    >
      <div className="sr-only">
        <h2 id="lumenai-calibration-title">AI Calibration Center</h2>
        <p>Tune behavior, sales logic and system control.</p>
      </div>
      <div className="lmn-calibration-hero-controls">
        <StatusBadge tone={statusTone}>{status}</StatusBadge>
        <StatusBadge tone="muted">{completion}% listo</StatusBadge>
        <ActionButton type="button" variant="secondary" onClick={onReload}>
          <RefreshCw className="h-3.5 w-3.5" />
          Recargar
        </ActionButton>
        <ActionButton
          type="button"
          variant="primary"
          onClick={onPublish}
          disabled={publishDisabled}
        >
          <Rocket className="h-3.5 w-3.5" />
          Publicar
        </ActionButton>
      </div>
    </section>
  );
}

function CalibrationAssetCard({
  variant,
  className = "",
}: {
  variant: CalibrationAssetVariant;
  className?: string;
}) {
  return (
    <div
      className={`lmn-calibration-asset lmn-calibration-asset--${variant} ${className}`}
      aria-hidden="true"
    />
  );
}

function CalibrationCommandCenter({
  stage,
  completion,
  activeBlueprintName,
  savedProfilesCount,
  publicKey,
  publishedAt,
  onStageChange,
}: {
  stage: StageKey;
  completion: { done: number; total: number; percent: number };
  activeBlueprintName: string;
  savedProfilesCount: number;
  publicKey: string;
  publishedAt?: unknown;
  onStageChange(stage: StageKey): void;
}) {
  const cards: Array<{
    key: StageKey;
    eyebrow: string;
    title: string;
    text: string;
    metric: string;
    variant: CalibrationAssetVariant;
  }> = [
    {
      key: "base",
      eyebrow: "Identidad",
      title: "Entrena con contexto real",
      text: "Nombre, promesa, cliente ideal y diferenciacion. El audio se convierte en texto dentro del mismo flujo.",
      metric: `${completion.done}/${completion.total}`,
      variant: "identity",
    },
    {
      key: "persona",
      eyebrow: "Psicologia",
      title: activeBlueprintName,
      text: "Presets comerciales basados en venta consultiva, claridad, confianza, objeciones y micro-cierres.",
      metric: `${savedProfilesCount} perfil(es)`,
      variant: "personality",
    },
    {
      key: "sales",
      eyebrow: "Conversion",
      title: "Motor de ventas guiado",
      text: "La IA diagnostica, reencuadra y propone el siguiente paso sin presion falsa ni promesas inventadas.",
      metric: "SPIN + cierre",
      variant: "sales-flow",
    },
    {
      key: "review",
      eyebrow: "Salida en vivo",
      title: publicKey ? "Widget listo para publicar" : "Falta public key",
      text: publishedAt ? `Ultima publicacion: ${formatDate(publishedAt)}` : "Guarda, revisa el preview y publica solo cuando este listo para clientes reales.",
      metric: `${completion.percent}% listo`,
      variant: "publish",
    },
  ];

  return (
    <section className="lmn-calibration-command-shell" aria-label="Mapa estrategico de calibracion">
      <div className="lmn-calibration-command-copy">
        <span>Studio operativo</span>
        <h2>Calibracion clara, visual y publicable</h2>
        <p>
          Cada bloque modifica una parte real del asistente: identidad, personalidad,
          ventas, reglas y publicacion. No es decorativo; todo termina en el widget.
        </p>
      </div>

      <div className="lmn-calibration-command-grid">
        {cards.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onStageChange(item.key)}
            className={stage === item.key ? "lmn-calibration-command-card is-active" : "lmn-calibration-command-card"}
          >
            <CalibrationAssetCard
              variant={item.variant}
              className="lmn-calibration-command-art"
            />
            <span className="lmn-calibration-command-eyebrow">{item.eyebrow}</span>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
            <small>{item.metric}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function CalibrationReadinessPanel({
  readiness,
  onStageChange,
}: {
  readiness: CalibrationReadiness;
  onStageChange(stage: StageKey): void;
}) {
  const next = readiness.next;
  const status =
    readiness.score >= 100
      ? "Listo para produccion"
      : readiness.score >= 72
      ? "Casi publicable"
      : "Requiere calibracion";

  return (
    <GlassCard variant="base" accent className="lmn-calibration-readiness relative p-5 md:p-6">
      <BorderBeam
        size={180}
        duration={14}
        colorFrom="#00E5FF"
        colorTo="#6C3BFF"
        borderWidth={1}
      />
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-stretch">
        <div className="apex-cut relative overflow-hidden border border-white/[0.065] bg-black/30 p-5">
          <ShineBorder
            borderWidth={1}
            duration={18}
            shineColor={["rgba(0,229,255,.55)", "rgba(27,67,255,.34)", "rgba(108,59,255,.28)"]}
          />
          <div className="lmn-readiness-glow absolute inset-0 opacity-70" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-60" aria-hidden="true">
            <div className="relative h-[190px] w-[190px]">
              <OrbitingCircles radius={78} iconSize={26} duration={18} path>
                <span className="grid h-full w-full place-items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 text-[9px] font-black text-cyan-100">
                  AI
                </span>
                <span className="grid h-full w-full place-items-center rounded-full border border-blue-200/15 bg-blue-400/10 text-[9px] font-black text-blue-100">
                  KB
                </span>
                <span className="grid h-full w-full place-items-center rounded-full border border-indigo-200/15 bg-indigo-400/10 text-[9px] font-black text-indigo-100">
                  CRM
                </span>
              </OrbitingCircles>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-white/38">
              Launch score
            </p>
            <div className="mt-4 flex items-end gap-2">
              <strong className="text-6xl font-black leading-none text-white">
                {readiness.score}
              </strong>
              <span className="pb-2 text-lg font-black text-white/44">%</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white/60">{status}</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${readiness.score}%`,
                  background: `linear-gradient(90deg, rgba(${accentA}, .95), rgba(${accentB}, .72))`,
                }}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-white/44">
              {readiness.done}/{readiness.total} sistemas operativos listos para que la IA responda, venda y escale con criterio.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-white/38">
                Control de salida
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                Calibra lo que cambia el comportamiento real
              </h3>
            </div>
            {next ? (
              <ActionButton
                type="button"
                variant="primary"
                onClick={() => onStageChange(next.stage)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Resolver: {next.label}
              </ActionButton>
            ) : (
              <StatusBadge tone="active">Todo listo</StatusBadge>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readiness.signals.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onStageChange(item.stage)}
                className={item.done ? "lmn-readiness-card is-done" : "lmn-readiness-card"}
              >
                <span className="grid h-8 w-8 place-items-center rounded-[12px] border border-white/[0.065] bg-white/[0.020]">
                  {item.done ? (
                    <Check className="h-4 w-4 text-cyan-100" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/54" />
                  )}
                </span>
                <span className="min-w-0">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function CalibrationStageVisual({ stage }: { stage: StageKey }) {
  const visual = STAGE_VISUALS[stage];

  return (
    <GlassCard variant="base" accent className="lmn-calibration-stage-visual p-3">
      <CalibrationAssetCard
        variant={visual.variant}
        className="lmn-calibration-asset--side"
      />
      <div className="p-3">
        <h3 className="text-lg font-black text-white">{visual.title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/52">{visual.text}</p>
      </div>
    </GlassCard>
  );
}

function StageRail({
  stage,
  completion,
  onChange,
}: {
  stage: StageKey;
  completion: number;
  onChange(stage: StageKey): void;
}) {
  const activeIndex = Math.max(0, STAGES.findIndex((item) => item.key === stage));

  return (
    <GlassCard variant="soft" className="p-3">
      <div className="grid gap-2 md:grid-cols-5">
        {STAGES.map((item, index) => {
          const Icon = item.icon;
          const active = item.key === stage;
          const done = index < activeIndex || completion >= (index + 1) * 20;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className="apex-cut group flex min-h-[86px] items-start gap-3 border p-3 text-left transition hover:bg-white/[0.024]"
              style={{
                borderColor: active
                  ? `rgba(${accentA}, .36)`
                  : done
                  ? "rgba(0,229,255,.18)"
                  : "rgba(255,255,255,.055)",
                background: active
                  ? `linear-gradient(135deg, rgba(${accentA}, .12), rgba(${accentB}, .055)), rgba(255,255,255,.018)`
                  : "rgba(0,0,0,.20)",
              }}
            >
              <span className="apex-cut grid h-9 w-9 shrink-0 place-items-center border border-white/[0.06] bg-white/[0.018]">
                {done ? <Check className="h-4 w-4 text-white/78" /> : <Icon className="h-4 w-4 text-white/68" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm font-black text-white">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-white/44">
                  {item.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

function StrategyCanvas({ activeId }: { activeId?: string }) {
  const active = PSYCHOLOGY_BLUEPRINTS.find((item) => item.id === activeId);
  const cards = [
    ["Escuchar", "Refleja la necesidad antes de vender."],
    ["Diagnosticar", "Pregunta solo lo necesario para avanzar."],
    ["Reencuadrar", "Conecta el problema con valor real."],
    ["Cerrar", "Propone un micro-paso medible."],
  ];

  return (
    <GlassCard variant="base" className="lmn-modules-panel p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className="lmn-module-card lmn-module-autopilot apex-cut border p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
            blueprint activo
          </p>
          <h3 className="mt-8 text-2xl font-black text-white">
            {active?.name || "Personalidad custom"}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/58">
            {active?.description ||
              "Ajusta la mezcla para crear una voz propia y guardarla como version reutilizable."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(([title, text], index) => (
            <div
              key={title}
              className="apex-cut border border-white/[0.055] bg-black/50 p-4"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                0{index + 1}
              </span>
              <h4 className="mt-5 text-base font-black text-white">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-white/48">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function SalesVisualSystem({ sales }: { sales: CalibrationDoc["calibration"]["sales"] }) {
  const proactivity = clampNumber(sales.proactivity, 0, 100, 70);
  const closing = clampNumber(sales.closing, 0, 100, 75);
  const qualification = String(sales.qualification || "medium");

  const layers = [
    ["SPIN", "Situacion, problema, impacto y necesidad de solucion."],
    ["Challenger", "Reencuadre claro para mostrar criterio comercial."],
    ["Prueba", "Promesas reales, politicas y datos publicados."],
    ["Cierre", "Siguiente paso simple: contacto, agenda o compra."],
  ];

  return (
    <GlassCard variant="base" className="lmn-modules-panel p-5">
      <div className="grid gap-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
              motor comercial visual
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              Como LumenAI transforma una duda en oportunidad
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {layers.map(([title, text], index) => (
                <div
                  key={title}
                  className="apex-cut relative min-h-[150px] border border-white/[0.055] bg-black/48 p-4"
                >
                  <span
                    className="absolute right-4 top-4 h-2 w-2"
                    style={{
                      background: `linear-gradient(135deg, rgba(${accentA}, .95), rgba(${accentB}, .7))`,
                    }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                    paso {index + 1}
                  </span>
                  <h4 className="mt-9 text-base font-black text-white">{title}</h4>
                  <p className="mt-2 text-xs leading-5 text-white/48">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lmn-module-card lmn-module-leads apex-cut border p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
              intensidad actual
            </p>
            <div className="mt-8 grid gap-4">
              <MiniBar label="Proactividad" value={proactivity} />
              <MiniBar label="Cierre" value={closing} />
              <div className="apex-cut border border-white/[0.055] bg-black/42 p-3">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  calificacion
                </span>
                <strong className="mt-2 block text-lg font-black capitalize text-white">
                  {qualification}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function RulesSignalBoard() {
  const signals = [
    ["Puede decir", "Frases aprobadas y tono propio."],
    ["No debe decir", "Promesas falsas, presion o datos inventados."],
    ["Escala", "Humano cuando hay enojo, urgencia o reclamo."],
    ["Widget", "Saludo, acciones rapidas, color y posicion."],
  ];

  return (
    <GlassCard variant="base" className="lmn-modules-panel p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {signals.map(([title, text], index) => (
          <div
            key={title}
            className="apex-cut border border-white/[0.055] bg-black/48 p-4"
          >
            <span
              className="grid h-8 w-8 place-items-center border border-white/[0.06] text-xs font-black text-white/72"
              style={{ background: "rgba(255,255,255,.018)" }}
            >
              {index + 1}
            </span>
            <h3 className="mt-5 text-base font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/48">{text}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function PublishFlowVisual({ completion }: { completion: number }) {
  const items = [
    ["Draft", "Se guarda sin afectar clientes."],
    ["Preview", "Prueba la experiencia antes de publicar."],
    ["Publicar", "El widget recibe la nueva calibracion."],
    ["Medir", "Chats, leads y objeciones vuelven al panel."],
  ];

  return (
    <GlassCard variant="base" className="lmn-modules-panel p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
        <div className="grid gap-3 md:grid-cols-4">
          {items.map(([title, text], index) => (
            <div
              key={title}
              className="apex-cut border border-white/[0.055] bg-black/48 p-4"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                fase {index + 1}
              </span>
              <h3 className="mt-8 text-base font-black text-white">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-white/48">{text}</p>
            </div>
          ))}
        </div>
        <div className="apex-cut border border-white/[0.055] bg-black/48 p-5 text-center">
          <div className="text-5xl font-black text-white">{completion}%</div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
            listo para publicar
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black text-white/48">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-[3px] bg-white/[0.055]">
        <div
          className="h-full rounded-[3px]"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, rgba(${accentA}, .94), rgba(${accentB}, .7))`,
          }}
        />
      </div>
    </div>
  );
}

function BaseStage({
  identity,
  brandBrief,
  updateIdentity,
  updateBrandBrief,
}: {
  identity: CalibrationDoc["calibration"]["identity"];
  brandBrief: CalibrationDoc["calibration"]["brandBrief"];
  updateIdentity(patch: Partial<CalibrationDoc["calibration"]["identity"]>): void;
  updateBrandBrief(key: string, value: string): void;
}) {
  return (
    <div className="grid gap-5">
      <SectionIntro
        icon={BrainCircuit}
        title="Identidad que el cliente debe sentir"
        text="Configura lo minimo que la IA necesita para hablar como tu negocio: marca, promesa, cliente ideal y accion principal."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Marca y asistente" subtitle="Lo que el usuario vera y escuchara." />
          <div className="mt-5 grid gap-4">
            <TextField
              label="Nombre del negocio"
              value={identity.brandName}
              onChange={(value) => updateIdentity({ brandName: value })}
              placeholder="Ej: LumenAI"
            />
            <TextField
              label="Nombre del asistente"
              value={identity.assistantName}
              onChange={(value) => updateIdentity({ assistantName: value })}
              placeholder="Ej: LumenAI Assistant"
            />
            <TextField
              label="Promesa principal"
              value={identity.tagline}
              onChange={(value) => updateIdentity({ tagline: value })}
              placeholder="Ej: Atencion inteligente que convierte mas conversaciones."
            />
            <SelectField
              label="Accion principal"
              value={identity.primaryCTA}
              onChange={(value) => updateIdentity({ primaryCTA: value as PrimaryCTA })}
              options={[
                { value: "whatsapp", label: "Enviar a WhatsApp" },
                { value: "email", label: "Enviar por email" },
                { value: "agenda", label: "Agendar" },
                { value: "comprar", label: "Comprar" },
              ]}
            />
          </div>
        </GlassCard>

        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Brief narrado" subtitle="Puedes escribir o grabar audio; LumenAI lo convierte en texto." />
          <div className="mt-5 grid gap-4">
            <AudioTextArea
              label="Cliente ideal"
              value={brandBrief.idealCustomer || ""}
              onChange={(value) => updateBrandBrief("idealCustomer", value)}
              placeholder="Describe a quien atiendes, que busca y que le preocupa."
            />
            <AudioTextArea
              label="Diferenciacion"
              value={brandBrief.differentiation || ""}
              onChange={(value) => updateBrandBrief("differentiation", value)}
              placeholder="Que hace distinto al negocio y por que deberian elegirlo."
            />
          </div>
        </GlassCard>
      </div>

      <GlassCard variant="soft" className="p-5">
        <CardTitle title="Valores de marca" subtitle="Una linea por valor. Esto guia el tono del asistente." />
        <TextAreaField
          className="mt-4"
          label="Valores"
          value={listToText(identity.values)}
          onChange={(value) => updateIdentity({ values: textToList(value) })}
          placeholder="Claridad&#10;Rapidez&#10;Confianza"
          rows={4}
        />
      </GlassCard>
    </div>
  );
}

function PersonalityStage({
  activeId,
  savedProfiles,
  mix,
  rules,
  freeNotes,
  onApplyBlueprint,
  onApplySavedProfile,
  onSaveProfile,
  onMixChange,
  onRulesChange,
  onNotesChange,
}: {
  activeId?: string;
  savedProfiles: SavedProfile[];
  mix: Record<string, number>;
  rules: CalibrationDoc["calibration"]["personality"]["rules"];
  freeNotes: string;
  onApplyBlueprint(id: string): void;
  onApplySavedProfile(profile: SavedProfile): void;
  onSaveProfile(): void;
  onMixChange(key: string, value: number): void;
  onRulesChange(patch: AnyObj): void;
  onNotesChange(value: string): void;
}) {
  return (
    <div className="grid gap-5">
      <SectionIntro
        icon={Wand2}
        title="Personalidad guardable"
        text="Elige una base psicologica, ajusta el comportamiento y guarda variaciones para reutilizarlas despues."
      />

      <StrategyCanvas activeId={activeId} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PSYCHOLOGY_BLUEPRINTS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyBlueprint(preset.id)}
            className="lmn-module-card lmn-module-autopilot apex-cut group min-h-[220px] border p-5 text-left transition"
            style={{
              borderColor:
                activeId === preset.id
                  ? `rgba(${accentA}, .34)`
                  : "rgba(255,255,255,.058)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="lmn-module-icon apex-cut grid h-10 w-10 place-items-center border">
                <Sparkles className="h-4 w-4 text-white/82" />
              </span>
              <StatusBadge tone={activeId === preset.id ? "active" : "muted"}>
                {preset.tag}
              </StatusBadge>
            </div>
            <div className="mt-10 text-lg font-black text-white">{preset.name}</div>
            <p className="mt-3 text-sm leading-6 text-white/58">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Mezcla de comportamiento" subtitle="Ajustes simples que cambian como responde el asistente." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {MIX_FIELDS.map(([key, label, description]) => (
              <RangeField
                key={key}
                label={label}
                description={description}
                value={clampNumber(mix[key], 0, 100, 60)}
                onChange={(value) => onMixChange(key, value)}
              />
            ))}
          </div>
        </GlassCard>

        <div className="grid gap-5">
          <GlassCard variant="base" accent className="p-5">
            <CardTitle title="Reglas de respuesta" subtitle="Mantiene la IA clara y facil de seguir." />
            <div className="mt-5 grid gap-3">
              <ToggleField
                label="Reflejar comprension primero"
                description="La IA valida la necesidad antes de vender."
                value={Boolean(rules.reflectUnderstandingFirst)}
                onChange={(value) => onRulesChange({ reflectUnderstandingFirst: value })}
              />
              <ToggleField
                label="Terminar con pregunta o CTA"
                description="Cada respuesta deja un siguiente paso claro."
                value={Boolean(rules.endWithQuestionOrCTA)}
                onChange={(value) => onRulesChange({ endWithQuestionOrCTA: value })}
              />
              <NumberField
                label="Maximo de opciones por respuesta"
                value={clampNumber(rules.maxOptions, 1, 5, 2)}
                min={1}
                max={5}
                onChange={(value) => onRulesChange({ maxOptions: value })}
              />
            </div>
          </GlassCard>

          <GlassCard variant="soft" className="p-5">
            <CardTitle title="Biblioteca de personalidades" subtitle="Guarda versiones utiles para probar estilos." />
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton type="button" variant="primary" onClick={onSaveProfile}>
                Guardar personalidad actual
              </ActionButton>
            </div>
            <div className="mt-4 grid gap-2">
              {savedProfiles.length ? (
                savedProfiles.slice(0, 5).map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onApplySavedProfile(profile)}
                    className="apex-cut flex items-center justify-between gap-3 border border-white/[0.055] bg-white/[0.014] p-3 text-left transition hover:bg-white/[0.035]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">
                        {profile.name || "Personalidad"}
                      </span>
                      <span className="mt-1 block text-xs text-white/40">
                        {profile.createdAt ? formatDate(profile.createdAt) : "Guardada"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/42" />
                  </button>
                ))
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm leading-6 text-white/42">
                    Aun no hay personalidades guardadas. Ajusta una mezcla y guardala.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard variant="base" accent className="p-5">
        <CardTitle title="Notas de personalidad" subtitle="Tambien puedes grabarlas con audio." />
        <AudioTextArea
          className="mt-4"
          label="Instrucciones libres"
          value={freeNotes}
          onChange={onNotesChange}
          placeholder="Ej: responder con seguridad, evitar frases demasiado informales, explicar beneficios en lenguaje simple..."
        />
      </GlassCard>
    </div>
  );
}

function SalesStage({
  sales,
  brandBrief,
  updateSales,
  updateBrandBrief,
}: {
  sales: CalibrationDoc["calibration"]["sales"];
  brandBrief: Record<string, string>;
  updateSales(patch: AnyObj): void;
  updateBrandBrief(key: string, value: string): void;
}) {
  const objectionHandling = isObj(sales.objectionHandling)
    ? sales.objectionHandling
    : {};

  return (
    <div className="grid gap-5">
      <SectionIntro
        icon={Target}
        title="Arquitectura psicologica de ventas"
        text="LumenAI combina venta consultiva, preguntas SPIN, reencuadre tipo Challenger y persuasion etica. Sin presion falsa."
      />

      <SalesVisualSystem sales={sales} />

      <GlassCard variant="base" accent className="p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div>
            <CardTitle title="Sistema de decision" subtitle="El orden que seguira la IA antes de cerrar." />
            <div className="mt-5 grid gap-3">
              {[
                ["1", "Diagnosticar", "Entender necesidad real, urgencia y friccion."],
                ["2", "Reencuadrar", "Mostrar el costo de no resolver y el criterio correcto."],
                ["3", "Recomendar", "Ofrecer una opcion clara, no un catalogo infinito."],
                ["4", "Cerrar suave", "Pedir un micro-compromiso: dato, WhatsApp o agenda."],
              ].map(([step, title, text]) => (
                <div
                  key={step}
                  className="apex-cut grid grid-cols-[44px_minmax(0,1fr)] gap-3 border border-white/[0.055] bg-white/[0.014] p-3"
                >
                  <span className="apex-cut grid h-10 w-10 place-items-center border border-white/[0.065] bg-white/[0.018] text-sm font-black text-white">
                    {step}
                  </span>
                  <span>
                    <span className="block text-sm font-black text-white">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/46">{text}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <SelectField
              label="Nivel de calificacion"
              value={String(sales.qualification || "medium")}
              onChange={(value) => updateSales({ qualification: value })}
              options={[
                { value: "low", label: "Ligero: responde y orienta" },
                { value: "medium", label: "Medio: detecta intencion" },
                { value: "high", label: "Alto: califica antes de derivar" },
              ]}
            />
            <RangeField
              label="Proactividad"
              description="Que tanto propone el siguiente paso."
              value={clampNumber(sales.proactivity, 0, 100, 70)}
              onChange={(value) => updateSales({ proactivity: value })}
            />
            <RangeField
              label="Cierre comercial"
              description="Que tan fuerte guia hacia contacto, agenda o compra."
              value={clampNumber(sales.closing, 0, 100, 75)}
              onChange={(value) => updateSales({ closing: value })}
            />
            <ToggleField
              label="Usar urgencia solo si es real"
              description="No inventa escasez ni presiona artificialmente."
              value={Boolean(sales.allowUrgency)}
              onChange={(value) => updateSales({ allowUrgency: value })}
            />
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Objeciones y pruebas" subtitle="La IA usara esto para responder dudas de compra." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["price", "Precio"],
              ["time", "Tiempo"],
              ["trust", "Confianza"],
              ["comparison", "Comparacion"],
            ].map(([key, label]) => (
              <ToggleField
                key={key}
                label={label}
                value={Boolean(objectionHandling[key])}
                onChange={(value) =>
                  updateSales({
                    objectionHandling: {
                      ...objectionHandling,
                      [key]: value,
                    },
                  })
                }
              />
            ))}
          </div>
          <AudioTextArea
            className="mt-5"
            label="Objeciones comunes"
            value={brandBrief.objections || ""}
            onChange={(value) => updateBrandBrief("objections", value)}
            placeholder="Ej: es caro, necesito pensarlo, no confio, quiero comparar..."
          />
        </GlassCard>

        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Promesas y cierre" subtitle="Define lo que si puede decir y como debe cerrar." />
          <AudioTextArea
            label="Promesas reales"
            value={brandBrief.promises || ""}
            onChange={(value) => updateBrandBrief("promises", value)}
            placeholder="Resultados, tiempos, garantias o beneficios que sean verdaderos."
          />
          <TextAreaField
            className="mt-4"
            label="Estilo de cierre"
            value={sales.closingStyle || ""}
            onChange={(value) => updateSales({ closingStyle: value })}
            placeholder="Ej: proponer WhatsApp cuando haya interes claro; pedir un dato antes de cotizar."
            rows={4}
          />
          <TextAreaField
            className="mt-4"
            label="Modelo de descubrimiento"
            value={sales.discoveryModel || ""}
            onChange={(value) => updateSales({ discoveryModel: value })}
            placeholder="Ej: hacer una pregunta por turno: necesidad, plazo, presupuesto o urgencia."
            rows={4}
          />
        </GlassCard>
      </div>
    </div>
  );
}

function RulesStage({
  lexicon,
  guardrails,
  widget,
  theme,
  updateLexicon,
  updateGuardrails,
  updateWidget,
  updateWidgetTheme,
}: {
  lexicon: CalibrationDoc["calibration"]["lexicon"];
  guardrails: CalibrationDoc["calibration"]["guardrails"];
  widget: CalibrationDoc["widget"];
  theme: CalibrationDoc["widget"]["theme"];
  updateLexicon(patch: AnyObj): void;
  updateGuardrails(patch: AnyObj): void;
  updateWidget(patch: AnyObj): void;
  updateWidgetTheme(patch: AnyObj): void;
}) {
  return (
    <div className="grid gap-5">
      <SectionIntro
        icon={ShieldCheck}
        title="Reglas que protegen la experiencia"
        text="Controla palabras, derivacion humana, saludo del widget y estilo visual sin tocar codigo."
      />

      <RulesSignalBoard />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Lenguaje permitido" subtitle="Una frase por linea. El asistente las usara como estilo de marca." />
          <TextAreaField
            className="mt-4"
            label="Frases permitidas"
            value={listToText(lexicon.allowedPhrases)}
            onChange={(value) => updateLexicon({ allowedPhrases: textToList(value) })}
            placeholder="Te lo dejo claro&#10;La opcion mas recomendable es&#10;Podemos avanzar por WhatsApp"
            rows={5}
          />
          <TextAreaField
            className="mt-4"
            label="Frases prohibidas"
            value={listToText(lexicon.forbiddenPhrases)}
            onChange={(value) => updateLexicon({ forbiddenPhrases: textToList(value) })}
            placeholder="No prometas descuentos&#10;No digas cupos limitados si no es real"
            rows={5}
          />
          <TextAreaField
            className="mt-4"
            label="Diccionario interno"
            value={dictionaryToText(lexicon.dictionary)}
            onChange={(value) => updateLexicon({ dictionary: textToDictionary(value) })}
            placeholder="CRM=Sistema de gestion de clientes&#10;Lead=Persona interesada"
            rows={5}
          />
        </GlassCard>

        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Escalado y limites" subtitle="Cuando la IA debe dejar de insistir y pasar a humano." />
          <div className="mt-5 grid gap-4">
            <ToggleField
              label="Derivar a humano cuando haga falta"
              description="Reclamos, urgencias, enojo o pedido explicito."
              value={Boolean(guardrails?.escalate?.enabled)}
              onChange={(value) =>
                updateGuardrails({
                  escalate: {
                    ...(guardrails.escalate || {}),
                    enabled: value,
                  },
                })
              }
            />
            <TextAreaField
              label="Condiciones de escalado"
              value={listToText(guardrails?.escalate?.when)}
              onChange={(value) =>
                updateGuardrails({
                  escalate: {
                    ...(guardrails.escalate || {}),
                    when: textToList(value),
                  },
                })
              }
              placeholder="pide_humano&#10;enojo&#10;urgente"
              rows={4}
            />
            <TextAreaField
              label="No hacer"
              value={listToText(guardrails.dontDo)}
              onChange={(value) => updateGuardrails({ dontDo: textToList(value) })}
              placeholder="No inventar precios&#10;No prometer garantias no publicadas&#10;No usar urgencia falsa"
              rows={5}
            />
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Saludo y acciones del widget" subtitle="Esto es lo primero que vera el cliente en la web." />
          <AudioTextArea
            className="mt-4"
            label="Saludo inicial"
            value={widget.greeting || ""}
            onChange={(value) => updateWidget({ greeting: value })}
            placeholder="Hola, soy LumenAI. Te ayudo a cotizar, resolver dudas o hablar con el equipo."
          />
          <TextAreaField
            className="mt-4"
            label="Botones rapidos"
            value={listToText(widget.quickActions)}
            onChange={(value) => updateWidget({ quickActions: textToList(value) })}
            placeholder="Quiero cotizar&#10;Ver servicios&#10;Horarios&#10;Hablar con humano"
            rows={4}
          />
        </GlassCard>

        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Color del asistente" subtitle="Se refleja en panel, preview y widget." />
          <div className="mt-5 grid gap-4">
            <ColorField
              label="Color principal"
              value={theme.primaryColor || "#2F7CFF"}
              onChange={(value) => updateWidgetTheme({ primaryColor: value, gradientFrom: value })}
            />
            <ColorField
              label="Color secundario"
              value={theme.gradientTo || "#5BE0C2"}
              onChange={(value) => updateWidgetTheme({ gradientTo: value })}
            />
            <SelectField
              label="Posicion"
              value={widget.position || "br"}
              onChange={(value) => updateWidget({ position: value })}
              options={[
                { value: "br", label: "Abajo derecha" },
                { value: "bl", label: "Abajo izquierda" },
                { value: "tr", label: "Arriba derecha" },
                { value: "tl", label: "Arriba izquierda" },
              ]}
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ReviewStage({
  publicKey,
  published,
  previewUrl,
  completion,
  onSave,
  onPublish,
  saving,
  dirty,
}: {
  publicKey: string;
  published: CalibrationDoc | null;
  previewUrl: string;
  completion: { done: number; total: number; percent: number };
  onSave(): void;
  onPublish(): void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <div className="grid gap-5">
      <SectionIntro
        icon={Rocket}
        title="Revision final antes de salir en vivo"
        text="Guarda el borrador, prueba el preview y publica solo cuando la experiencia este lista para clientes reales."
      />

      <PublishFlowVisual completion={completion.percent} />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Estado del Studio" subtitle="Checklist ejecutivo." />
          <div className="mt-5 grid gap-3">
            <CheckRow done={completion.percent >= 40} label="Identidad configurada" />
            <CheckRow done={completion.percent >= 60} label="Personalidad calibrada" />
            <CheckRow done={completion.percent >= 70} label="Motor comercial activo" />
            <CheckRow done={completion.percent >= 80} label="Widget con saludo y acciones" />
            <CheckRow done={!dirty} label="Borrador guardado" />
          </div>
        </GlassCard>

        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Publicacion" subtitle="Lo publicado es lo que usa el widget real." />
          <div className="mt-5 grid gap-3 text-sm text-white/58">
            <FactLine label="Completitud" value={`${completion.done}/${completion.total}`} />
            <FactLine label="Ultima publicacion" value={formatDate(published?.compiled?.updatedAt)} />
            <FactLine label="Public key" value={publicKey || "Sin key"} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton type="button" variant="secondary" onClick={onSave} disabled={saving || !dirty}>
              Guardar
            </ActionButton>
            <ActionButton type="button" variant="primary" onClick={onPublish} disabled={saving || !publicKey}>
              Publicar al widget
            </ActionButton>
          </div>
        </GlassCard>

        <GlassCard variant="base" accent className="p-5">
          <CardTitle title="Preview publico" subtitle="Abre el widget con el draft actual." />
          <p className="mt-5 text-sm leading-6 text-white/50">
            El preview carga la configuracion de borrador sin afectar a usuarios reales.
          </p>
          <div className="mt-5">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={!previewUrl}
              onClick={() => previewUrl && window.open(previewUrl, "_blank")}
            >
              <Eye className="h-3.5 w-3.5" />
              Abrir preview
            </ActionButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function AssistantPreview({ draft }: { draft: CalibrationDoc }) {
  const identity = draft.calibration.identity;
  const mix = draft.calibration.personality.mix;
  const sales = draft.calibration.sales || {};
  const widget = draft.widget || {};
  const theme = widget.theme || {};
  const primary = normalizeHex(theme.primaryColor, "#2F7CFF");
  const secondary = normalizeHex(theme.gradientTo, "#5BE0C2");
  const business = identity.brandName || "Tu negocio";
  const assistant = identity.assistantName || "LumenAI";
  const empathy = clampNumber(mix.empathy, 0, 100, 70);
  const directivity = clampNumber(mix.directivity, 0, 100, 70);
  const closing = clampNumber(sales.closing, 0, 100, 75);

  return (
    <GlassCard variant="base" accent className="overflow-hidden p-0">
      <div
        className="border-b border-white/[0.055] p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,.024), rgba(255,255,255,.004)), #030509",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="apex-cut grid h-12 w-12 shrink-0 place-items-center border text-sm font-black text-white"
            style={{
              borderColor: "rgba(255,255,255,.08)",
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            }}
          >
            {assistant.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{assistant}</div>
            <div className="mt-1 truncate text-xs text-white/42">{business}</div>
          </div>
          <StatusBadge tone="active" className="ml-auto">Draft</StatusBadge>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        <MessageBubble
          from="assistant"
          title={(widget.greeting || "Hola, soy LumenAI.").split("\n")[0]}
          text={(widget.greeting || "Te ayudo a cotizar, resolver dudas o hablar con el equipo.").split("\n").slice(1).join("\n") || "Te ayudo a cotizar, resolver dudas o hablar con el equipo."}
        />
        <MessageBubble from="user" text="Hola, quiero cotizar y saber si me conviene." />
        <MessageBubble
          from="assistant"
          title={empathy >= 70 ? "Perfecto, te guio." : "Entendido."}
          text={
            directivity >= 70
              ? "Para recomendarte bien, necesito solo un dato: que resultado quieres conseguir primero?"
              : "Puedo explicarte las opciones y ayudarte a elegir la mas conveniente."
          }
        />
        <MessageBubble
          from="assistant"
          title={closing >= 78 ? "Siguiente paso" : "Opciones"}
          text={
            closing >= 78
              ? "Si quieres, avanzamos con una recomendacion concreta y te dejo listo el contacto por WhatsApp."
              : "Podemos revisar beneficios, precios publicados o disponibilidad antes de avanzar."
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/[0.055] p-5">
        <MiniSignal label="Empatia" value={empathy} />
        <MiniSignal label="Direccion" value={directivity} />
        <MiniSignal label="Cierre" value={closing} />
      </div>
    </GlassCard>
  );
}

function SectionIntro({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BrainCircuit;
  title: string;
  text: string;
}) {
  return (
    <GlassCard variant="soft" accent className="p-5">
      <div className="flex items-start gap-4">
        <div className="apex-cut grid h-12 w-12 shrink-0 place-items-center border border-white/[0.07] bg-white/[0.018]">
          <Icon className="h-5 w-5 text-white/75" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-white md:text-2xl">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">{text}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-base font-black text-white">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm leading-6 text-white/46">{subtitle}</p> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/42">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="apex-cut h-11 border border-white/[0.060] bg-black/36 px-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/14 focus:bg-black/48"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/42">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clampNumber(e.target.value, min, max, value))}
        className="apex-cut h-11 border border-white/[0.060] bg-black/36 px-3 text-sm text-white outline-none transition focus:border-white/14 focus:bg-black/48"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/42">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="apex-cut h-11 border border-white/[0.060] bg-black/36 px-3 text-sm text-white outline-none transition focus:border-white/14 focus:bg-black/48"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#05070d]">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={className ? `grid gap-2 ${className}` : "grid gap-2"}>
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/42">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="apex-cut min-h-[120px] resize-y border border-white/[0.060] bg-black/36 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/28 focus:border-white/14 focus:bg-black/48"
      />
    </label>
  );
}

function AudioTextArea({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  className?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioError, setAudioError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setAudioError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("El navegador no permite grabar audio.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        void transcribeAudio();
      };

      recorder.start();
      setRecording(true);
    } catch (e: unknown) {
      setAudioError(getErrorMessage(e, "No se pudo iniciar la grabacion."));
    }
  }

  function stopRecording() {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  async function transcribeAudio() {
    const chunks = chunksRef.current;
    if (!chunks.length) return;

    setTranscribing(true);
    setAudioError("");

    try {
      const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
      const form = new FormData();
      form.set("audio", blob, "calibration-note.webm");
      form.set("language", "es");

      const res = await fetch("/api/widget/transcribe", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));

      if (!res.ok || !isObj(data) || data.ok !== true) {
        throw new Error(
          isObj(data) && typeof data.error === "string"
            ? data.error
            : `Transcripcion fallo ${res.status}`
        );
      }

      const text = String(isObj(data) ? data.text || "" : "").trim();
      if (text) {
        onChange(value ? `${value.trim()}\n${text}` : text);
      }
    } catch (e: unknown) {
      setAudioError(getErrorMessage(e, "No se pudo transcribir el audio."));
    } finally {
      setTranscribing(false);
      chunksRef.current = [];
    }
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className={className ? `grid gap-2 ${className}` : "grid gap-2"}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-white/42">{label}</span>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          className="apex-cut inline-flex h-9 items-center gap-2 border border-white/[0.070] bg-white/[0.018] px-3 text-xs font-black text-white transition hover:bg-white/[0.04] disabled:opacity-50"
        >
          {transcribing ? (
            <>
              <AudioLines className="h-3.5 w-3.5 animate-pulse" />
              Transcribiendo
            </>
          ) : recording ? (
            <>
              <StopCircle className="h-3.5 w-3.5 text-red-200" />
              Detener
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              Grabar audio
            </>
          )}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="apex-cut min-h-[136px] resize-y border border-white/[0.060] bg-black/36 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/28 focus:border-white/14 focus:bg-black/48"
      />
      {audioError ? (
        <span className="text-xs font-semibold text-red-200">{audioError}</span>
      ) : recording ? (
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/48">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-300" />
          Grabando. Habla normal y luego presiona detener.
        </span>
      ) : null}
    </div>
  );
}

function RangeField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  onChange(value: number): void;
}) {
  return (
    <div className="apex-cut border border-white/[0.055] bg-white/[0.014] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">{label}</div>
          {description ? (
            <div className="mt-1 text-xs leading-5 text-white/42">{description}</div>
          ) : null}
        </div>
        <StatusBadge tone="active">{Math.round(value)}%</StatusBadge>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? value)}
        className="mt-5"
      />
    </div>
  );
}

function ToggleField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="apex-cut flex min-h-[72px] items-center justify-between gap-4 border border-white/[0.055] bg-white/[0.014] p-3 text-left transition hover:bg-white/[0.035]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-white">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-white/42">{description}</span>
        ) : null}
      </span>
      <span
        className="relative h-7 w-12 shrink-0 rounded-full border"
        style={{
          borderColor: value ? `rgba(${accentA}, .30)` : "rgba(255,255,255,.09)",
          background: value
            ? `linear-gradient(135deg, rgba(${accentA}, .42), rgba(${accentB}, .26))`
            : "rgba(255,255,255,.04)",
        }}
      >
        <span
          className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all duration-150"
          style={{ left: value ? 24 : 3 }}
        />
      </span>
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  const safe = normalizeHex(value);

  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/42">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className="apex-cut h-11 w-11 shrink-0 border border-white/[0.070]"
          style={{ background: `linear-gradient(135deg, ${safe}, ${safe}88)` }}
        />
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-12 cursor-pointer bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="apex-cut h-11 min-w-0 flex-1 border border-white/[0.060] bg-black/36 px-3 text-sm text-white outline-none focus:border-white/14"
        />
      </div>
    </label>
  );
}

function MessageBubble({
  from,
  title,
  text,
}: {
  from: "assistant" | "user";
  title?: string;
  text: string;
}) {
  const isUser = from === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className="max-w-[86%] border px-4 py-3"
        style={{
          borderRadius: 8,
          borderColor: isUser ? `rgba(${accentA}, .20)` : "rgba(255,255,255,.060)",
          background: isUser
            ? `linear-gradient(135deg, rgba(${accentA}, .24), rgba(${accentB}, .14)), #05070d`
            : "linear-gradient(145deg, rgba(255,255,255,.028), rgba(255,255,255,.006)), #05070d",
        }}
      >
        {title ? <div className="mb-1 text-sm font-black text-white">{title}</div> : null}
        <div className="whitespace-pre-wrap text-sm leading-6 text-white/72">{text}</div>
        <div className={isUser ? "mt-2 text-right text-[10px] text-white/34" : "mt-2 text-[10px] text-white/34"}>
          {isUser ? "Cliente" : "LumenAI"} / ahora
        </div>
      </div>
    </div>
  );
}

function MiniSignal({ label, value }: { label: string; value: number }) {
  return (
    <div className="apex-cut border border-white/[0.055] bg-white/[0.014] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">{label}</div>
      <div className="mt-2 text-lg font-black text-white">{Math.round(value)}%</div>
    </div>
  );
}

function FactLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.045] py-2 last:border-b-0">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-white/32">{label}</span>
      <span className="min-w-0 truncate text-right text-xs font-semibold text-white/66">{value}</span>
    </div>
  );
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border"
        style={{
          borderColor: done ? `rgba(${accentA}, .28)` : "rgba(255,255,255,.08)",
          background: done ? `rgba(${accentA}, .14)` : "rgba(255,255,255,.018)",
        }}
      >
        {done ? <Check className="h-3.5 w-3.5 text-white" /> : <Pause className="h-3.5 w-3.5 text-white/34" />}
      </span>
      <span className={done ? "text-sm font-semibold text-white/76" : "text-sm font-semibold text-white/38"}>
        {label}
      </span>
    </div>
  );
}
