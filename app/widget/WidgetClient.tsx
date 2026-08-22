"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Msg, WidgetConfig, WidgetTheme } from "./_lib/types";
import { postToParent } from "./_lib/postMessage";
import {
  clearStoredChat,
  getDraft,
  getOrCreateVisitorId,
  getStoredChatId,
  setDraft,
  storeChatId,
} from "./_lib/storage";
import {
  clamp,
  formatTime,
  hexToRgb,
  initials,
  isNearBottom,
  isProbablyMobile,
  normalizeWhatsAppLink,
  safeRandomId,
} from "./_lib/utils";
import MessageContent from "./_components/MessageContent";
import {
  CloseIcon,
  CopyIcon,
  ExpandIcon,
  MicIcon,
  MoreIcon,
  SendIcon,
  ShrinkIcon,
  StopIcon,
} from "./_components/icons";

function applyPlaceholders(text: string, vars: Record<string, string>) {
  let out = String(text ?? "");

  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v);
  }

  return out;
}

function buildGreetingFromCfgLike(cfgLike: WidgetConfig | null) {
  const raw =
    String(cfgLike?.greeting ?? "").trim() ||
    "Hola 👋 ¿En qué puedo ayudarte?";

  const biz = String(
    cfgLike?.businessName ?? cfgLike?.business_name ?? ""
  ).trim();

  const asst =
    String(
      cfgLike?.assistantName ?? cfgLike?.assistant_name ?? "LumenAI"
    ).trim() || "LumenAI";

  return applyPlaceholders(raw, {
    business: biz || "Tu negocio",
    assistant: asst || "LumenAI",
  });
}

function shouldClampAssistant(text: string) {
  const s = String(text ?? "");
  const lines = s.split("\n").length;

  return s.length >= 900 || lines >= 14;
}

type ServerWidgetMessage = {
  id: string;
  sender_type: string;
  content: string | null;
  created_at: string;
};

type WidgetMessagesResponse = {
  ok?: boolean;
  messages?: ServerWidgetMessage[];
  error?: string;
};

function buildGreetingMessage(cfgLike: WidgetConfig | null, publicKey: string): Msg {
  return {
    id: `welcome:${String(publicKey || "no_key")}`,
    role: "assistant",
    content: buildGreetingFromCfgLike(cfgLike),
    ts: Date.now(),
  };
}

function serverMsgToLocalMsg(message: ServerWidgetMessage): Msg {
  const role =
    String(message.sender_type || "").toLowerCase() === "user"
      ? "user"
      : "assistant";

  return {
    id: `server:${message.id}`,
    role,
    content: String(message.content ?? ""),
    ts: message.created_at ? new Date(message.created_at).getTime() : Date.now(),
  };
}

function serverMessagesSignature(messages: ServerWidgetMessage[]) {
  return messages
    .map(
      (m) =>
        `${m.id}:${m.sender_type}:${String(m.content ?? "").length}:${m.created_at}`
    )
    .join("|");
}

function downloadText(filename: string, content: string) {
  try {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    return true;
  } catch {
    return false;
  }
}

const COUNTRY_HINT_BY_REGION: Record<string, { countryCode: string; country: string }> = {
  AR: { countryCode: "AR", country: "Argentina" },
  BO: { countryCode: "BO", country: "Bolivia" },
  BR: { countryCode: "BR", country: "Brasil" },
  CA: { countryCode: "CA", country: "Canadá" },
  CL: { countryCode: "CL", country: "Chile" },
  CO: { countryCode: "CO", country: "Colombia" },
  CR: { countryCode: "CR", country: "Costa Rica" },
  DO: { countryCode: "DO", country: "República Dominicana" },
  EC: { countryCode: "EC", country: "Ecuador" },
  ES: { countryCode: "ES", country: "España" },
  FR: { countryCode: "FR", country: "Francia" },
  MX: { countryCode: "MX", country: "México" },
  PA: { countryCode: "PA", country: "Panamá" },
  PE: { countryCode: "PE", country: "Perú" },
  PY: { countryCode: "PY", country: "Paraguay" },
  US: { countryCode: "US", country: "Estados Unidos" },
  UY: { countryCode: "UY", country: "Uruguay" },
  VE: { countryCode: "VE", country: "Venezuela" },
};

const COUNTRY_HINT_BY_TIMEZONE: Array<{
  token: string;
  countryCode: string;
  country: string;
}> = [
  { token: "america/santiago", countryCode: "CL", country: "Chile" },
  { token: "america/buenos_aires", countryCode: "AR", country: "Argentina" },
  { token: "america/lima", countryCode: "PE", country: "Perú" },
  { token: "america/bogota", countryCode: "CO", country: "Colombia" },
  { token: "america/mexico_city", countryCode: "MX", country: "México" },
  { token: "america/montevideo", countryCode: "UY", country: "Uruguay" },
  { token: "america/caracas", countryCode: "VE", country: "Venezuela" },
  { token: "america/santo_domingo", countryCode: "DO", country: "República Dominicana" },
  { token: "europe/madrid", countryCode: "ES", country: "España" },
  { token: "europe/paris", countryCode: "FR", country: "Francia" },
  { token: "america/new_york", countryCode: "US", country: "Estados Unidos" },
  { token: "america/los_angeles", countryCode: "US", country: "Estados Unidos" },
  { token: "america/toronto", countryCode: "CA", country: "Canadá" },
];

function inferClientGeo(timezone: string, language: string | null) {
  const tz = String(timezone || "").toLowerCase();
  const lang = String(language || "");
  const region = lang.includes("-") ? lang.split("-").pop()?.toUpperCase() : "";

  if (region && COUNTRY_HINT_BY_REGION[region]) {
    return COUNTRY_HINT_BY_REGION[region];
  }

  return COUNTRY_HINT_BY_TIMEZONE.find((item) => tz.includes(item.token)) ?? null;
}

export default function WidgetClient({ publicKey }: { publicKey: string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hostedEmbed, setHostedEmbed] = useState(false);

  const visitorIdRef = useRef<string>("");
  const [chatId, setChatId] = useState<string | null>(null);

  const [cfg, setCfg] = useState<WidgetConfig | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState("");

  const [showJump, setShowJump] = useState(false);
  const [unread, setUnread] = useState(0);

  const [expandedMsgIds, setExpandedMsgIds] = useState<Record<string, boolean>>(
    {}
  );

  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const configAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const messagesAbortRef = useRef<AbortController | null>(null);
  const syncSignatureRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setHostedEmbed(window.parent !== window && params.get("embed") === "1");
    } catch {
      setHostedEmbed(false);
    }
  }, []);

  const prevLenRef = useRef(0);

  useEffect(() => {
    if (!publicKey) return;

    visitorIdRef.current = getOrCreateVisitorId(publicKey);
    setChatId(getStoredChatId(publicKey));
    setInput((prev) => (prev ? prev : getDraft(publicKey)));
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;

    setDraft(publicKey, input);
  }, [publicKey, input]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.('[data-menu="wrap"]')) return;

      setMenuOpen(false);
    }

    if (!menuOpen) return;

    window.addEventListener("mousedown", onDown);

    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "Escape") {
        setMenuOpen(false);
        setExpanded(false);
        setOpen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        taRef.current?.focus();
        setToast("Listo ✅");
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setMenuOpen((v) => !v);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: unknown; open?: unknown } | null;

      if (!d) return;

      if (d.type === "LUMENAI_WIDGET_TOGGLE") {
        setOpen(Boolean(d.open));

        if (!d.open) {
          setExpanded(false);
        }
      }
    }

    window.addEventListener("message", onMsg);

    return () => window.removeEventListener("message", onMsg);
  }, []);

  const theme: WidgetTheme = cfg?.theme ?? {};

  const primary =
    theme.primaryColor ?? cfg?.primary_color ?? "#00E5FF";

  const gFrom = theme.gradientFrom ?? primary;
  const gTo = theme.gradientTo ?? "#1B43FF";

  const fontFamily =
    theme.fontFamily ??
    `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, system-ui, Segoe UI, Roboto, Arial`;

  const assistantName =
    cfg?.assistantName ?? cfg?.assistant_name ?? "LumenAI";

  const businessName =
    cfg?.businessName ?? cfg?.business_name ?? null;
  const avatarUrl =
    String(
      cfg?.avatarUrl ??
        cfg?.avatar_url ??
        cfg?.brandLogoUrl ??
        cfg?.logo_url ??
        ""
    ).trim() || null;

  const widgetEnabled =
    (typeof cfg?.widgetEnabled === "boolean"
      ? cfg.widgetEnabled
      : undefined) ??
    (typeof cfg?.widget_enabled === "boolean"
      ? cfg.widget_enabled
      : undefined) ??
    true;

  const prgb = useMemo(() => hexToRgb(primary), [primary]);
  const gfrgb = useMemo(() => hexToRgb(gFrom), [gFrom]);
  const gtrgb = useMemo(() => hexToRgb(gTo), [gTo]);

  const radiusToken = Number(theme.radius ?? 18);
  const blurToken = Number(theme.blurStrength ?? 18);
  const surfaceOpacityToken = Number(theme.surfaceOpacity ?? 0.14);
  const glowStrengthToken = Number(theme.glowStrength ?? 0.55);

  const vars = useMemo(
    () =>
      ({
        "--lmn-accent": primary,
        "--lmn-accent-2": gTo,
        "--lmn-accent2": gTo,
        "--lmn-accent-rgb": `${prgb.r} ${prgb.g} ${prgb.b}`,
        "--lmn-gfrom-rgb": `${gfrgb.r} ${gfrgb.g} ${gfrgb.b}`,
        "--lmn-accent-2-rgb": `${gtrgb.r} ${gtrgb.g} ${gtrgb.b}`,
        "--lmn-accent2-rgb": `${gtrgb.r} ${gtrgb.g} ${gtrgb.b}`,
        "--lmn-font": fontFamily,
        "--lmn-radius": `${radiusToken}px`,
        "--lmn-blur": `${blurToken}px`,
        "--lmn-surface-opacity": String(surfaceOpacityToken),
        "--lmn-glow-strength": String(glowStrengthToken),
      }) as React.CSSProperties & Record<`--${string}`, string>,
    [
      primary,
      gTo,
      prgb,
      gfrgb,
      gtrgb,
      fontFamily,
      radiusToken,
      blurToken,
      surfaceOpacityToken,
      glowStrengthToken,
    ]
  );

  const allowedOrigin = cfg?.allowedParentOrigin ?? null;

  const firstAssistantId = useMemo(
    () => messages.find((m) => m.role === "assistant")?.id ?? null,
    [messages]
  );

  useEffect(() => {
    const el = panelRef.current;

    if (!el) return;

    el.style.setProperty("--lmn-mx", "52%");
    el.style.setProperty("--lmn-my", "22%");
  }, [open]);

  async function loadConfig() {
    setErr(null);
    setCfgLoading(true);

    configAbortRef.current?.abort();

    const ac = new AbortController();

    configAbortRef.current = ac;

    if (!publicKey) {
      setErr("Falta ?key=... en la URL del widget. Ej: /widget?key=TU_KEY");
      setCfgLoading(false);
      return;
    }

    try {
      const previewParam =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("preview") === "1"
          ? "&preview=1"
          : "";

      const r = await fetch(
        `/api/widget/config?key=${encodeURIComponent(publicKey)}${previewParam}`,
        {
          cache: "no-store",
          signal: ac.signal,
        }
      );

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(
          j?.error ?? "No se pudo cargar configuración del widget."
        );
      }

      setCfg(j);

      setMessages((prev) =>
        prev.length ? prev : [buildGreetingMessage(j, publicKey)]
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      setErr(error instanceof Error ? error.message : "Error cargando el widget.");
    } finally {
      setCfgLoading(false);
    }
  }

  useEffect(() => {
    setMessages([]);
    setTyping(false);
    setMenuOpen(false);
    setUnread(0);
    setShowJump(false);
    setExpandedMsgIds({});
    prevLenRef.current = 0;
    syncSignatureRef.current = "";
    messagesAbortRef.current?.abort();

    loadConfig();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  useEffect(() => {
    if (!cfgLoading && cfg && widgetEnabled === false) {
      postToParent({ type: "LUMENAI_WIDGET_STATE", open: false }, allowedOrigin);
      postToParent(
        {
          type: "LUMENAI_WIDGET_SIZE",
          open: false,
          width: "0px",
          height: "0px",
          radius: "0px",
        },
        allowedOrigin
      );
    }
  }, [cfgLoading, cfg, widgetEnabled, allowedOrigin]);

  useEffect(() => {
    postToParent({ type: "LUMENAI_WIDGET_STATE", open }, allowedOrigin);

    if (!open) {
      postToParent(
        {
          type: "LUMENAI_WIDGET_SIZE",
          open: false,
          width: hostedEmbed ? "0px" : "238px",
          height: hostedEmbed ? "0px" : "78px",
          radius: hostedEmbed ? "0px" : "999px",
        },
        allowedOrigin
      );
      return;
    }

    const mobile = isProbablyMobile();
    const vw = typeof window !== "undefined" ? window.innerWidth : 420;
    const vh = typeof window !== "undefined" ? window.innerHeight : 720;

    const targetW = expanded ? 500 : 440;
    const targetH = expanded ? 790 : 710;

    const w = mobile ? Math.min(vw - 18, 420) : Math.min(targetW, vw - 18);
    const h = mobile ? Math.min(vh - 18, 680) : Math.min(targetH, vh - 18);

    postToParent(
      {
        type: "LUMENAI_WIDGET_SIZE",
        open: true,
        width: `${w}px`,
        height: `${h}px`,
        radius: "14px",
      },
      allowedOrigin
    );
  }, [open, expanded, allowedOrigin, hostedEmbed]);

  useEffect(() => {
    if (!open) return;

    setTimeout(() => taRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!toast) return;

    const t = setTimeout(() => setToast(null), 1500);

    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!srAnnouncement) return;

    const t = setTimeout(() => setSrAnnouncement(""), 1200);

    return () => clearTimeout(t);
  }, [srAnnouncement]);

  useEffect(() => {
    const el = taRef.current;

    if (!el) return;

    el.style.height = "0px";

    const sh = el.scrollHeight;
    const next = clamp(sh, 44, 140);

    el.style.height = `${next}px`;
    el.style.overflowY = sh > 140 ? "auto" : "hidden";
  }, [input, open]);

  useEffect(() => {
    const el = bodyRef.current;

    if (!open || !el) return;

    const onScroll = () => {
      const near = isNearBottom(el, 180);

      setShowJump(!near);

      if (near) {
        setUnread(0);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const el = bodyRef.current;

    if (!el) return;

    const prev = prevLenRef.current;
    const next = messages.length;

    if (next > prev) {
      const last = messages[next - 1];
      const near = isNearBottom(el, 160);

      if (!near && last?.role === "assistant") {
        setUnread((u) => Math.min(99, u + 1));
        setShowJump(true);
      }

      if (near) {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }

    prevLenRef.current = next;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;

    const el = bodyRef.current;

    if (!el) return;

    if (isNearBottom(el, 160)) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [typing, open]);

  async function syncMessagesFromServer(
    chatIdOverride?: string | null,
    opts?: { silent?: boolean }
  ) {
    const activeChatId = String(chatIdOverride ?? chatId ?? "").trim();

    if (!publicKey || !activeChatId) return;

    messagesAbortRef.current?.abort();

    const ac = new AbortController();
    messagesAbortRef.current = ac;

    try {
      const r = await fetch(
        `/api/widget/messages?key=${encodeURIComponent(
          publicKey
        )}&chatId=${encodeURIComponent(activeChatId)}`,
        {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        }
      );

      const j = (await r.json().catch(() => ({}))) as WidgetMessagesResponse;

      if (!r.ok || j.ok === false) {
        if (!opts?.silent) {
          setErr(j.error || "No se pudieron sincronizar los mensajes.");
        }
        return;
      }

      const serverMessages = Array.isArray(j.messages) ? j.messages : [];
      const signature = serverMessagesSignature(serverMessages);

      if (signature && signature === syncSignatureRef.current) {
        return;
      }

      syncSignatureRef.current = signature;

      if (serverMessages.length === 0) {
        return;
      }

      const greeting = buildGreetingMessage(cfg ?? {}, publicKey);
      const nextMessages = [
        greeting,
        ...serverMessages
          .filter((m) => String(m.content ?? "").trim())
          .map(serverMsgToLocalMsg),
      ];

      setMessages(nextMessages);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      if (!opts?.silent) {
        setErr(
          error instanceof Error
            ? error.message
            : "No se pudieron sincronizar los mensajes.",
        );
      }
    }
  }

  useEffect(() => {
    if (!open || !chatId || !publicKey || cfgLoading || widgetEnabled === false) {
      return;
    }

    let alive = true;

    const tick = () => {
      if (!alive) return;
      if (sending) return;

      void syncMessagesFromServer(chatId, { silent: true });
    };

    tick();

    const interval = window.setInterval(tick, 3500);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chatId, publicKey, cfgLoading, widgetEnabled, sending]);

  if (!cfgLoading && cfg && widgetEnabled === false) return null;

  async function copyText(s: string) {
    try {
      await navigator.clipboard.writeText(String(s ?? ""));
      setToast("Copiado ✅");
    } catch {
      setToast("No se pudo copiar");
    }
  }

  function copyConversation() {
    const txt = messages
      .map((m) => `${m.role === "user" ? "Cliente" : assistantName}: ${m.content}`)
      .join("\n\n");

    void copyText(txt);
  }

  function downloadConversation() {
    const txt = messages
      .map((m) => `${m.role === "user" ? "Cliente" : assistantName}: ${m.content}`)
      .join("\n\n");

    const ok = downloadText("conversacion-lumenai.txt", txt);

    setToast(ok ? "Descargando…" : "No se pudo descargar");
  }

  function resetChat() {
    const greeting = buildGreetingFromCfgLike(cfg);

    setMessages([
      {
        id: safeRandomId("m"),
        role: "assistant",
        content: greeting,
        ts: Date.now(),
      },
    ]);

    setChatId(null);
    clearStoredChat(publicKey);
    syncSignatureRef.current = "";
    messagesAbortRef.current?.abort();
    setUnread(0);
    setShowJump(false);
    setExpandedMsgIds({});
    setToast("Chat reiniciado");
    setMenuOpen(false);

    setTimeout(() => taRef.current?.focus(), 80);
  }

  function scrollToBottom() {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setUnread(0);
    setShowJump(false);
  }

  function buildHistoryForLLM() {
    const clean = messages.filter((m) => String(m.content || "").trim());

    return clean.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  function buildVisitorContext() {
    const tz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "";
    const language = typeof navigator !== "undefined" ? navigator.language : null;
    const geoHint = inferClientGeo(tz, language);
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;

    return {
      timezone: tz || null,
      language,
      country: geoHint?.country ?? null,
      countryCode: geoHint?.countryCode ?? null,
      url:
        params?.get("parentUrl") ||
        (typeof window !== "undefined" ? window.location.href : null),
      referrer:
        params?.get("parentReferrer") ||
        (typeof document !== "undefined" ? document.referrer : null),
    };
  }

  async function transcribeAudio(blob: Blob) {
    if (!blob.size) return;

    setTranscribing(true);
    setToast("Transcribiendo audio...");

    try {
      const form = new FormData();
      form.set("audio", blob, "mensaje-lumenai.webm");
      form.set("language", "es");

      const res = await fetch("/api/widget/transcribe", {
        method: "POST",
        body: form,
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        text?: string;
        error?: string;
      };

      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "No se pudo transcribir el audio.");
      }

      const text = String(json.text ?? "").trim();

      if (!text) {
        setToast("No se detecto voz");
        return;
      }

      setInput(text);
      await send(text);
    } catch (error: unknown) {
      setErr(
        error instanceof Error
          ? error.message
          : "No se pudo interpretar el audio.",
      );
      setToast("Audio no procesado");
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (recording || transcribing || sending) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErr("Tu navegador no permite grabar audio desde este widget.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setRecording(false);
        void transcribeAudio(blob);
      };

      recorder.start();
      setRecording(true);
      setToast("Grabando audio...");
    } catch {
      setErr("No se pudo acceder al microfono.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
  }

  function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }

  async function send(textOverride?: string) {
    const text = String(textOverride ?? input).trim();

    if (!text || !publicKey || sending) return;

    setErr(null);
    setSending(true);
    setTyping(true);
    setMenuOpen(false);

    setInput("");

    setDraft(publicKey, "");

    const userMsg: Msg = {
      id: safeRandomId("m"),
      role: "user",
      content: text,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);

    chatAbortRef.current?.abort();

    const ac = new AbortController();

    chatAbortRef.current = ac;

    try {
      const visitorId = visitorIdRef.current || getOrCreateVisitorId(publicKey);

      const payload = {
        publicKey,
        key: publicKey,
        visitorId,
        chatId,
        message: text,
        history: buildHistoryForLLM(),
        visitorContext: buildVisitorContext(),
      };

      const r = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(j?.error ?? "Error en /api/widget/chat");
      }

      const reply = String(j?.reply ?? "").trim() || "No pude responder.";
      const returnedChatId = String(j?.chatId ?? j?.chat_id ?? "").trim();

      if (returnedChatId) {
        setChatId(returnedChatId);
        storeChatId(publicKey, returnedChatId);
      }

      const asstMsg: Msg = {
        id: safeRandomId("m"),
        role: "assistant",
        content: reply,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, asstMsg]);

      if (returnedChatId) {
        void syncMessagesFromServer(returnedChatId, { silent: true });
      }

      setSrAnnouncement("Respuesta recibida");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      setErr(error instanceof Error ? error.message : "No se pudo enviar.");

      setMessages((prev) => [
        ...prev,
        {
          id: safeRandomId("m"),
          role: "assistant",
          content: "Tuve un error. Intenta de nuevo.",
          ts: Date.now(),
        },
      ]);

      setSrAnnouncement("Ocurrió un error");
    } finally {
      setTyping(false);
      setSending(false);

      setTimeout(() => taRef.current?.focus(), 60);
    }
  }

  const wa = normalizeWhatsAppLink(cfg?.whatsapp ?? "");
  const em = String(cfg?.email ?? "").trim() || null;

  const hasAnyUserMsg = messages.some((m) => m.role === "user");

  const configuredQuickActions: string[] = Array.isArray(cfg?.quickActions)
    ? cfg.quickActions
        .map((x) => String(x ?? "").trim())
        .filter((x): x is string => x.length > 0)
    : [];

  const quickChips: string[] = !hasAnyUserMsg
    ? configuredQuickActions.length > 0
      ? configuredQuickActions
      : [
          "Quiero cotizar",
          "Necesito ayuda",
          "¿Qué servicios ofrecen?",
          "Horarios de atención",
          "Hablar con un humano",
        ]
    : [];

  const connectionLabel = cfgLoading ? "Conectando…" : err ? "Problema" : "Online";
  const launcherText = String(theme.launcherText ?? "¿En qué te ayudo?").trim();

  return (
    <div className="lmn-root" style={vars} data-open={open ? "true" : "false"}>
      <span className="lmn-srOnly" aria-live="polite">
        {srAnnouncement}
      </span>

      {!hostedEmbed ? (
        <div className={`lmn-orbWrap ${open ? "is-docked" : ""}`}>
          <button
            className="lmn-orbBtn"
            onClick={() => {
              setMenuOpen(false);
              setOpen((value) => !value);
            }}
            aria-label={open ? "Cerrar chat" : "Abrir chat"}
            title={launcherText || "Abrir chat"}
            data-open={open ? "true" : "false"}
          >
            <div className="lmn-orbCore">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="lmn-orbImg"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="lmn-orbMark" aria-hidden="true">
                  <svg viewBox="0 0 28 28" fill="none" role="img">
                    <path
                      d="M7.8 18.9c-1.35-1.22-2.1-2.9-2.1-4.78 0-4.02 3.42-7.28 7.64-7.28 4.22 0 7.64 3.26 7.64 7.28 0 4.02-3.42 7.28-7.64 7.28-.86 0-1.7-.13-2.46-.4l-3.05 1.33.27-3.43Z"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.35 13.9h.01M13.34 13.9h.01M16.33 13.9h.01"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M20.5 5.8 23 3.3M22.45 8.95h3.25M18.55 3.75V1.2"
                      stroke="currentColor"
                      strokeWidth="1.45"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
          <span className="lmn-orbSignal">
            {open ? "Chat activo" : launcherText || "Abrir chat"}
          </span>
        </div>
      ) : null}

      {open ? (
        <div className="lmn-pop" style={{ width: "100%", height: "100%" }}>
          <div
            ref={panelRef}
            className="lmn-panel"
            role="application"
            aria-label="Widget de chat"
          >
            <div className="lmn-panelInner" aria-hidden="true" />
            <div className="lmn-glow lmn-glowTop" aria-hidden="true" />
            <div className="lmn-glow lmn-glowBottom" aria-hidden="true" />

            <button
              type="button"
              className={`lmn-scrim ${menuOpen ? "lmn-scrimShow" : ""}`}
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
              tabIndex={menuOpen ? 0 : -1}
            />

            <div className={`lmn-toast ${toast ? "lmn-toastShow" : ""}`}>
              {toast ?? ""}
            </div>

            <div className="lmn-header">
              <div className="lmn-hLeft">
                <div className="lmn-avatar" aria-hidden="true">
                  <div className="lmn-avatarInner">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="lmn-avatarImg"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{initials(assistantName).slice(0, 2)}</span>
                    )}
                  </div>
                </div>

                <div className="lmn-titleWrap">
                  <div className="lmn-title">{businessName ?? "LumenAI"}</div>

                  <div className="lmn-sub">
                    <span className={err ? "lmn-dotWarn lmn-dot" : "lmn-dot"} />
                    <span>{connectionLabel}</span>
                    <span style={{ opacity: 0.75 }}>•</span>
                    <span style={{ opacity: 0.9 }}>
                      {cfgLoading ? "Cargando…" : `Asistente: ${assistantName}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lmn-actions">
                <button
                  className="lmn-iconBtn"
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? "Compactar" : "Expandir"}
                  title={expanded ? "Compactar" : "Expandir"}
                >
                  {expanded ? <ShrinkIcon /> : <ExpandIcon />}
                </button>

                <div className="lmn-menuWrap" data-menu="wrap">
                  <button
                    className="lmn-iconBtn"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Menú"
                    title="Menú (Ctrl/Cmd + /)"
                  >
                    <MoreIcon />
                  </button>

                  {menuOpen && (
                    <div className="lmn-menu" role="menu" aria-label="Opciones">
                      <button
                        className="lmn-menuItem"
                        onClick={resetChat}
                        role="menuitem"
                      >
                        <span>Reiniciar chat</span>
                        <span style={{ opacity: 0.7 }}>ESC</span>
                      </button>

                      <button
                        className="lmn-menuItem"
                        onClick={copyConversation}
                        role="menuitem"
                      >
                        <span>Copiar conversacion</span>
                        <span style={{ opacity: 0.7 }}>Ctrl+C</span>
                      </button>

                      <button
                        className="lmn-menuItem"
                        onClick={downloadConversation}
                        role="menuitem"
                      >
                        <span>Descargar .txt</span>
                        <span style={{ opacity: 0.7 }}>TXT</span>
                      </button>

                      <div className="lmn-menuSep" />

                      <button
                        className="lmn-menuItem"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);

                          if (wa) {
                            window.open(wa, "_blank", "noreferrer");
                          } else {
                            setToast("WhatsApp no configurado");
                          }
                        }}
                      >
                        <span>WhatsApp</span>
                        <span style={{ opacity: 0.7 }}>Abrir</span>
                      </button>

                      <button
                        className="lmn-menuItem"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);

                          if (em) {
                            window.open(`mailto:${em}`, "_blank");
                          } else {
                            setToast("Email no configurado");
                          }
                        }}
                      >
                        <span>Email</span>
                        <span style={{ opacity: 0.7 }}>Abrir</span>
                      </button>

                      <div className="lmn-menuSep" />

                      <button
                        className="lmn-menuItem"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          taRef.current?.focus();
                          setToast("Escribe tu mensaje");
                        }}
                      >
                        <span>Ir a escribir</span>
                        <span style={{ opacity: 0.7 }}>Ctrl+K</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="lmn-iconBtn"
                  onClick={() => {
                    setExpanded(false);
                    setMenuOpen(false);
                    setOpen(false);
                  }}
                  aria-label="Cerrar"
                  title="Cerrar (Esc)"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div
              className="lmn-body"
              ref={bodyRef}
              onPointerDown={() => setMenuOpen(false)}
            >
              <button
                type="button"
                className={`lmn-jumpBtn ${
                  showJump || unread > 0 ? "lmn-jumpShow" : ""
                }`}
                onClick={scrollToBottom}
                aria-label="Ir al final"
                title="Ir al final"
              >
                <span>{unread > 0 ? `Nuevos (${unread})` : "Ir abajo"}</span>
              </button>

              <div className="lmn-bodyInner">
                {err && (
                  <div className="lmn-banner lmn-bannerErr" role="alert">
                    <span>{err}</span>
                    <button className="lmn-retry" onClick={loadConfig}>
                      Reintentar
                    </button>
                  </div>
                )}

                {!err && cfgLoading && (
                  <div className="lmn-banner">
                    <span>Preparando tu asistente…</span>
                    <span style={{ opacity: 0.6 }}>✨</span>
                  </div>
                )}

                {quickChips.length > 0 && (
                  <div className="lmn-quickWrap">
                    <div className="lmn-quickTitle">Acciones rápidas</div>

                    <div className="lmn-chips">
                      {quickChips.map((chipText: string) => (
                        <button
                          key={chipText}
                          className="lmn-chip"
                          onClick={() => {
                            setInput(chipText);
                            setTimeout(() => taRef.current?.focus(), 40);
                          }}
                        >
                          {chipText}
                        </button>
                      ))}

                      <button
                        className="lmn-chip"
                        onClick={() => void send("Hola, ¿me puedes ayudar?")}
                      >
                        Enviar saludo
                      </button>

                      {(wa || em) && (
                        <button
                          className="lmn-chip"
                          onClick={() => {
                            if (wa) {
                              window.open(wa, "_blank", "noreferrer");
                            } else if (em) {
                              window.open(`mailto:${em}`, "_blank");
                            } else {
                              setToast("No hay contacto configurado");
                            }
                          }}
                        >
                          Hablar con humano ↗
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="lmn-msgList">
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    const isGreeting =
                      !isUser && firstAssistantId && m.id === firstAssistantId;

                    const canClamp =
                      !isUser && !isGreeting && shouldClampAssistant(m.content);

                    const isExpandedMsg = !!expandedMsgIds[m.id];

                    return (
                      <div
                        key={m.id}
                        className={`lmn-row ${
                          isUser ? "lmn-rowUser" : "lmn-rowAsst"
                        } lmn-fadeIn`}
                      >
                        <div
                          className={`lmn-bubble ${
                            isUser ? "lmn-bubbleUser" : ""
                          }`}
                        >
                          <div className="lmn-bubbleActions">
                            <button
                              className="lmn-miniBtn"
                              onClick={() => void copyText(m.content)}
                              aria-label="Copiar mensaje"
                              title="Copiar"
                            >
                              <CopyIcon />
                            </button>
                          </div>

                          <div
                            className={
                              canClamp && !isExpandedMsg
                                ? "lmn-msgContent lmn-msgClamp"
                                : "lmn-msgContent"
                            }
                          >
                            <MessageContent
                              text={m.content}
                              onCopy={copyText}
                              variant={isGreeting ? "greeting" : "default"}
                            />
                          </div>

                          {canClamp && (
                            <button
                              type="button"
                              className="lmn-moreLess"
                              onClick={() =>
                                setExpandedMsgIds((prev) => ({
                                  ...prev,
                                  [m.id]: !prev[m.id],
                                }))
                              }
                            >
                              {isExpandedMsg ? "Ver menos" : "Ver más"}
                            </button>
                          )}

                          <div className="lmn-meta">
                            <span>{isUser ? "Tú" : assistantName}</span>
                            <span>{formatTime(m.ts)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typing && (
                    <div className="lmn-row lmn-rowAsst">
                      <div className="lmn-typing" aria-label="Escribiendo">
                        <div className="lmn-dotAnim" />
                        <div className="lmn-dotAnim" />
                        <div className="lmn-dotAnim" />
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              </div>
            </div>

            <div className="lmn-footer">
              <div className="lmn-composerRow">
                <button
                  type="button"
                  className={`lmn-audioBtn ${recording ? "lmn-audioRecording" : ""}`}
                  onClick={toggleRecording}
                  disabled={sending || transcribing || !publicKey}
                  aria-label={recording ? "Detener audio" : "Enviar audio"}
                  title={recording ? "Detener audio" : "Enviar audio"}
                >
                  {recording ? <StopIcon /> : <MicIcon />}
                </button>

                <textarea
                  ref={taRef}
                  className="lmn-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Escribe aquí… (Enter para enviar, Shift+Enter para salto de línea)"
                  rows={1}
                  disabled={sending || transcribing || !publicKey}
                  aria-label="Escribir mensaje"
                />

                <button
                  className="lmn-send"
                  onClick={() => void send()}
                  disabled={sending || transcribing || !input.trim() || !publicKey}
                  aria-label="Enviar"
                  title="Enviar"
                >
                  <SendIcon />
                </button>
              </div>

              <div className="lmn-powered">
                Powered by <b>LumenAI</b>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
