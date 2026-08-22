"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { AnimatePresence } from "framer-motion";
import type {
  PulseAssistantReply,
  PulseConversationMessage,
  PulseHealthData,
  PulseRadarData,
  PulseRadarInsight,
} from "@/lib/pulse-radar/types";
import { pulseSectionFromPath } from "@/lib/pulse-radar/types";
import { ProactiveInsightBubble } from "./ProactiveInsightBubble";
import { PulseRadarLauncher } from "./PulseRadarLauncher";
import {
  INITIAL_PULSE_MACHINE,
  pulseMachineReducer,
} from "./state-machine";
import styles from "./pulse-radar-widget.module.css";

const PulseRadarPanel = dynamic(() => import("./PulseRadarPanel"), {
  ssr: false,
});

const STORAGE = {
  seen: "lumenai_pulse_seen_v2",
  dismissed: "lumenai_pulse_dismissed_v2",
  lastTeaser: "lumenai_pulse_last_teaser_at_v2",
  lastOpen: "lumenai_pulse_last_open_at_v2",
  snoozedUntil: "lumenai_pulse_snoozed_until_v2",
  proactive: "lumenai_pulse_proactive_enabled_v2",
} as const;

const TEASER_FREQUENCY_MS = 15 * 60 * 1000;
const SNOOZE_MS = 20 * 60 * 1000;
const REFRESH_STALE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

function readStoredIds(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string").slice(-100)
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function storeIds(key: string, values: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(values).slice(-100)));
  } catch {
    // Visual preferences are best effort only.
  }
}

function readStoredNumber(key: string) {
  try {
    const value = Number(window.localStorage.getItem(key) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function storeNumber(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Visual preferences are best effort only.
  }
}

function readSessionPreference(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeSessionPreference(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session preferences are best effort only.
  }
}

function persistSignalAction(
  signalId: string,
  action: "view" | "dismiss" | "snooze",
) {
  return fetch("/api/panel/pulse-radar/signals", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signalId, action, snoozeMinutes: 20 }),
  }).catch(() => null);
}

function isRadarData(value: unknown): value is PulseRadarData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<PulseRadarData>;
  return (
    data.ok === true &&
    typeof data.refreshedAt === "string" &&
    typeof data.suggestedFocus === "string" &&
    Array.isArray(data.insights) &&
    Array.isArray(data.questions)
  );
}

function parseHealth(value: unknown): PulseHealthData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<PulseHealthData>;
  if (
    data.ok !== true ||
    !data.summary ||
    !Array.isArray(data.checks) ||
    typeof data.summary.total !== "number" ||
    typeof data.summary.ready !== "number"
  ) {
    return null;
  }

  return {
    ok: true,
    health:
      data.health === "ready" || data.health === "warning" || data.health === "critical"
        ? data.health
        : "unknown",
    checks: data.checks.slice(0, 20),
    summary: {
      total: data.summary.total,
      ready: data.summary.ready,
      warnings: Number(data.summary.warnings) || 0,
      critical: Number(data.summary.critical) || 0,
    },
    checkedAt: new Date().toISOString(),
  };
}

function insightPriority(insight: PulseRadarInsight) {
  if (insight.severity === "critical") return 4;
  if (insight.severity === "high") return 3;
  if (insight.type === "opportunity") return 2;
  if (insight.severity === "medium") return 1;
  return 0;
}

function assistantMessage(insight: PulseRadarInsight): PulseConversationMessage {
  return {
    id: `signal-${insight.id}`,
    role: "assistant",
    title: insight.title,
    body: insight.body,
    expression: insight.expression,
    emojis: insight.emojis,
    emphasis: insight.emphasis,
    source: insight.source,
    confidence: insight.confidence,
    actions: insight.actions,
    createdAt: insight.createdAt,
    state: "complete",
    signalStatus: insight.status,
    period: insight.period,
    lastUpdatedAt: insight.lastUpdatedAt,
    lastError: insight.lastError,
  };
}

function teaserIsBlocked() {
  if (typeof document === "undefined") return true;
  if (
    document.querySelector(
      '[role="dialog"][aria-modal="true"], [data-publishing="true"], [data-critical-form="true"]',
    )
  ) {
    return true;
  }
  const active = document.activeElement;
  return Boolean(
    active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT"),
  );
}

export function PulseRadarWidget() {
  const pathname = usePathname() || "/panel/overview";
  const contextLabel = useMemo(() => pulseSectionFromPath(pathname), [pathname]);
  const [machine, dispatch] = useReducer(pulseMachineReducer, INITIAL_PULSE_MACHINE);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<PulseRadarData | null>(null);
  const [health, setHealth] = useState<PulseHealthData | null>(null);
  const [unreadInsight, setUnreadInsight] = useState<PulseRadarInsight | null>(null);
  const [messages, setMessages] = useState<PulseConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proactiveEnabled, setProactiveEnabled] = useState(true);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const conversationAbortRef = useRef<AbortController | null>(null);
  const teaserTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const lastLoadedAtRef = useRef(0);
  const surfaceRef = useRef(machine.surface);
  const seenIdsRef = useRef(new Set<string>());
  const dismissedIdsRef = useRef(new Set<string>());

  const panelOpen = machine.surface === "panel";
  const teaserOpen = machine.surface === "teaser" && Boolean(unreadInsight);
  const panelWasOpenRef = useRef(panelOpen);

  useEffect(() => {
    const wasOpen = panelWasOpenRef.current;
    panelWasOpenRef.current = panelOpen;
    if (!wasOpen || panelOpen) return;

    const frame = window.requestAnimationFrame(() => {
      launcherRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [panelOpen]);

  const clearTimer = useCallback((ref: MutableRefObject<number | null>) => {
    if (ref.current !== null) window.clearTimeout(ref.current);
    ref.current = null;
  }, []);

  const markInsightRead = useCallback((insight?: PulseRadarInsight | null) => {
    if (!insight) return;
    void persistSignalAction(insight.id, "view");
    seenIdsRef.current.add(insight.id);
    storeIds(STORAGE.seen, seenIdsRef.current);
    setUnreadInsight((current) => (current?.id === insight.id ? null : current));
    dispatch({ type: "MARK_READ" });
  }, []);

  const scheduleTeaser = useCallback(
    (insight: PulseRadarInsight) => {
      clearTimer(teaserTimerRef);
      if (!proactiveEnabled || teaserIsBlocked()) return;

      const snoozedUntil = readStoredNumber(STORAGE.snoozedUntil);
      if (snoozedUntil > Date.now()) return;

      const lastTeaser = readStoredNumber(STORAGE.lastTeaser);
      const critical = insight.severity === "critical";
      if (!critical && Date.now() - lastTeaser < TEASER_FREQUENCY_MS) return;

      teaserTimerRef.current = window.setTimeout(() => {
        if (teaserIsBlocked()) return;
        storeNumber(STORAGE.lastTeaser, Date.now());
        dispatch({ type: "SHOW_TEASER" });
      }, 900);
    },
    [clearTimer, proactiveEnabled],
  );

  const mergeMessages = useCallback((insights: PulseRadarInsight[]) => {
    setMessages((current) => {
      const existing = new Set(current.map((message) => message.id));
      const next = insights
        .slice(0, 4)
        .map(assistantMessage)
        .filter((message) => !existing.has(message.id));
      return [...current, ...next].slice(-20);
    });
  }, []);

  const loadRadar = useCallback(
    async (options?: { silent?: boolean }) => {
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      let timedOut = false;
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      if (!options?.silent) dispatch({ type: "LOAD_START" });
      setError(null);

      try {
        const query = encodeURIComponent(contextLabel);
        const [radarResponse, healthResponse] = await Promise.all([
          fetch(`/api/panel/pulse-radar?section=${query}`, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/panel/system-health", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        const radarJson = await radarResponse.json().catch(() => null);
        const healthJson = await healthResponse.json().catch(() => null);

        if (!radarResponse.ok) {
          if (radarResponse.status === 401 || radarResponse.status === 403) {
            throw new Error("Tu sesión venció o no tiene permisos para leer Pulse Radar.");
          }
          throw new Error(
            radarJson && typeof radarJson.error === "string"
              ? radarJson.error
              : "No se pudo leer Pulse Radar.",
          );
        }
        if (!isRadarData(radarJson)) {
          throw new Error("Pulse Radar recibió datos incompletos.");
        }

        setData(radarJson);
        setHealth(parseHealth(healthJson));
        mergeMessages(radarJson.insights);
        lastLoadedAtRef.current = Date.now();

        const candidate = [...radarJson.insights]
          .filter(
            (insight) =>
              insight.status === "new" &&
              (!insight.snoozedUntil || new Date(insight.snoozedUntil).getTime() <= Date.now()) &&
              !seenIdsRef.current.has(insight.id) &&
              !dismissedIdsRef.current.has(insight.id),
          )
          .sort((a, b) => insightPriority(b) - insightPriority(a))[0];

        setUnreadInsight(candidate ?? null);
        dispatch({
          type: "LOAD_SUCCESS",
          severity: candidate?.severity,
          hasUnread: Boolean(candidate),
        });

        if (candidate && surfaceRef.current !== "panel") scheduleTeaser(candidate);
      } catch (loadError) {
        if (controller.signal.aborted) {
          if (timedOut && !options?.silent) {
            setError("La revisión tardó demasiado. Puedes reintentarlo.");
            dispatch({ type: "LOAD_ERROR", offline: false });
          }
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo conectar con Pulse Radar.",
        );
        dispatch({ type: "LOAD_ERROR", offline: true });
      } finally {
        window.clearTimeout(timeout);
        if (loadAbortRef.current === controller) loadAbortRef.current = null;
      }
    },
    [contextLabel, mergeMessages, scheduleTeaser],
  );

  const openPanel = useCallback(() => {
    clearTimer(teaserTimerRef);
    storeNumber(STORAGE.lastOpen, Date.now());
    if (unreadInsight) markInsightRead(unreadInsight);
    dispatch({ type: "OPEN" });
    clearTimer(transitionTimerRef);
    transitionTimerRef.current = window.setTimeout(() => {
      const top = data?.insights?.[0];
      dispatch({
        type: "OPENED",
        severity: top?.severity,
        hasAction: Boolean(top?.actions?.length),
      });
    }, 250);
  }, [clearTimer, data?.insights, markInsightRead, unreadInsight]);

  const closePanel = useCallback(() => {
    conversationAbortRef.current?.abort();
    dispatch({ type: "CLOSE" });
    clearTimer(transitionTimerRef);
    transitionTimerRef.current = window.setTimeout(() => {
      dispatch({ type: "CLOSED", hasUnread: Boolean(unreadInsight) });
    }, 220);
  }, [clearTimer, unreadInsight]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || machine.state === "thinking" || machine.state === "streaming") return;

    const userMessage: PulseConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      body: question,
      createdAt: new Date().toISOString(),
      state: "complete",
    };
    setMessages((current) => [...current, userMessage].slice(-20));
    setInput("");
    setError(null);
    dispatch({ type: "LISTEN" });
    dispatch({ type: "THINK" });

    conversationAbortRef.current?.abort();
    const controller = new AbortController();
    conversationAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/panel/pulse-assistant", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: contextLabel, message: question }),
        signal: controller.signal,
      });
      const json = (await response.json().catch(() => null)) as PulseAssistantReply | null;

      if (!response.ok || !json?.ok || !json.insight) {
        throw new Error(json?.error || "No se pudo completar la revisión.");
      }

      setMessages((current) => [...current, assistantMessage(json.insight!)].slice(-20));
      dispatch({ type: "REPLY", hasAction: Boolean(json.insight.actions?.length) });
    } catch (submitError) {
      if (controller.signal.aborted) {
        setError("La revisión se canceló o superó el tiempo disponible.");
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo completar la revisión.",
        );
      }
      dispatch({ type: "ACTION_ERROR" });
    } finally {
      window.clearTimeout(timeout);
      if (conversationAbortRef.current === controller) {
        conversationAbortRef.current = null;
      }
    }
  }, [contextLabel, input, machine.state]);

  useEffect(() => {
    seenIdsRef.current = readStoredIds(STORAGE.seen);
    dismissedIdsRef.current = readStoredIds(STORAGE.dismissed);
    setProactiveEnabled(readSessionPreference(STORAGE.proactive) !== "off");
    setHydrated(true);
  }, []);

  useEffect(() => {
    surfaceRef.current = machine.surface;
  }, [machine.surface]);

  useEffect(() => {
    if (!hydrated) return;
    void loadRadar();
    return () => loadAbortRef.current?.abort();
  }, [hydrated, pathname, loadRadar]);

  useEffect(() => {
    if (!hydrated) return;

    const handleOpen = () => openPanel();
    const handleRefresh = () => void loadRadar({ silent: true });
    const handleFocus = () => {
      if (Date.now() - lastLoadedAtRef.current >= REFRESH_STALE_MS) {
        void loadRadar({ silent: true });
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleFocus();
    };

    window.addEventListener("lumenai:pulse-open", handleOpen);
    window.addEventListener("lumenai:pulse-refresh", handleRefresh);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("lumenai:pulse-open", handleOpen);
      window.removeEventListener("lumenai:pulse-refresh", handleRefresh);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hydrated, loadRadar, openPanel]);

  useEffect(
    () => () => {
      loadAbortRef.current?.abort();
      conversationAbortRef.current?.abort();
      clearTimer(teaserTimerRef);
      clearTimer(transitionTimerRef);
    },
    [clearTimer],
  );

  function dismissTeaser() {
    if (unreadInsight) {
      void persistSignalAction(unreadInsight.id, "dismiss");
      dismissedIdsRef.current.add(unreadInsight.id);
      storeIds(STORAGE.dismissed, dismissedIdsRef.current);
      setUnreadInsight(null);
    }
    dispatch({ type: "DISMISS_TEASER" });
  }

  function snoozeTeaser() {
    if (unreadInsight) void persistSignalAction(unreadInsight.id, "snooze");
    storeNumber(STORAGE.snoozedUntil, Date.now() + SNOOZE_MS);
    dispatch({ type: "DISMISS_TEASER" });
  }

  function toggleProactive() {
    const next = !proactiveEnabled;
    setProactiveEnabled(next);
    storeSessionPreference(STORAGE.proactive, next ? "on" : "off");
    if (!next) dispatch({ type: "DISMISS_TEASER" });
  }

  function cancelConversation() {
    conversationAbortRef.current?.abort();
    conversationAbortRef.current = null;
    setError(null);
    dispatch({ type: "REPLY", hasAction: false });
  }

  return (
    <aside
      className={styles.widget}
      data-state={machine.state}
      data-surface={machine.surface}
      aria-label="Pulse Radar"
    >
      <AnimatePresence>
        {teaserOpen && unreadInsight ? (
          <ProactiveInsightBubble
            key={unreadInsight.id}
            insight={unreadInsight}
            onDismiss={dismissTeaser}
            onRead={() => markInsightRead(unreadInsight)}
            onSnooze={snoozeTeaser}
            onMute={toggleProactive}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {panelOpen ? (
          <PulseRadarPanel
            key="pulse-panel"
            state={machine.state}
            data={data}
            health={health}
            messages={messages}
            contextLabel={contextLabel}
            input={input}
            error={error}
            proactiveEnabled={proactiveEnabled}
            onInput={setInput}
            onSubmit={() => void sendMessage()}
            onCancel={cancelConversation}
            onClose={closePanel}
            onRefresh={() => void loadRadar()}
            onSuggestion={setInput}
            onToggleProactive={toggleProactive}
            onAction={(messageId) => {
              const insight = data?.insights.find(
                (item) => `signal-${item.id}` === messageId,
              );
              markInsightRead(insight);
              dispatch({ type: "ACTION_SUCCESS" });
            }}
          />
        ) : null}
      </AnimatePresence>

      {!panelOpen ? (
        <PulseRadarLauncher
          state={machine.state}
          unreadCount={machine.unreadCount}
          health={health}
          onOpen={openPanel}
          launcherRef={launcherRef}
        />
      ) : null}
    </aside>
  );
}
