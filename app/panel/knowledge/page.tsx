"use client";

 

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Landmark, WalletCards } from "lucide-react";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import { supabase } from "@/lib/supabase/client";
import { getActiveBusinessIdClient } from "@/lib/supabase/lumen/getActiveBusinessClient";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { ModuleTabs } from "../_components/ui/ModuleTabs";
import { FieldGroup } from "../_components/ui/FieldGroup";
import { PreviewShell } from "../_components/ui/PreviewShell";
import { ChecklistItem } from "../_components/ui/ChecklistItem";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { ActionButton } from "../_components/ui/ActionButton";
import { SaveBar } from "../_components/ui/SaveBar";
import { BusinessHoursConsole } from "./BusinessHoursConsole";
import SectionIntroGate from "../_components/SectionIntroGate";
import styles from "./knowledge.module.css";

type KBType = "faq" | "services" | "pricing" | "policy" | "contact" | "payment" | "other";

type KBItem = {
  id: string;
  business_id: string;
  type: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DayHours = { open: boolean; from: string; to: string };
type SpecialDateRule = { closed: boolean; reason?: string };
type BusinessHours = Record<DayKey, DayHours> & {
  closedDates?: Record<string, SpecialDateRule>;
};

type ProfileRow = {
  whatsapp: string | null;
  email: string | null;
  business_hours: BusinessHours;
};

const TYPE_OPTIONS: { value: KBType; label: string; description: string }[] = [
  { value: "faq", label: "FAQ", description: "Preguntas frecuentes" },
  { value: "services", label: "Servicios", description: "Qué vende el negocio" },
  { value: "pricing", label: "Precios", description: "Valores y planes" },
  { value: "policy", label: "Políticas", description: "Reglas y condiciones" },
  { value: "contact", label: "Contacto", description: "Canales y derivación" },
  { value: "payment", label: "Pagos", description: "Datos de transferencia" },
  { value: "other", label: "Otro", description: "Notas internas" },
];

const TYPE_TABS = [
  { key: "all", label: "Todo", description: "Base completa" },
  ...TYPE_OPTIONS.map((x) => ({
    key: x.value,
    label: x.label,
    description: x.description,
  })),
];

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: true, from: "10:00", to: "18:00" },
  tue: { open: true, from: "10:00", to: "18:00" },
  wed: { open: true, from: "10:00", to: "18:00" },
  thu: { open: true, from: "10:00", to: "18:00" },
  fri: { open: true, from: "10:00", to: "18:00" },
  sat: { open: false, from: "10:00", to: "14:00" },
  sun: { open: false, from: "10:00", to: "14:00" },
};

function humanType(t: string) {
  const v = (t || "").toLowerCase() as KBType;
  return TYPE_OPTIONS.find((x) => x.value === v)?.label ?? (t || "—");
}

function isEmailLike(s: string) {
  const v = String(s ?? "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizeWhatsApp(s: string) {
  const v = String(s ?? "").trim();
  if (!v) return null;
  const cleaned = v.replace(/[^\d+]/g, "");
  return cleaned.length ? cleaned : null;
}

function normalizeHours(value: unknown): BusinessHours {
  const base = DEFAULT_HOURS;
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const out: BusinessHours = { ...base };
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  for (const k of keys) {
    const raw = source[k];
    const v =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};

    out[k] = {
      open: typeof v?.open === "boolean" ? v.open : base[k].open,
      from: typeof v?.from === "string" ? v.from : base[k].from,
      to: typeof v?.to === "string" ? v.to : base[k].to,
    };
  }

  const closedDates =
    source.closedDates &&
    typeof source.closedDates === "object" &&
    !Array.isArray(source.closedDates)
      ? source.closedDates
      : {};

  out.closedDates = Object.entries(closedDates).reduce(
    (acc: Record<string, SpecialDateRule>, [date, rule]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return acc;
      const r = rule && typeof rule === "object" ? (rule as Record<string, unknown>) : {};
      acc[date] = {
        closed: typeof r.closed === "boolean" ? r.closed : true,
        reason: String(r.reason ?? "").trim(),
      };
      return acc;
    },
    {}
  );

  return out as BusinessHours;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const sorter = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return v;

    seen.add(v);

    if (Array.isArray(v)) return v.map(sorter);

    const record = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    Object.keys(record)
      .sort()
      .forEach((k) => {
        out[k] = sorter(record[k]);
      });

    return out;
  };

  try {
    return JSON.stringify(sorter(value));
  } catch {
    return JSON.stringify(value);
  }
}

function countByType(items: KBItem[], type: KBType) {
  return items.filter((x) => x.is_published && (x.type || "").toLowerCase() === type).length;
}

function PaymentShortcut({
  icon,
  title,
  text,
  done,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.020] p-3 text-left transition hover:border-white/12 hover:bg-white/[0.045]"
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-[12px] border"
        style={{
          borderColor: "rgba(var(--lmn-accent-rgb,0,140,255),.18)",
          background:
            "linear-gradient(135deg, rgba(var(--lmn-accent-rgb,0,140,255),.10), rgba(var(--lmn-accent-2-rgb,108,59,255),.07))",
        }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-white/44">{text}</span>
      </span>
      <span className="rounded-full border border-white/10 bg-white/[0.030] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
        {done ? "Editar" : "Crear"}
      </span>
    </button>
  );
}

export default function KnowledgePage() {
  const [loadingGate, setLoadingGate] = useState(true);
  const [loadingKB, setLoadingKB] = useState(true);
  const [errKB, setErrKB] = useState<string | null>(null);

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [bizName, setBizName] = useState("Tu negocio");

  const [items, setItems] = useState<KBItem[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<KBType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formType, setFormType] = useState<KBType>("faq");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPublished, setFormPublished] = useState(true);
  const [savingKB, setSavingKB] = useState(false);
  const knowledgeDialogRef = useModalAccessibility<HTMLDivElement>({
    active: open,
    closeDisabled: savingKB,
    onClose: closeModal,
  });

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [errProfile, setErrProfile] = useState<string | null>(null);

  const profileHydratedRef = useRef(false);
  const profileLastSavedRef = useRef("");

  const stats = useMemo(() => {
    const published = items.filter((x) => x.is_published).length;
    const drafts = items.length - published;

    return {
      total: items.length,
      published,
      drafts,
      faq: countByType(items, "faq"),
      services: countByType(items, "services"),
      pricing: countByType(items, "pricing"),
      policy: countByType(items, "policy"),
      payment: countByType(items, "payment"),
    };
  }, [items]);

  const completion = useMemo(() => {
    const checks = [
      stats.services > 0,
      stats.pricing > 0,
      stats.faq > 0,
      stats.policy > 0,
      stats.payment > 0,
      !!profile?.whatsapp || !!profile?.email,
      !!profile?.business_hours,
    ];

    const done = checks.filter(Boolean).length;

    return {
      done,
      total: checks.length,
      percent: Math.round((done / checks.length) * 100),
    };
  }, [stats, profile]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((it) => {
      const okType =
        typeFilter === "all"
          ? true
          : (it.type || "").toLowerCase() === typeFilter;

      const okStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
          ? it.is_published
          : !it.is_published;

      const okQ =
        !qq ||
        (it.title || "").toLowerCase().includes(qq) ||
        (it.content || "").toLowerCase().includes(qq);

      return okType && okStatus && okQ;
    });
  }, [items, q, typeFilter, statusFilter]);

  const publishedPreview = useMemo(() => {
    return items.filter((x) => x.is_published).slice(0, 4);
  }, [items]);

  const profileDirty = useMemo(() => {
    if (!profileHydratedRef.current || !profile) return false;
    return stableStringify(profile) !== profileLastSavedRef.current;
  }, [profile]);

  const saveBarVisible = profileDirty || savingProfile || !!errProfile;

  async function loadKB(bid: string) {
    setErrKB(null);
    setLoadingKB(true);

    try {
      const { data, error } = await supabase
        .from("business_kb")
        .select("id,business_id,type,title,content,is_published,created_at,updated_at")
        .eq("business_id", bid)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);

      setItems((data as KBItem[]) ?? []);
    } catch (error: unknown) {
      setErrKB(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la Knowledge Base.",
      );
    } finally {
      setLoadingKB(false);
    }
  }

  async function ensureWidgetSettingsRow(bid: string) {
    const { data, error } = await supabase
      .from("widget_settings")
      .select("business_id,whatsapp,email,business_hours")
      .eq("business_id", bid)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      const fullInsert = {
        business_id: bid,
        widget_enabled: true,
        greeting: "Hola 👋 ¿En qué te puedo ayudar?",
        assistant_name: "LumenAI",
        tone: "neutral",
        position: "br",
        primary_color: "#00E5FF",
        gradient_from: "#00E5FF",
        gradient_to: "#6C3BFF",
        font_family: "Inter",
        whatsapp: null,
        email: null,
        business_hours: DEFAULT_HOURS,
      };

      const { error: insErr } = await supabase.from("widget_settings").insert(fullInsert);

      if (insErr) throw new Error(insErr.message);

      const created: ProfileRow = {
        whatsapp: null,
        email: null,
        business_hours: DEFAULT_HOURS,
      };

      setProfile(created);
      profileLastSavedRef.current = stableStringify(created);
      profileHydratedRef.current = true;
      return;
    }

    const next: ProfileRow = {
      whatsapp: data.whatsapp ? String(data.whatsapp) : null,
      email: data.email ? String(data.email) : null,
      business_hours: normalizeHours(
        (data as { business_hours?: unknown }).business_hours,
      ),
    };

    setProfile(next);
    profileLastSavedRef.current = stableStringify(next);
    profileHydratedRef.current = true;
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setFormType("faq");
    setFormTitle("");
    setFormContent("");
    setFormPublished(true);
    setOpen(true);
  }

  function openPaymentTemplate(kind: "paypal" | "bank" | "rut") {
    const templates = {
      paypal: {
        title: "Datos de pago PayPal",
        content:
          "Medio de pago: PayPal\nEmail PayPal: reemplaza@tuempresa.com\nTitular: Nombre del negocio\nInstruccion: enviar comprobante por WhatsApp o email despues de pagar.",
      },
      bank: {
        title: "Datos de transferencia bancaria",
        content:
          "Banco: Nombre del banco\nTipo de cuenta: Corriente / Vista / Ahorro\nNumero de cuenta: 000000000\nTitular: Nombre del negocio\nRUT / ID fiscal: 00.000.000-0\nEmail comprobante: pagos@tuempresa.com",
      },
      rut: {
        title: "Datos Cuenta RUT",
        content:
          "Banco: BancoEstado\nTipo de cuenta: Cuenta RUT\nNumero de cuenta: 00.000.000-0\nTitular: Nombre del negocio\nRUT: 00.000.000-0\nEmail comprobante: pagos@tuempresa.com",
      },
    };

    const template = templates[kind];

    setMode("create");
    setEditingId(null);
    setFormType("payment");
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormPublished(true);
    setOpen(true);
  }

  function openEdit(item: KBItem) {
    setMode("edit");
    setEditingId(item.id);
    setFormType(((item.type || "faq").toLowerCase() as KBType) ?? "faq");
    setFormTitle(item.title ?? "");
    setFormContent(item.content ?? "");
    setFormPublished(!!item.is_published);
    setOpen(true);
  }

  function closeModal() {
    if (savingKB) return;
    setOpen(false);
  }

  async function saveKB() {
    if (!businessId) return;

    const title = formTitle.trim();
    const content = formContent.trim();

    if (!title || !content) {
      setErrKB("Completa título y contenido.");
      return;
    }

    setSavingKB(true);
    setErrKB(null);

    try {
      if (mode === "create") {
        const { error } = await supabase.from("business_kb").insert({
          business_id: businessId,
          type: formType,
          title,
          content,
          is_published: formPublished,
        });

        if (error) throw new Error(error.message);
      } else {
        if (!editingId) throw new Error("No editingId");

        const { error } = await supabase
          .from("business_kb")
          .update({
            type: formType,
            title,
            content,
            is_published: formPublished,
          })
          .eq("id", editingId);

        if (error) throw new Error(error.message);
      }

      await loadKB(businessId);
      setOpen(false);
    } catch (error: unknown) {
      setErrKB(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSavingKB(false);
    }
  }

  async function togglePublish(item: KBItem) {
    if (!businessId) return;

    setErrKB(null);

    const next = !item.is_published;

    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, is_published: next } : x))
    );

    const { error } = await supabase
      .from("business_kb")
      .update({ is_published: next })
      .eq("id", item.id);

    if (error) {
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, is_published: !next } : x))
      );
      setErrKB(error.message);
    }
  }

  async function remove(item: KBItem) {
    if (!businessId) return;

    setErrKB(null);

    const ok = window.confirm(`¿Eliminar "${item.title}"?`);
    if (!ok) return;

    const { error } = await supabase.from("business_kb").delete().eq("id", item.id);

    if (error) {
      setErrKB(error.message);
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== item.id));
  }

function updateHours(day: DayKey, patch: Partial<DayHours>) {
    setProfile((current) => {
      if (!current) return current;

      return {
        ...current,
        business_hours: {
          ...current.business_hours,
          [day]: {
            ...current.business_hours[day],
            ...patch,
          },
        },
      };
    });
  }

  function updateClosedDate(dateKey: string, patch: SpecialDateRule | null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;

    setProfile((current) => {
      if (!current) return current;

      const nextClosedDates = {
        ...(current.business_hours.closedDates ?? {}),
      };

      if (patch) {
        nextClosedDates[dateKey] = patch;
      } else {
        delete nextClosedDates[dateKey];
      }

      return {
        ...current,
        business_hours: {
          ...current.business_hours,
          closedDates: nextClosedDates,
        },
      };
    });
  }

  const saveProfile = useCallback(async () => {
    if (!businessId || !profile) return;

    const emailOk = isEmailLike(profile.email ?? "");

    if (!emailOk) {
      setErrProfile("El email no parece válido. Ejemplo: contacto@tuempresa.cl");
      return;
    }

    setSavingProfile(true);
    setErrProfile(null);

    const payload = {
      whatsapp: normalizeWhatsApp(profile.whatsapp ?? "") ?? null,
      email: profile.email ? String(profile.email).trim() || null : null,
      business_hours: normalizeHours(profile.business_hours),
    };

    const { error } = await supabase
      .from("widget_settings")
      .update(payload)
      .eq("business_id", businessId);

    setSavingProfile(false);

    if (error) {
      setErrProfile(error.message);
      return;
    }

    const next: ProfileRow = {
      whatsapp: payload.whatsapp,
      email: payload.email,
      business_hours: payload.business_hours,
    };

    setProfile(next);
    profileLastSavedRef.current = stableStringify(next);
    profileHydratedRef.current = true;
  }, [businessId, profile]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;

      const isMac = navigator.platform.toLowerCase().includes("mac");

      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "s") {
        if (!saveBarVisible) return;

        e.preventDefault();
        void saveProfile();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saveBarVisible, saveProfile]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setErrKB(null);
      setErrProfile(null);
      setLoadingGate(true);

      try {
        const result = await getActiveBusinessIdClient();

        if (!alive) return;

        const user = result?.user ?? null;
        const activeBusinessId = result?.businessId ?? null;

        if (!user) {
          setErrKB(
            "No se pudo confirmar tu sesión desde Knowledge. Recarga la página o inicia sesión nuevamente."
          );
          setErrProfile(null);
          setLoadingGate(false);
          return;
        }

        if (!activeBusinessId) {
          setErrKB(
            "No se encontró un negocio activo para cargar Knowledge. Revisa el onboarding o la relación del usuario con el negocio."
          );
          setErrProfile(null);
          setLoadingGate(false);
          return;
        }

        setBusinessId(activeBusinessId);

        const { data: bizData, error: bizError } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", activeBusinessId)
          .maybeSingle();

        if (!alive) return;

        if (bizError) {
          throw new Error(bizError.message);
        }

        if (bizData?.name) {
          setBizName(String(bizData.name));
        }

        await Promise.all([
          loadKB(activeBusinessId),
          ensureWidgetSettingsRow(activeBusinessId),
        ]);
      } catch (error: unknown) {
        if (!alive) return;

        setErrKB(
          error instanceof Error ? error.message : "No se pudo cargar Knowledge.",
        );
        setErrProfile(null);
      } finally {
        if (alive) {
          setLoadingGate(false);
        }
      }
    }

    void boot();

    return () => {
      alive = false;
    };
  }, []);

  if (loadingGate) {
    return (
      <main className={`lmn-module-page lmn-knowledge-page ${styles.page}`}>
        <PanelSectionHeader
          eyebrow="Knowledge"
          title="Cargando base del negocio."
          description="Estamos preparando el cerebro comercial que alimentará las respuestas de LumenAI."
          status="Cargando"
          statusTone="muted"
        />
      </main>
    );
  }

  return (
    <SectionIntroGate
      title="Knowledge es la memoria comercial de LumenAI."
      description="Aquí cargas la información que el asistente necesita para responder bien: servicios, precios, políticas, pagos, contacto y reglas del negocio."
      bullets={[
        "Convierte conocimiento disperso en respuestas consistentes para clientes.",
        "Publica o deja en borrador cada pieza de información según su estado.",
        "Completa horarios, contacto y datos de pago para reducir derivaciones manuales.",
      ]}
      primaryActionLabel="Entrar al área"
      skipActionLabel="Omitir"
      storageKey="lumenai:intro:knowledge:v1"
    >
      <main className={`lmn-module-page lmn-knowledge-page ${styles.page} ${saveBarVisible ? styles.pageWithBar : ""}`}>
      <PanelSectionHeader
        variant="hero"
        eyebrow="Cerebro del negocio"
        title="Cerebro comercial"
        description="Enseña a LumenAI qué vende el negocio, cómo responde, qué precios maneja, qué políticas aplica y cuándo debe derivar a un humano."
        status={`${completion.percent}% completo`}
        statusTone={completion.percent >= 70 ? "active" : "warning"}
        secondary={
          <div className={styles.headerTools}>
            <StatusBadge tone="muted">{bizName}</StatusBadge>
            <ActionButton type="button" variant="primary" onClick={openCreate}>
              + Nuevo ítem
            </ActionButton>
          </div>
        }
      />

      {errKB || errProfile ? (
        <div className={styles.errorBox} role="alert">
          <div className={styles.errorText}>{errProfile || errKB}</div>
        </div>
      ) : null}

      <section className={styles.topGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Items totales</div>
          <div className={styles.metricValue}>{stats.total}</div>
          <div className={styles.metricText}>Contenido registrado en la base.</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Publicados</div>
          <div className={styles.metricValue}>{stats.published}</div>
          <div className={styles.metricText}>Disponible para alimentar respuestas.</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Borradores</div>
          <div className={styles.metricValue}>{stats.drafts}</div>
          <div className={styles.metricText}>Guardados pero no activos.</div>
        </div>

        <div className={`${styles.metricCard} ${styles.completionCard}`}>
          <div className={styles.metricLabel}>Completitud</div>
          <div className={styles.completionTop}>
            <div className={styles.metricValue}>{completion.percent}%</div>
            <div
              className={styles.completionOrb}
              style={{
                background: `conic-gradient(rgb(var(--lmn-accent-rgb, 0, 140, 255)) ${completion.percent * 3.6}deg, rgba(255,255,255,.075) 0deg)`,
              }}
            >
              <span>{completion.done}/{completion.total}</span>
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${completion.percent}%` }} />
          </div>
        </div>
      </section>

      <ModuleTabs
        items={TYPE_TABS}
        value={typeFilter}
        onChange={(next) => setTypeFilter(next as KBType | "all")}
      />

      <section className={styles.grid}>
        <div className={styles.left}>
          <FieldGroup
            title="Contenido del negocio"
            description="Filtra, edita y publica la información que LumenAI podrá usar para responder."
            action={
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => businessId && loadKB(businessId)}
                disabled={loadingKB}
              >
                {loadingKB ? "Actualizando…" : "Refrescar"}
              </ActionButton>
            }
          >
            <div className={styles.toolbar}>
              <input
                aria-label="Buscar en Knowledge"
                className={styles.input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título o contenido…"
              />

              <select
                aria-label="Filtrar Knowledge por estado"
                className={styles.select}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "published" | "draft",
                  )
                }
              >
                <option value="all">Todos los estados</option>
                <option value="published">Publicados</option>
                <option value="draft">Borradores</option>
              </select>
            </div>

            <div className={styles.list}>
              {loadingKB ? (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>Cargando items…</div>
                  <div className={styles.muted}>Estamos leyendo la base de conocimiento.</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>No hay items para mostrar</div>
                  <div className={styles.muted}>
                    Crea una FAQ, servicio, precio o política para que el asistente tenga información real.
                  </div>
                  <ActionButton
                    type="button"
                    variant="primary"
                    onClick={openCreate}
                    className={styles.emptyButton}
                  >
                    + Crear primer ítem
                  </ActionButton>
                </div>
              ) : (
                filtered.map((it) => (
                  <article key={it.id} className={styles.item}>
                    <div className={styles.itemTop}>
                      <div className={styles.badges}>
                        <StatusBadge tone="muted">{humanType(it.type)}</StatusBadge>
                        <StatusBadge tone={it.is_published ? "active" : "warning"}>
                          {it.is_published ? "Publicado" : "Borrador"}
                        </StatusBadge>
                      </div>

                      <div className={styles.itemActions}>
                        <button className={styles.small} onClick={() => togglePublish(it)}>
                          {it.is_published ? "Despublicar" : "Publicar"}
                        </button>
                        <button className={styles.small} onClick={() => openEdit(it)}>
                          Editar
                        </button>
                        <button className={styles.danger} onClick={() => remove(it)}>
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <h3 className={styles.itemTitle}>{it.title}</h3>
                    <p className={styles.itemContent}>{it.content}</p>
                  </article>
                ))
              )}
            </div>
          </FieldGroup>
        </div>

        <aside className={styles.right}>
          <PreviewShell
            title="Salud de Knowledge"
            description="Checklist mínimo para que LumenAI responda con precisión y no invente."
            status={`${completion.done}/${completion.total}`}
          >
            <div className={styles.checks}>
              <ChecklistItem
                label="Servicios publicados"
                description="Qué ofrece realmente el negocio."
                done={stats.services > 0}
                warning={stats.services === 0}
              />
              <ChecklistItem
                label="Precios o planes"
                description="Evita que el asistente invente valores."
                done={stats.pricing > 0}
                warning={stats.pricing === 0}
              />
              <ChecklistItem
                label="Preguntas frecuentes"
                description="Resuelve dudas repetidas de clientes."
                done={stats.faq > 0}
                warning={stats.faq === 0}
              />
              <ChecklistItem
                label="Políticas"
                description="Condiciones, garantías, cambios o reembolsos."
                done={stats.policy > 0}
                warning={stats.policy === 0}
              />
              <ChecklistItem
                label="Datos de pago"
                description="Transferencia, PayPal o cuenta bancaria."
                done={stats.payment > 0}
                warning={stats.payment === 0}
              />
              <ChecklistItem
                label="Canal de cierre"
                description="WhatsApp o email configurado."
                done={!!profile?.whatsapp || !!profile?.email}
                warning={!profile?.whatsapp && !profile?.email}
              />
            </div>
          </PreviewShell>

          <PreviewShell
            title="Preview de contexto"
            description="Así se compacta parte de la información publicada para alimentar al asistente."
            status={publishedPreview.length ? "Activo" : "Vacío"}
          >
            <div className={styles.previewList}>
              {publishedPreview.length ? (
                publishedPreview.map((it) => (
                  <div key={it.id} className={styles.previewItem}>
                    <div className={styles.previewMeta}>{humanType(it.type)}</div>
                    <div className={styles.previewTitle}>{it.title}</div>
                    <div className={styles.previewText}>{it.content}</div>
                  </div>
                ))
              ) : (
                <div className={styles.muted}>Publica al menos un ítem para ver el contexto.</div>
              )}
            </div>
          </PreviewShell>

          <FieldGroup
            title="Datos de transferencia"
            description="Guarda datos de pago para que LumenAI pueda responder cuando un cliente quiera pagar."
          >
            <div className="grid gap-3">
              <PaymentShortcut
                icon={<WalletCards className="h-4 w-4" />}
                title="PayPal"
                text="Email de PayPal, titular e instruccion para enviar comprobante."
                done={stats.payment > 0}
                onClick={() => openPaymentTemplate("paypal")}
              />
              <PaymentShortcut
                icon={<Landmark className="h-4 w-4" />}
                title="Cuenta bancaria"
                text="Banco, tipo de cuenta, numero, titular y correo de comprobante."
                done={stats.payment > 0}
                onClick={() => openPaymentTemplate("bank")}
              />
              <PaymentShortcut
                icon={<CreditCard className="h-4 w-4" />}
                title="Cuenta RUT"
                text="Plantilla rapida para negocios que cobran por Cuenta RUT."
                done={stats.payment > 0}
                onClick={() => openPaymentTemplate("rut")}
              />
            </div>
          </FieldGroup>

          <FieldGroup
            title="Canales de cierre"
            description="WhatsApp y/o email para convertir conversaciones en oportunidades."
          >
            <div className={styles.row2}>
              <label className={styles.field}>
                <div className={styles.label}>WhatsApp</div>
                <div className={styles.hint}>Ej: +56 9 1234 5678</div>
                <input
                  className={styles.input}
                  value={profile?.whatsapp ?? ""}
                  onChange={(e) => profile && setProfile({ ...profile, whatsapp: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  disabled={!profile || savingProfile}
                />
              </label>

              <label className={styles.field}>
                <div className={styles.label}>Email</div>
                <div className={styles.hint}>Ej: contacto@tuempresa.cl</div>
                <input
                  className={styles.input}
                  value={profile?.email ?? ""}
                  onChange={(e) => profile && setProfile({ ...profile, email: e.target.value })}
                  placeholder="contacto@tuempresa.cl"
                  disabled={!profile || savingProfile}
                />
              </label>
            </div>
          </FieldGroup>

          {profile ? (
            <BusinessHoursConsole
              hours={profile.business_hours}
              saving={savingProfile}
              onChange={updateHours}
              onClosedDateChange={updateClosedDate}
            />
          ) : (
            <FieldGroup
              title="Horario de atención"
              description="El asistente usa estos horarios para responder mejor sobre disponibilidad."
            >
              <div className={styles.muted}>Cargando horario…</div>
            </FieldGroup>
          )}
        </aside>
      </section>

      <SaveBar
        visible={saveBarVisible}
        title={
          savingProfile
            ? "Guardando…"
            : errProfile
            ? "No se pudo guardar"
            : profileDirty
            ? "Cambios sin guardar"
            : "Listo"
        }
        description={savingProfile ? "No cierres esta pestaña." : "Ctrl/Cmd + S para guardar contacto y horarios."}
        status={errProfile ? "Error" : profileDirty ? "Pendiente" : "Listo"}
        saving={savingProfile}
        primaryLabel="Guardar"
        secondaryLabel="Ocultar error"
        onPrimary={() => void saveProfile()}
        onSecondary={errProfile ? () => setErrProfile(null) : undefined}
        primaryDisabled={!profile || savingProfile || !profileDirty}
        secondaryDisabled={!errProfile || savingProfile}
      />

      {open ? (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={closeModal}>
          <div
            ref={knowledgeDialogRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-dialog-title"
            aria-describedby="knowledge-dialog-description"
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle} id="knowledge-dialog-title">
                  {mode === "create" ? "Nuevo ítem de Knowledge" : "Editar ítem de Knowledge"}
                </h2>
                <div className={styles.mutedSmall} id="knowledge-dialog-description">
                  Solo los ítems publicados alimentan directamente al asistente.
                </div>
              </div>

              <button type="button" className={styles.close} onClick={closeModal} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.labelWrap}>
                Tipo
                <select
                  className={styles.select}
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as KBType)}
                  disabled={savingKB}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className={styles.labelWrap}>
                <legend>Estado</legend>
                <div className={styles.toggleRow} role="radiogroup" aria-label="Estado de publicación">
                  <button
                    className={formPublished ? styles.toggleOn : styles.toggleOff}
                    onClick={() => !savingKB && setFormPublished(true)}
                    type="button"
                    role="radio"
                    aria-checked={formPublished}
                  >
                    Publicado
                  </button>
                  <button
                    className={!formPublished ? styles.toggleOn : styles.toggleOff}
                    onClick={() => !savingKB && setFormPublished(false)}
                    type="button"
                    role="radio"
                    aria-checked={!formPublished}
                  >
                    Borrador
                  </button>
                </div>
              </fieldset>

              <label className={styles.labelWrap} style={{ gridColumn: "1 / -1" }}>
                Título
                <input
                  className={styles.input}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Servicios disponibles, precios, garantías, reembolsos…"
                  disabled={savingKB}
                />
              </label>

              <label className={styles.labelWrap} style={{ gridColumn: "1 / -1" }}>
                Contenido
                <textarea
                  className={styles.textarea}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Escribe la información completa que LumenAI debe conocer. Mientras más claro sea este contenido, mejores serán las respuestas."
                  rows={8}
                  disabled={savingKB}
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.ghost} onClick={closeModal} disabled={savingKB}>
                Cancelar
              </button>

              <button type="button" className={styles.primary} onClick={saveKB} disabled={savingKB}>
                {savingKB ? "Guardando…" : "Guardar ítem"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </main>
    </SectionIntroGate>
  );
}
