"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Database,
  Layers3,
  Loader2,
  RefreshCw,
  Rocket,
  CalendarClock,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  ImagePlus,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { ActionButton } from "../_components/ui/ActionButton";
import { GlassCard } from "../_components/ui/GlassCard";
import { StatusBadge } from "../_components/ui/StatusBadge";
import { ConfigAiCommandCenter } from "@/components/ui/config-ai-command-center";

type Role = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type Proposal = {
  title: string;
  summary: string;
  confidence: number;
  actions: string[];
  blocked: string[];
  knowledgeItems: Array<{ title: string; type: string; content: string }>;
  automationRules: Array<{ key: string; name: string }>;
};

type AiStatus = {
  provider: string;
  configured: boolean;
  dedicatedKey: boolean;
  usingFallbackKey: boolean;
  env: string;
  model: string;
};

type Snapshot = {
  business?: { name?: string };
  checks?: Record<string, boolean>;
  stats?: Record<string, number>;
  currentCalibration?: {
    identity?: {
      assistantName?: string;
      brandName?: string;
    };
  };
};

type LastSnapshot = {
  id: string;
  actionType?: string | null;
  userPrompt?: string | null;
  createdAt?: string | null;
};

type ApiData = {
  ok?: boolean;
  error?: string;
  mode?: "chat" | "proposal" | "executed";
  assistantMessage?: string;
  ai?: AiStatus;
  snapshot?: Snapshot;
  lastSnapshot?: LastSnapshot | null;
  examples?: string[];
  proposal?: Proposal;
  applied?: boolean;
  appliedAt?: string;
  rollback?: {
    restored: boolean;
    message: string;
    snapshotId: string | null;
  };
};

const starterPrompts = [
  "Agrega el producto Snide Nocta, disponible en todos los colores, precio 70 USD.",
  "Configura LumenAI para vender con un tono elegante, claro y consultivo.",
  "Cambia el color del panel y widget a #0A84FF y #7C3AED.",
  "Optimiza el widget para captar leads y derivar a humano cuando corresponda.",
  "Crea una regla para capturar solicitudes de reunion y pedir datos de contacto.",
];

const systemLayers = [
  {
    icon: ShoppingBag,
    title: "Productos",
    text: "Crea, actualiza o elimina productos, precios y disponibilidad.",
    prompt:
      "Agrega un producto llamado Snide Nocta, disponible en todos los colores, precio 70 USD.",
  },
  {
    icon: WandSparkles,
    title: "Interpretacion",
    text: "Entiende lo que pide el suscriptor y lo transforma en cambios.",
    prompt:
      "Interpreta mi negocio y configura LumenAI para que el panel quede claro, profesional y listo para operar.",
  },
  {
    icon: Layers3,
    title: "Calibracion",
    text: "Ajusta voz, ventas, personalidad, reglas y guardrails.",
    prompt:
      "Revisa y mejora toda la calibracion: identidad, tono, ventas, reglas, guardrails y lexicon.",
  },
  {
    icon: Database,
    title: "Base IA",
    text: "Detecta vacios de Knowledge, precios, servicios y politicas.",
    prompt:
      "Audita Knowledge y dime que falta para que LumenAI responda con precision comercial.",
  },
  {
    icon: ShieldCheck,
    title: "Operacion",
    text: "Prioriza widget, leads, seguimiento y riesgo de respuestas.",
    prompt:
      "Deja listo el sistema operativo: widget, seguimiento de leads, automatizaciones y seguridad.",
  },
  {
    icon: CalendarClock,
    title: "Agenda",
    text: "Prepara reglas para reuniones, citas y derivacion humana.",
    prompt:
      "Crea una regla para cuando un cliente pida reunion: capturar nombre, contacto, motivo y fecha ideal.",
  },
  {
    icon: ImagePlus,
    title: "Perfil visual",
    text: "Conecta avatar, logo, contacto y presencia del widget.",
    prompt:
      "Revisa el perfil visual del widget y dime que falta para que tenga avatar, logo y contacto profesional.",
  },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readiness(snapshot?: Snapshot | null) {
  const checks = snapshot?.checks ?? {};
  const values = Object.values(checks);
  if (!values.length) return 0;
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export default function AutoConfigClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lastSnapshotInfo, setLastSnapshotInfo] = useState<LastSnapshot | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [input, setInput] = useState("");
  const [lastRequest, setLastRequest] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "hello",
      role: "assistant",
      content:
        "Estoy listo. Dime como quieres que se configure LumenAI y preparo una propuesta aplicable al panel.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bootPromptRef = useRef(false);
  const score = readiness(snapshot);
  const showLegacyProposal = false;

  const assistantName =
    snapshot?.currentCalibration?.identity?.assistantName || "LumenAI";
  const businessName =
    snapshot?.currentCalibration?.identity?.brandName ||
    snapshot?.business?.name ||
    "Tu negocio";

  const checkItems = useMemo(() => {
    const checks = snapshot?.checks ?? {};
    return [
      ["Calibracion", checks.calibration],
      ["Widget", checks.widget],
      ["Knowledge", checks.knowledge],
      ["Servicios", checks.services],
      ["Precios", checks.pricing],
      ["Automatizaciones", checks.automations],
    ];
  }, [snapshot?.checks]);

  async function loadSnapshot() {
    try {
      const res = await fetch("/api/panel/autoconfig", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as ApiData | null;
      if (!res.ok || json?.ok === false) {
        setError(json?.error || "No se pudo cargar Config AI.");
        return;
      }
      setAiStatus(json?.ai ?? null);
      setSnapshot(json?.snapshot ?? null);
      setLastSnapshotInfo(json?.lastSnapshot ?? null);
      setMessages((items) =>
        items.length === 1 && items[0]?.id === "hello"
          ? [
              {
                ...items[0],
                content: json?.ai?.configured
                  ? "LumenAI esta conectado y leyendo este panel. Pideme un cambio concreto y puedo aplicarlo en calibracion, widget, Knowledge, productos, contacto o automatizaciones."
                  : "LumenAI esta en modo seguro. Puedo revisar el panel y preparar propuestas, pero falta conectar el motor operativo externo.",
              },
            ]
          : items
      );
      setError(null);
    } catch {
      setError("No se pudo conectar con Config AI.");
    }
  }

  async function submit(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;

    setBusy(true);
    setError(null);
    setProposal(null);
    setLastRequest(message);
    setInput("");
    const pendingId = uid();
    setMessages((items) => [
      ...items,
      { id: uid(), role: "user", content: message },
      {
        id: pendingId,
        role: "assistant",
        content: aiStatus?.configured
          ? "LumenAI esta leyendo el panel antes de responder."
          : "Estoy leyendo el panel en modo seguro antes de responder.",
      },
    ]);

    try {
      const res = await fetch("/api/panel/autoconfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      const json = (await res.json().catch(() => null)) as ApiData | null;

      if (!res.ok || json?.ok === false || !json) {
        throw new Error(json?.error || "No se pudo generar respuesta.");
      }

      setAiStatus(json.ai ?? aiStatus);

      if (json.mode === "chat" || json.mode === "executed" || json.assistantMessage) {
        setProposal(null);
        if (json.mode === "executed") {
          void loadSnapshot();
        }
        setMessages((items) =>
          items.map((item) =>
            item.id === pendingId
              ? {
                  ...item,
                  content:
                    json.assistantMessage ||
                    "LumenAI esta conectado. Dame una instruccion concreta para configurar el panel.",
                }
              : item
          )
        );
        return;
      }

      if (!json.proposal) {
        throw new Error(json.error || "No se pudo generar propuesta.");
      }

      const nextProposal = json.proposal;
      setProposal(nextProposal);
      setMessages((items) =>
        items.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                content: `${nextProposal.title}\n\n${nextProposal.summary}`,
              }
            : item
        )
      );
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Error generando respuesta.";
      setError(messageText);
      setMessages((items) =>
        items.map((item) =>
          item.id === pendingId ? { ...item, content: messageText } : item
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function applyProposal() {
    if (!lastRequest || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/panel/autoconfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: lastRequest, apply: true }),
      });
      const json = (await res.json().catch(() => null)) as ApiData | null;

      if (!res.ok || json?.ok === false || !json) {
        throw new Error(json?.error || "No se pudo aplicar.");
      }

      setAiStatus(json.ai ?? aiStatus);
      setMessages((items) => [
        ...items,
        {
          id: uid(),
          role: "assistant",
          content:
            "Aplicado al borrador de calibracion. Puedes revisar o publicar para que el widget use esta version.",
        },
      ]);
      await loadSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error aplicando propuesta.");
    } finally {
      setBusy(false);
    }
  }

  async function publishCalibration() {
    setPublishing(true);
    setError(null);

    try {
      const res = await fetch("/api/panel/calibration/publish", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as ApiData | null;

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "No se pudo publicar calibracion.");
      }

      setMessages((items) => [
        ...items,
        {
          id: uid(),
          role: "assistant",
          content:
            "Calibracion publicada. El widget ya puede usar la configuracion actualizada.",
        },
      ]);
      await loadSnapshot();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error publicando calibracion."
      );
    } finally {
      setPublishing(false);
    }
  }

  async function rollbackLastConfig() {
    if (rollingBack || busy) return;

    setRollingBack(true);
    setError(null);

    try {
      const res = await fetch("/api/panel/autoconfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rollback: true }),
      });
      const json = (await res.json().catch(() => null)) as ApiData | null;

      if (!res.ok || json?.ok === false || !json) {
        throw new Error(json?.error || "No se pudo revertir la configuracion.");
      }

      setMessages((items) => [
        ...items,
        {
          id: uid(),
          role: "assistant",
          content:
            json.assistantMessage ||
            "Reversion ejecutada. Revisa el borrador y publica si quieres llevarla al widget.",
        },
      ]);
      await loadSnapshot();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo revertir la configuracion."
      );
    } finally {
      setRollingBack(false);
    }
  }

  useEffect(() => {
    void loadSnapshot();

    if (bootPromptRef.current) return;
    bootPromptRef.current = true;

    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (!prompt?.trim()) return;

    window.history.replaceState(null, "", "/panel/autoconfig");
    window.setTimeout(() => {
      void submit(prompt);
    }, 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  return (
    <div className="lmn-module-page lmn-autoconfig-page flex flex-col gap-5">
      {error ? (
        <div className="lmn-autoconfig-error" role="alert">{error}</div>
      ) : null}

      <ConfigAiCommandCenter
        score={score}
        aiConfigured={Boolean(aiStatus?.configured)}
        businessName={businessName}
        assistantName={assistantName}
        proposal={proposal}
        value={input}
        suggestions={starterPrompts}
        busy={busy}
        publishing={publishing}
        onChange={setInput}
        onSubmit={(message) => void submit(message)}
        onApply={() => void applyProposal()}
        onPublish={() => void publishCalibration()}
      />

      <section className="lmn-autoconfig-primary-grid grid items-start gap-4">
        <div className="lmn-config-room-header">
          <div className="min-w-0">
            <div className="lmn-config-room-kicker">
              <WandSparkles className="h-3.5 w-3.5" />
              LumenAI configuration layer
            </div>
            <h1>Config AI</h1>
            <p>
              Configura, calibra y prepara LumenAI hablando con el asistente del panel.
            </p>
          </div>

          <div className="lmn-config-room-actions">
            <StatusBadge tone={aiStatus?.configured ? "active" : "warning"}>
              {aiStatus?.configured ? "IA conectada" : "Modo seguro"}
            </StatusBadge>
            <StatusBadge tone={score >= 75 ? "active" : "warning"}>
              {score}% listo
            </StatusBadge>
            <ActionButton onClick={() => void loadSnapshot()} variant="secondary">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </ActionButton>
            <ActionButton
              onClick={() => void rollbackLastConfig()}
              variant="secondary"
              disabled={!lastSnapshotInfo || rollingBack}
            >
              {rollingBack ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Revertir
            </ActionButton>
          </div>
        </div>

        <section className="lmn-autoconfig-chat lmn-config-gradient-card p-4 md:p-5">
          <div className="lmn-config-console-head flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lmn-autoconfig-avatar">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-white">
                  {assistantName} Configurator
                </h2>
                <p className="truncate text-xs font-semibold text-white/42">
                  {businessName}
                </p>
              </div>
            </div>
            <StatusBadge tone="active">Seguro</StatusBadge>
          </div>

          <div className="lmn-ai-connection-strip">
            <span>Motor: LumenAI</span>
            <span>
              {aiStatus?.configured
                ? "Configuracion operativa activa"
                : "Modo seguro"}
            </span>
            {aiStatus?.usingFallbackKey ? <span>Conexion compartida</span> : null}
          </div>

          <div className="lmn-config-console">
            <div ref={scrollRef} className="lmn-autoconfig-thread">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "lmn-chat-bubble is-user"
                      : "lmn-chat-bubble is-assistant"
                  }
                >
                  <div className="whitespace-pre-line text-sm leading-6">
                    {message.content}
                  </div>
                </article>
              ))}
            </div>

            <div className="lmn-config-prompt-stage">
              <div className="lmn-config-command-note">
                Usa el composer principal de arriba para generar un blueprint. Este bloque queda como historial operativo de Config AI.
              </div>
            </div>
          </div>
        </section>

        <div className="lmn-config-side-rail grid gap-3 lg:grid-cols-2">
          <GlassCard variant="soft" className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  Estado operativo
                </div>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
                  {score}%
                </h3>
              </div>
              <Sparkles className="h-5 w-5 text-white/42" />
            </div>

            <div className="mt-4 grid gap-2">
              {checkItems.map(([label, ok]) => (
                <div key={String(label)} className="lmn-autoconfig-check">
                  <span>{label}</span>
                  <CheckCircle2
                    className={ok ? "h-4 w-4 text-cyan-200" : "h-4 w-4 text-white/22"}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[14px] border border-white/[0.07] bg-white/[0.018] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                Ultimo snapshot
              </div>
              <p className="mt-2 text-xs leading-5 text-white/48">
                {lastSnapshotInfo?.createdAt
                  ? `${lastSnapshotInfo.actionType || "configuracion"} guardada. Puedes revertir el borrador si el cambio no encaja.`
                  : "Aun no hay snapshots. Se crearan cuando Config AI aplique cambios."}
              </p>
            </div>
          </GlassCard>

          <GlassCard variant="soft" className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              <Layers3 className="h-3.5 w-3.5" />
              Modelo editable
            </div>

            <div className="grid gap-2">
              {systemLayers.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    className="lmn-system-layer-button"
                    type="button"
                    disabled={busy}
                    onClick={() => void submit(item.prompt)}
                  >
                    <span className="lmn-system-layer-button-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-xs font-black text-white">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-white/44">
                        {item.text}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </section>

      {showLegacyProposal && proposal ? (
        <GlassCard variant="base" accent className="p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                <WandSparkles className="h-3.5 w-3.5" />
                Propuesta lista
              </div>
              <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
                {proposal.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/54">
                {proposal.summary}
              </p>

              <div className="mt-4 grid gap-2">
                {proposal.actions.map((action) => (
                  <div key={action} className="lmn-proposal-row">
                    <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                    <span>{action}</span>
                  </div>
                ))}
                {proposal.blocked.map((item) => (
                  <div key={item} className="lmn-proposal-row is-blocked">
                    <ShieldCheck className="h-4 w-4 text-amber-200" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lmn-proposal-side">
              <div>
                <span>Confianza</span>
                <strong>{proposal.confidence}%</strong>
              </div>
              <div>
                <span>Knowledge sugerido</span>
                <strong>{proposal.knowledgeItems.length}</strong>
              </div>
              <div>
                <span>Automatizaciones</span>
                <strong>{proposal.automationRules.length}</strong>
              </div>

              <ActionButton
                onClick={() => void applyProposal()}
                disabled={busy}
                variant="primary"
                className="mt-2 w-full"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                Aplicar al borrador
              </ActionButton>
              <ActionButton
                onClick={() => void publishCalibration()}
                disabled={publishing}
                variant="secondary"
                className="w-full"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Publicar calibracion
              </ActionButton>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
