 "use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../_components/panel-context";
import { supabase } from "@/lib/supabase/client";
import { PanelSectionHeader } from "../_components/ui/PanelSectionHeader";
import { ActionButton } from "../_components/ui/ActionButton";

type InboxFilter = "all" | "unread" | "paused" | "leads" | "widget" | "panel";

type LeadPreview = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  score: number | null;
};

type ChatRow = {
  id: string;
  title: string | null;
  updated_at: string;
  created_at: string;
  channel?: "panel" | "widget" | string;
  unread_owner?: boolean;
  visitor_id?: string | null;
  human_takeover?: boolean | null;
  human_takeover_at?: string | null;
  ai_paused_reason?: string | null;

  last_message?: string | null;
  last_message_at?: string | null;
  last_sender_type?: string | null;

  lead_count?: number;
  lead?: LeadPreview | null;
  lead_status?: string | null;
  lead_score?: number | null;
  lead_name?: string | null;
  lead_phone?: string | null;
  lead_email?: string | null;
};

type ApiListResponse = {
  ok?: boolean;
  chats?: ChatRow[];
  stats?: {
    total?: number;
    unread?: number;
    human_takeover?: number;
    widget?: number;
    panel?: number;
    with_leads?: number;
  };
  error?: string;
  detail?: string;
};

type ApiCreateResponse = {
  ok?: boolean;
  id?: string;
  chat?: {
    id?: string;
  };
  error?: string;
  detail?: string;
};

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

function shortDate(value?: string | null) {
  if (!value) return "—";

  try {
    const d = new Date(value);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function humanLeadStatus(status?: string | null) {
  if (status === "new") return "Nuevo";
  if (status === "contacted") return "Contactado";
  if (status === "qualified") return "Calificado";
  if (status === "won") return "Ganado";
  if (status === "lost") return "Perdido";
  return status || "Lead";
}

function chatsSignature(chats: ChatRow[]) {
  return chats
    .map((chat) =>
      [
        chat.id,
        chat.updated_at,
        chat.last_message_at,
        chat.unread_owner ? 1 : 0,
        chat.human_takeover ? 1 : 0,
        chat.lead_count ?? 0,
        chat.lead_status ?? "",
        chat.lead_score ?? "",
      ].join(":")
    )
    .join("|");
}

export default function ChatPage() {
  const router = useRouter();
  const { loading } = usePanel();

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [serverStats, setServerStats] = useState<ApiListResponse["stats"] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");

  const [flashIds, setFlashIds] = useState<Record<string, number>>({});
  const flashTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const computedStats = useMemo(() => {
    return {
      total: chats.length,
      unread: chats.filter((chat) => chat.unread_owner).length,
      paused: chats.filter((chat) => chat.human_takeover).length,
      leads: chats.filter((chat) => Number(chat.lead_count || 0) > 0).length,
      widget: chats.filter((chat) => chat.channel === "widget").length,
      panel: chats.filter((chat) => chat.channel === "panel").length,
    };
  }, [chats]);

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();

    return chats.filter((chat) => {
      const okFilter =
        filter === "all"
          ? true
          : filter === "unread"
          ? Boolean(chat.unread_owner)
          : filter === "paused"
          ? Boolean(chat.human_takeover)
          : filter === "leads"
          ? Number(chat.lead_count || 0) > 0
          : filter === "widget"
          ? chat.channel === "widget"
          : filter === "panel"
          ? chat.channel === "panel"
          : true;

      const haystack = [
        chat.title,
        chat.last_message,
        chat.channel,
        chat.lead_name,
        chat.lead_phone,
        chat.lead_email,
        chat.lead_status,
        chat.visitor_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okQuery = !q || haystack.includes(q);

      return okFilter && okQuery;
    });
  }, [chats, filter, query]);

  function markFlash(id: string) {
    setFlashIds((prev) => ({
      ...prev,
      [id]: Date.now(),
    }));

    if (flashTimer.current[id]) {
      clearTimeout(flashTimer.current[id]);
    }

    flashTimer.current[id] = setTimeout(() => {
      setFlashIds((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 2200);
  }

  async function loadChats(opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? false;

    if (!silent) {
      setErr(null);
      setFetching(true);
    }

    try {
      const res = await apiFetch("/api/panel/chats", {
        method: "GET",
      });

      const json = (await res.json().catch(() => ({}))) as ApiListResponse;

      if (!res.ok || json.ok === false) {
        const detail = json.detail;

        setErr(
          detail
            ? `${json.error || "Error cargando chats."} — ${detail}`
            : json.error || "Error cargando chats."
        );

        setChats([]);
        setServerStats(null);
        return;
      }

      const next = Array.isArray(json.chats) ? json.chats : [];
      const nextStats = json.stats ?? null;

      setServerStats((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextStats) ? prev : nextStats
      );

      setChats((prev) => {
        if (chatsSignature(prev) === chatsSignature(next)) {
          return prev;
        }

        const prevMap = new Map(
          prev.map((chat) => [chat.id, Boolean(chat.unread_owner)])
        );

        for (const chat of next) {
          const wasUnread = prevMap.get(chat.id) ?? false;
          const nowUnread = Boolean(chat.unread_owner);

          if (!wasUnread && nowUnread) {
            markFlash(chat.id);
          }
        }

        return next;
      });
    } catch {
      if (!silent) {
        setErr("No se pudo conectar con /api/panel/chats");
      }

      setChats([]);
      setServerStats(null);
    } finally {
      if (!silent) {
        setFetching(false);
      }
    }
  }

  useEffect(() => {
    if (!loading) {
      void loadChats();
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    let visible = document.visibilityState !== "hidden";

    const interval = setInterval(() => {
      if (!visible) return;
      void loadChats({ silent: true });
    }, 30000);

    const handleVisibility = () => {
      visible = document.visibilityState !== "hidden";

      if (visible) {
        void loadChats({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const onChanged = () => {
      void loadChats({ silent: true });
    };

    window.addEventListener("lumen:unread-changed", onChanged);

    return () => {
      window.removeEventListener("lumen:unread-changed", onChanged);
    };
  }, [loading]);

  useEffect(() => {
    return () => {
      Object.values(flashTimer.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  async function createChat() {
    if (creating || loading) return;

    setErr(null);
    setCreating(true);

    try {
      const res = await apiFetch("/api/panel/chats", {
        method: "POST",
        body: JSON.stringify({
          title: "Nuevo chat",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ApiCreateResponse;
      const id = json.id || json.chat?.id;

      if (!res.ok || json.ok === false || !id) {
        const detail = json.detail;

        setErr(
          detail
            ? `${json.error || "No se pudo crear el chat."} — ${detail}`
            : json.error || "No se pudo crear el chat."
        );

        return;
      }

      await loadChats();
      router.push(`/panel/chat/${id}`);
    } catch {
      setErr("No se pudo conectar con /api/panel/chats");
    } finally {
      setCreating(false);
    }
  }

  const filters: { key: InboxFilter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: computedStats.total },
    { key: "unread", label: "No leídos", count: computedStats.unread },
    { key: "paused", label: "IA pausada", count: computedStats.paused },
    { key: "leads", label: "Con lead", count: computedStats.leads },
    { key: "widget", label: "Widget", count: computedStats.widget },
    { key: "panel", label: "Panel", count: computedStats.panel },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style jsx global>{`
        @keyframes lumenPulseDot {
          0% {
            transform: scale(1);
            filter: brightness(1);
          }

          50% {
            transform: scale(1.12);
            filter: brightness(1.2);
          }

          100% {
            transform: scale(1);
            filter: brightness(1);
          }
        }

        @keyframes lumenFlashCard {
          0% {
            box-shadow: 0 0 0 rgba(0, 140, 255, 0);
            transform: translateY(0);
          }

          40% {
            box-shadow: 0 0 44px rgba(0, 140, 255, 0.22);
            transform: translateY(-1px);
          }

          100% {
            box-shadow: 0 0 0 rgba(0, 140, 255, 0);
            transform: translateY(0);
          }
        }
      `}</style>

      <PanelSectionHeader
        title="Inbox comercial"
        description="Conversaciones del widget, leads, mensajes no leidos y chats tomados por humano."
        secondary={
          <>
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => void loadChats()}
              disabled={loading || fetching}
            >
              {fetching ? "Actualizando..." : "Actualizar"}
            </ActionButton>

            <ActionButton
              type="button"
              variant="primary"
              onClick={() => void createChat()}
              disabled={loading || creating}
            >
              {creating ? "Creando..." : "Crear chat"}
            </ActionButton>
          </>
        }
      />

      {err ? (
        <div
          style={{
            padding: 13,
            borderRadius: 15,
            background: "rgba(255,70,70,0.12)",
            border: "1px solid rgba(255,70,70,0.25)",
          }}
        >
          <div
            style={{
              color: "rgba(255,220,220,.96)",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        {[
          ["Total", serverStats?.total ?? computedStats.total, "Conversaciones registradas."],
          ["No leídos", serverStats?.unread ?? computedStats.unread, "Pendientes de revisar."],
          ["IA pausada", serverStats?.human_takeover ?? computedStats.paused, "Tomadas por humano."],
          ["Con lead", serverStats?.with_leads ?? computedStats.leads, "Oportunidades comerciales."],
        ].map(([label, value, description]) => (
          <div
            key={String(label)}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,.065)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.012))",
              padding: 15,
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: ".16em",
                color: "rgba(255,255,255,.36)",
                fontWeight: 900,
              }}
            >
              {label}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 36,
                lineHeight: 1,
                letterSpacing: "-.07em",
                color: "white",
                fontWeight: 950,
              }}
            >
              {value}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(255,255,255,.44)",
              }}
            >
              {description}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          padding: 16,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.075)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012))",
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, mensaje, teléfono, estado, canal…"
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.075)",
              background: "rgba(0,0,0,.22)",
              color: "white",
              padding: "12px 13px",
              outline: "none",
            }}
          />

          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,.48)",
              whiteSpace: "nowrap",
            }}
          >
            {filteredChats.length} resultado(s)
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {filters.map((item) => {
            const active = filter === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                style={{
                  borderRadius: 999,
                  border: active
                    ? "1px solid rgba(var(--lmn-accent-rgb,0,140,255),.30)"
                    : "1px solid rgba(255,255,255,.075)",
                  background: active
                    ? "rgba(var(--lmn-accent-rgb,0,140,255),.13)"
                    : "rgba(255,255,255,.025)",
                  color: "white",
                  padding: "8px 11px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {item.label} · {item.count}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {loading ? (
            <EmptyState title="Cargando sesión…" text="Estamos leyendo tus conversaciones." />
          ) : chats.length === 0 ? (
            <EmptyState
              title="Todavía no tienes chats"
              text="Cuando un cliente escriba desde el widget, aparecerá aquí. También puedes crear un chat manual."
            />
          ) : filteredChats.length === 0 ? (
            <EmptyState
              title="No hay resultados"
              text="Prueba cambiando el filtro o limpiando la búsqueda."
            />
          ) : (
            filteredChats.map((chat) => {
              const unread = Boolean(chat.unread_owner);
              const paused = Boolean(chat.human_takeover);
              const hasLead = Number(chat.lead_count || 0) > 0;
              const flash = Boolean(flashIds[chat.id]);

              return (
                <Link
                  key={chat.id}
                  href={`/panel/chat/${chat.id}`}
                  style={{
                    textDecoration: "none",
                    color: "white",
                    padding: 14,
                    borderRadius: 18,
                    border: unread
                      ? "1px solid rgba(var(--lmn-accent-rgb,0,140,255),0.30)"
                      : paused
                      ? "1px solid rgba(255,190,80,.18)"
                      : "1px solid rgba(255,255,255,0.075)",
                    background: unread
                      ? "radial-gradient(440px 180px at 0% 0%, rgba(var(--lmn-accent-rgb,0,140,255),.12), transparent 62%), rgba(255,255,255,0.025)"
                      : paused
                      ? "rgba(255,190,80,.045)"
                      : "rgba(255,255,255,0.018)",
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: 12,
                    alignItems: "center",
                    animation: flash ? "lumenFlashCard 1.1s ease" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      minWidth: 0,
                    }}
                  >
                    {unread ? (
                      <span
                        title="Nuevo mensaje"
                        style={{
                          marginTop: 7,
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "rgb(var(--lmn-accent-rgb,0,140,255))",
                          boxShadow: "0 0 18px rgba(var(--lmn-accent-rgb,0,140,255),0.65)",
                          animation: "lumenPulseDot 1.2s ease-in-out infinite",
                          flex: "0 0 10px",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          marginTop: 7,
                          width: 10,
                          height: 10,
                          flex: "0 0 10px",
                          opacity: 0.25,
                        }}
                      />
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 950,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            maxWidth: 420,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {chat.title ?? "Chat"}
                        </span>

                        {chat.channel ? (
                          <Badge>{chat.channel === "widget" ? "Widget" : "Panel"}</Badge>
                        ) : null}

                        {unread ? <Badge strong>Nuevo</Badge> : null}
                        {paused ? <Badge warn>IA pausada</Badge> : <Badge good>IA activa</Badge>}
                        {hasLead ? (
                          <Badge>
                            Lead · {humanLeadStatus(chat.lead_status)}{" "}
                            {chat.lead_score != null ? `· ${chat.lead_score}%` : ""}
                          </Badge>
                        ) : null}
                      </div>

                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: "rgba(255,255,255,.54)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {chat.last_sender_type === "assistant" ? "Equipo/LumenAI: " : "Cliente: "}
                        {chat.last_message || "Sin mensajes todavía."}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          fontSize: 12,
                          color: "rgba(255,255,255,.42)",
                        }}
                      >
                        <span>Actualizado: {formatDate(chat.updated_at || chat.created_at)}</span>

                        {chat.visitor_id ? (
                          <span>Visitante: {String(chat.visitor_id).slice(0, 12)}…</span>
                        ) : null}

                        {chat.human_takeover_at ? (
                          <span>Tomado: {shortDate(chat.human_takeover_at)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,.74)",
                      whiteSpace: "nowrap",
                      fontWeight: 900,
                    }}
                  >
                    Abrir →
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function Badge({
  children,
  strong,
  warn,
  good,
}: {
  children: React.ReactNode;
  strong?: boolean;
  warn?: boolean;
  good?: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 999,
        color: "white",
        border: strong
          ? "1px solid rgba(var(--lmn-accent-rgb,0,140,255),.30)"
          : warn
          ? "1px solid rgba(255,190,80,.22)"
          : good
          ? "1px solid rgba(0,220,140,.18)"
          : "1px solid rgba(255,255,255,0.10)",
        background: strong
          ? "rgba(var(--lmn-accent-rgb,0,140,255),.16)"
          : warn
          ? "rgba(255,190,80,.10)"
          : good
          ? "rgba(0,220,140,.08)"
          : "rgba(255,255,255,0.035)",
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        minHeight: 190,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.075)",
        background: "rgba(255,255,255,.018)",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: 950,
            letterSpacing: "-.05em",
          }}
        >
          {title}
        </div>

        <p
          style={{
            margin: "8px auto 0",
            maxWidth: 520,
            color: "rgba(255,255,255,.48)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
