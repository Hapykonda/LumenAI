 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { usePanel } from "../../_components/panel-context";

type MsgRow = {
  id: string;
  chat_id?: string;
  business_id?: string;
  sender_type: string;
  content: string | null;
  created_at: string;
};

type ChatRow = {
  id: string;
  business_id: string;
  title: string | null;
  channel?: string | null;
  visitor_id?: string | null;
  unread_owner?: boolean | null;
  human_takeover?: boolean | null;
  human_takeover_at?: string | null;
  ai_paused_reason?: string | null;
  created_at?: string;
  updated_at?: string;
};

type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

type Lead = {
  id: string;
  business_id: string;
  chat_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  intent: string | null;
  summary: string | null;
  status: LeadStatus;
  score: number;
  metadata: any;
  created_at: string;
  updated_at: string;
};

type ApiGet = {
  ok?: boolean;
  chat?: ChatRow | null;
  messages?: MsgRow[];
  lead?: Lead | null;
  leads?: Lead[];
  error?: string;
  detail?: string;
};

type ApiPost = {
  ok?: boolean;
  message?: MsgRow;
  error?: string;
  detail?: string;
};

type ApiPatch = {
  ok?: boolean;
  chat?: ChatRow | null;
  error?: string;
  detail?: string;
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  won: "Ganado",
  lost: "Perdido",
};

const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

async function apiFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(path, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function statusColor(status: LeadStatus) {
  if (status === "won") return "rgba(0,220,140,.14)";
  if (status === "lost") return "rgba(255,255,255,.04)";
  if (status === "new") return "rgba(255,190,80,.12)";
  if (status === "qualified") return "rgba(0,140,255,.15)";
  return "rgba(255,255,255,.06)";
}

function waLink(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  return `https://wa.me/${digits}`;
}

function readLeadSignal(lead: Lead | null, key: string) {
  const meta =
    lead?.metadata && typeof lead.metadata === "object"
      ? (lead.metadata as Record<string, any>)
      : {};
  const last =
    meta.lastDetection && typeof meta.lastDetection === "object"
      ? (meta.lastDetection as Record<string, any>)
      : {};
  const signals =
    meta.signals && typeof meta.signals === "object"
      ? (meta.signals as Record<string, any>)
      : last.signals && typeof last.signals === "object"
      ? (last.signals as Record<string, any>)
      : {};

  return meta[key] ?? last[key] ?? signals[key] ?? null;
}

function buildSmartReplies(input: {
  lead: Lead | null;
  messages: MsgRow[];
  aiPaused: boolean;
}) {
  const { lead, messages, aiPaused } = input;
  const urgency = String(readLeadSignal(lead, "urgency") ?? "");
  const sentiment = String(readLeadSignal(lead, "sentiment") ?? "");
  const nextBestAction = String(readLeadSignal(lead, "nextBestAction") ?? "");
  const lastClient = [...messages]
    .reverse()
    .find((message) => String(message.sender_type || "").toLowerCase() === "user");
  const lastText = String(lastClient?.content ?? "").toLowerCase();

  const replies = new Set<string>();

  if (sentiment === "riesgo") {
    replies.add("Gracias por avisarnos. Voy a revisar esto con prioridad y ayudarte a resolverlo de la forma mas clara posible.");
  }

  if (urgency === "alta" || lastText.includes("urgente")) {
    replies.add("Entiendo que lo necesitas pronto. Dejame tu nombre y telefono para coordinar el siguiente paso ahora.");
  }

  if (lastText.includes("precio") || lastText.includes("cuanto") || lastText.includes("valor")) {
    replies.add("Te comparto el valor y lo que incluye para que puedas decidir con claridad. Si quieres, tambien puedo ayudarte a elegir la mejor opcion.");
  }

  if (lastText.includes("horario") || lastText.includes("disponible")) {
    replies.add("Te confirmo los horarios disponibles y, si estas fuera de horario, puedo dejar tus datos para seguimiento.");
  }

  if (lead?.phone || lead?.email) {
    replies.add("Ya tengo tu contacto. El siguiente paso es confirmar disponibilidad y dejar una propuesta clara para cerrar.");
  } else {
    replies.add("Para ayudarte mejor, dejame tu nombre y un medio de contacto. Asi podemos dar seguimiento sin perder la conversacion.");
  }

  if (nextBestAction) {
    replies.add(nextBestAction);
  }

  if (aiPaused) {
    replies.add("Tomo esta conversacion manualmente. LumenAI queda pausado mientras el equipo continua la atencion.");
  }

  return Array.from(replies).slice(0, 4);
}

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const chatId = useMemo(() => String(params?.id || ""), [params]);
  const { loading } = usePanel();

  const [chat, setChat] = useState<ChatRow | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [fetching, setFetching] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);

  const readOnceRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const aiPaused = Boolean(chat?.human_takeover);
  const smartReplies = useMemo(
    () => buildSmartReplies({ lead, messages: msgs, aiPaused }),
    [lead, msgs, aiPaused]
  );

  async function markRead() {
    if (!chatId || loading) return;

    try {
      const res = await apiFetch(
        `/api/panel/chats/${encodeURIComponent(chatId)}/read`,
        { method: "POST" }
      );

      if (res.ok) {
        window.dispatchEvent(new Event("lumen:unread-changed"));
      }
    } catch {
      // No bloqueamos la vista si falla marcar leído.
    }
  }

  async function load() {
    if (!chatId) return;

    setErr(null);
    setFetching(true);

    try {
      const res = await apiFetch(
        `/api/panel/chat/messages?chat_id=${encodeURIComponent(chatId)}`,
        { method: "GET" }
      );

      const json = (await res.json().catch(() => ({}))) as ApiGet;

      if (!res.ok || json.ok === false) {
        setErr(
          json.detail
            ? `${json.error || "Error"} — ${json.detail}`
            : json.error || "Error cargando mensajes."
        );
        setMsgs([]);
        setChat(null);
        setLead(null);
        setLeads([]);
        return;
      }

      setMsgs(Array.isArray(json.messages) ? json.messages : []);
      setChat(json.chat ?? null);
      setLeads(Array.isArray(json.leads) ? json.leads : []);
      setLead(json.lead ?? (Array.isArray(json.leads) ? json.leads[0] ?? null : null));

      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 30);
    } catch {
      setErr("No se pudo conectar con /api/panel/chat/messages");
      setMsgs([]);
      setChat(null);
      setLead(null);
      setLeads([]);
    } finally {
      setFetching(false);
    }
  }

  async function sendAsAssistant() {
    const content = text.trim();

    if (!content || sending || loading) return;

    setSending(true);
    setErr(null);

    try {
      const res = await apiFetch("/api/panel/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          content,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiPost;

      if (!res.ok || json.ok === false) {
        setErr(
          json.detail
            ? `${json.error || "Error"} — ${json.detail}`
            : json.error || "No se pudo enviar."
        );
        return;
      }

      setText("");
      await load();
    } catch {
      setErr("No se pudo conectar para enviar.");
    } finally {
      setSending(false);
    }
  }

  async function toggleAiPause(nextPaused: boolean) {
    if (!chatId || togglingAi) return;

    const previous = chat;

    setChat((prev) =>
      prev
        ? {
            ...prev,
            human_takeover: nextPaused,
            human_takeover_at: nextPaused ? new Date().toISOString() : null,
            ai_paused_reason: nextPaused ? "manual_toggle" : null,
          }
        : prev
    );

    setTogglingAi(true);
    setErr(null);

    try {
      const res = await apiFetch("/api/panel/chat/messages", {
        method: "PATCH",
        body: JSON.stringify({
          chat_id: chatId,
          human_takeover: nextPaused,
          reason: nextPaused ? "manual_toggle" : null,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiPatch;

      if (!res.ok || json.ok === false) {
        setChat(previous);
        setErr(
          json.detail
            ? `${json.error || "Error"} — ${json.detail}`
            : json.error || "No se pudo cambiar el estado de la IA."
        );
        return;
      }

      if (json.chat) {
        setChat(json.chat);
      }

      window.dispatchEvent(new Event("lumen:unread-changed"));
    } catch {
      setChat(previous);
      setErr("No se pudo conectar para cambiar el estado de la IA.");
    } finally {
      setTogglingAi(false);
    }
  }

  async function updateLeadStatus(nextStatus: LeadStatus) {
    if (!lead?.id || updatingLead) return;

    const previous = lead;

    setLead({
      ...lead,
      status: nextStatus,
    });

    setUpdatingLead(true);
    setErr(null);

    try {
      const res = await apiFetch("/api/panel/leads", {
        method: "PATCH",
        body: JSON.stringify({
          id: lead.id,
          status: nextStatus,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.ok === false) {
        setLead(previous);
        setErr(json.error || "No se pudo actualizar el estado del lead.");
      } else if (json.lead) {
        setLead(json.lead);
      }
    } catch {
      setLead(previous);
      setErr("No se pudo conectar con /api/panel/leads.");
    } finally {
      setUpdatingLead(false);
    }
  }

  useEffect(() => {
    if (!loading) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, chatId]);

  useEffect(() => {
    if (loading || !chatId) return;

    readOnceRef.current = false;
  }, [loading, chatId]);

  useEffect(() => {
    if (loading || !chatId) return;
    if (readOnceRef.current) return;

    readOnceRef.current = true;
    void markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, chatId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          padding: 16,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(600px 220px at 0% 0%, rgba(var(--lmn-accent-rgb,0,140,255),.10), transparent 60%), rgba(255,255,255,0.025)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Link
            href="/panel/chat"
            style={{
              textDecoration: "none",
              color: "rgba(255,255,255,0.74)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            ← Volver a conversaciones
          </Link>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                letterSpacing: "-.055em",
                color: "white",
              }}
            >
              Conversación
            </h1>

            {chat?.channel ? (
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.035)",
                  padding: "5px 9px",
                  fontSize: 12,
                  color: "rgba(255,255,255,.64)",
                }}
              >
                {chat.channel}
              </span>
            ) : null}

            {chat?.unread_owner ? (
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(0,140,255,.24)",
                  background: "rgba(0,140,255,.12)",
                  padding: "5px 9px",
                  fontSize: 12,
                  color: "white",
                }}
              >
                Nuevo
              </span>
            ) : null}

            {aiPaused ? (
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,190,80,.24)",
                  background: "rgba(255,190,80,.12)",
                  padding: "5px 9px",
                  fontSize: 12,
                  color: "white",
                }}
              >
                IA pausada
              </span>
            ) : (
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(0,220,140,.20)",
                  background: "rgba(0,220,140,.10)",
                  padding: "5px 9px",
                  fontSize: 12,
                  color: "white",
                }}
              >
                IA activa
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(255,255,255,.46)",
            }}
          >
            {chatId.slice(0, 12)}… · Última actividad: {formatDate(chat?.updated_at)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => void toggleAiPause(!aiPaused)}
            disabled={loading || togglingAi}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: aiPaused
                ? "1px solid rgba(0,220,140,.22)"
                : "1px solid rgba(255,190,80,.22)",
              background: aiPaused
                ? "rgba(0,220,140,.10)"
                : "rgba(255,190,80,.10)",
              color: "white",
              fontWeight: 900,
              cursor: loading || togglingAi ? "not-allowed" : "pointer",
              opacity: loading || togglingAi ? 0.6 : 1,
            }}
          >
            {togglingAi
              ? "Cambiando…"
              : aiPaused
              ? "Reactivar IA"
              : "Pausar IA"}
          </button>

          <button
            onClick={() => void load()}
            disabled={loading || fetching}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.035)",
              color: "white",
              fontWeight: 900,
              cursor: loading || fetching ? "not-allowed" : "pointer",
              opacity: loading || fetching ? 0.6 : 1,
            }}
          >
            {fetching ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "rgba(255,70,70,0.12)",
            border: "1px solid rgba(255,70,70,0.25)",
          }}
        >
          <div style={{ color: "rgba(255,220,220,.96)", fontWeight: 900 }}>
            {err}
          </div>
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 360px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012))",
            minHeight: 560,
            display: "grid",
            gridTemplateRows: "1fr auto",
            gap: 12,
          }}
        >
          <div
            style={{
              overflow: "auto",
              display: "grid",
              gap: 10,
              paddingRight: 6,
              alignContent: "start",
              maxHeight: "calc(100vh - 360px)",
              minHeight: 380,
            }}
          >
            {loading ? (
              <div style={{ opacity: 0.75 }}>Cargando sesión…</div>
            ) : msgs.length === 0 ? (
              <div style={{ opacity: 0.75 }}>Aún no hay mensajes.</div>
            ) : (
              msgs.map((message) => {
                const isAssistant =
                  (message.sender_type || "").toLowerCase() === "assistant";

                return (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      justifyContent: isAssistant ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: 720,
                        padding: "11px 13px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.09)",
                        background: isAssistant
                          ? "linear-gradient(135deg, rgba(var(--lmn-accent-rgb,0,140,255),.22), rgba(var(--lmn-accent-2-rgb,108,59,255),.12))"
                          : "rgba(255,255,255,0.04)",
                        color: "white",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                        boxShadow: isAssistant
                          ? "0 14px 34px rgba(0,0,0,.16)"
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.68,
                          marginBottom: 6,
                          fontWeight: 800,
                        }}
                      >
                        {isAssistant ? "LumenAI / Equipo" : "Cliente"} ·{" "}
                        {formatDate(message.created_at)}
                      </div>

                      {message.content ?? ""}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {smartReplies.length ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {smartReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setText(reply)}
                    style={{
                      border: "1px solid rgba(255,255,255,.08)",
                      background: "rgba(255,255,255,.032)",
                      color: "rgba(255,255,255,.78)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 850,
                      cursor: "pointer",
                      maxWidth: 360,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={reply}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Responder manualmente como LumenAI / equipo…"
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
                lineHeight: 1.5,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendAsAssistant();
                }
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,.42)",
                }}
              >
                Al responder manualmente, la IA queda pausada para esta conversación.
              </div>

              <button
                onClick={() => void sendAsAssistant()}
                disabled={loading || sending || !text.trim()}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: text.trim()
                    ? "rgba(0,140,255,0.28)"
                    : "rgba(255,255,255,0.035)",
                  color: "white",
                  fontWeight: 950,
                  cursor:
                    loading || sending || !text.trim() ? "not-allowed" : "pointer",
                  minWidth: 140,
                  opacity: loading || sending || !text.trim() ? 0.58 : 1,
                }}
              >
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              borderRadius: 20,
              border: aiPaused
                ? "1px solid rgba(255,190,80,.16)"
                : "1px solid rgba(0,220,140,.13)",
              background: aiPaused
                ? "rgba(255,190,80,.055)"
                : "rgba(0,220,140,.045)",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".16em",
                color: "rgba(255,255,255,.36)",
                fontWeight: 900,
              }}
            >
              Control de atención
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 18,
                color: "white",
                fontWeight: 950,
                letterSpacing: "-.04em",
              }}
            >
              {aiPaused ? "Humano tomando el chat" : "IA atendiendo automáticamente"}
            </div>

            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(255,255,255,.54)",
              }}
            >
              {aiPaused
                ? "Mientras esté pausada, el cliente puede escribir y el sistema avisará que el equipo responderá por aquí."
                : "LumenAI seguirá respondiendo automáticamente usando Knowledge y la calibración del negocio."}
            </p>

            {chat?.human_takeover_at ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,.42)",
                }}
              >
                Pausada desde: {formatDate(chat.human_takeover_at)}
              </div>
            ) : null}

            <button
              onClick={() => void toggleAiPause(!aiPaused)}
              disabled={togglingAi}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "11px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.04)",
                color: "white",
                fontWeight: 900,
                cursor: togglingAi ? "not-allowed" : "pointer",
                opacity: togglingAi ? 0.6 : 1,
              }}
            >
              {togglingAi
                ? "Cambiando…"
                : aiPaused
                ? "Reactivar LumenAI"
                : "Pausar IA y tomar control"}
            </button>
          </div>

          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,.08)",
              background:
                "radial-gradient(420px 220px at 0% 0%, rgba(var(--lmn-accent-rgb,0,140,255),.09), transparent 60%), rgba(255,255,255,.025)",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".16em",
                color: "rgba(255,255,255,.36)",
                fontWeight: 900,
              }}
            >
              Lead relacionado
            </div>

            {!lead ? (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,.52)",
                }}
              >
                Todavía no hay un lead asociado a esta conversación. Cuando el
                widget detecte intención comercial, aparecerá aquí.
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 950,
                      letterSpacing: "-.045em",
                      color: "white",
                    }}
                  >
                    {lead.name || "Lead sin nombre"}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "5px 9px",
                        background: statusColor(lead.status),
                        border: "1px solid rgba(255,255,255,.08)",
                        fontSize: 12,
                        color: "white",
                      }}
                    >
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: "5px 9px",
                        background: "rgba(255,255,255,.045)",
                        border: "1px solid rgba(255,255,255,.08)",
                        fontSize: 12,
                        color: "rgba(255,255,255,.78)",
                      }}
                    >
                      Score {lead.score ?? 0}%
                    </span>
                  </div>
                </div>

                <select
                  value={lead.status}
                  disabled={updatingLead}
                  onChange={(e) =>
                    void updateLeadStatus(e.target.value as LeadStatus)
                  }
                  style={{
                    width: "100%",
                    borderRadius: 13,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(0,0,0,.25)",
                    color: "white",
                    padding: "11px 12px",
                    outline: "none",
                  }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    fontSize: 13,
                    color: "rgba(255,255,255,.58)",
                  }}
                >
                  {lead.phone ? (
                    <div>
                      WhatsApp:{" "}
                      {waLink(lead.phone) ? (
                        <a
                          href={waLink(lead.phone) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "white", textDecoration: "none" }}
                        >
                          {lead.phone} →
                        </a>
                      ) : (
                        <span>{lead.phone}</span>
                      )}
                    </div>
                  ) : null}

                  {lead.email ? <div>Email: {lead.email}</div> : null}

                  <div>Origen: {lead.source || "widget"}</div>
                  <div>Creado: {formatDate(lead.created_at)}</div>
                </div>

                {lead.intent ? (
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.06)",
                      background: "rgba(255,255,255,.025)",
                      padding: 12,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "rgba(255,255,255,.82)",
                      fontWeight: 800,
                    }}
                  >
                    {lead.intent}
                  </div>
                ) : null}

                {lead.summary ? (
                  <div
                    style={{
                      maxHeight: 240,
                      overflow: "auto",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.06)",
                      background: "rgba(0,0,0,.18)",
                      padding: 12,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "rgba(255,255,255,.54)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {lead.summary}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {leads.length > 1 ? (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.02)",
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: ".16em",
                  color: "rgba(255,255,255,.36)",
                  fontWeight: 900,
                }}
              >
                Otros leads del chat
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {leads.slice(1).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLead(item)}
                    style={{
                      textAlign: "left",
                      borderRadius: 13,
                      border: "1px solid rgba(255,255,255,.06)",
                      background: "rgba(255,255,255,.025)",
                      padding: 10,
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {item.name || item.phone || item.email || "Lead sin nombre"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "rgba(255,255,255,.46)",
                      }}
                    >
                      {STATUS_LABELS[item.status]} · Score {item.score ?? 0}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
