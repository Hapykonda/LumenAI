import type {
  PulseInsightSeverity,
  PulseWidgetState,
  PulseWidgetSurface,
} from "@/lib/pulse-radar/types";

export type PulseMachine = {
  state: PulseWidgetState;
  surface: PulseWidgetSurface;
  unreadCount: number;
  requestId: number;
};

export type PulseMachineEvent =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; severity?: PulseInsightSeverity; hasUnread?: boolean }
  | { type: "LOAD_ERROR"; offline?: boolean }
  | { type: "SHOW_TEASER" }
  | { type: "DISMISS_TEASER" }
  | { type: "OPEN" }
  | { type: "OPENED"; severity?: PulseInsightSeverity; hasAction?: boolean }
  | { type: "CLOSE" }
  | { type: "CLOSED"; hasUnread?: boolean }
  | { type: "MARK_READ" }
  | { type: "LISTEN" }
  | { type: "THINK" }
  | { type: "STREAM" }
  | { type: "REPLY"; hasAction?: boolean }
  | { type: "ACTION_SUCCESS" }
  | { type: "ACTION_ERROR" };

export const INITIAL_PULSE_MACHINE: PulseMachine = {
  state: "closed",
  surface: "closed",
  unreadCount: 0,
  requestId: 0,
};

function stateFromSeverity(severity?: PulseInsightSeverity): PulseWidgetState {
  if (severity === "critical") return "critical";
  if (severity === "high") return "warning";
  if (severity === "medium") return "insight";
  return "idle";
}

export function pulseMachineReducer(
  machine: PulseMachine,
  event: PulseMachineEvent,
): PulseMachine {
  switch (event.type) {
    case "LOAD_START":
      return {
        ...machine,
        state: machine.surface === "panel" ? "thinking" : machine.state,
        requestId: machine.requestId + 1,
      };
    case "LOAD_SUCCESS": {
      const unreadCount = event.hasUnread ? Math.max(1, machine.unreadCount) : machine.unreadCount;
      if (machine.surface === "panel") {
        return {
          ...machine,
          state: stateFromSeverity(event.severity),
          unreadCount,
        };
      }
      return {
        ...machine,
        state: unreadCount ? "unread" : "closed",
        unreadCount,
      };
    }
    case "LOAD_ERROR":
      return {
        ...machine,
        state: event.offline ? "offline" : "error",
      };
    case "SHOW_TEASER":
      if (!machine.unreadCount || machine.surface === "panel") return machine;
      return { ...machine, state: "teaser", surface: "teaser" };
    case "DISMISS_TEASER":
      return {
        ...machine,
        state: machine.unreadCount ? "unread" : "closed",
        surface: "closed",
      };
    case "OPEN":
      return { ...machine, state: "opening", surface: "panel" };
    case "OPENED":
      return {
        ...machine,
        state: event.hasAction ? "action_ready" : stateFromSeverity(event.severity),
        surface: "panel",
        unreadCount: 0,
      };
    case "CLOSE":
      return { ...machine, state: "closing", surface: "panel" };
    case "CLOSED":
      return {
        ...machine,
        state: event.hasUnread ? "unread" : "closed",
        surface: "closed",
      };
    case "MARK_READ":
      return {
        ...machine,
        state: machine.surface === "panel" ? "idle" : "closed",
        unreadCount: 0,
      };
    case "LISTEN":
      return { ...machine, state: "listening", surface: "panel" };
    case "THINK":
      return { ...machine, state: "thinking", surface: "panel" };
    case "STREAM":
      return { ...machine, state: "streaming", surface: "panel" };
    case "REPLY":
      return {
        ...machine,
        state: event.hasAction ? "action_ready" : "insight",
        surface: "panel",
      };
    case "ACTION_SUCCESS":
      return { ...machine, state: "success", surface: "panel" };
    case "ACTION_ERROR":
      return { ...machine, state: "error", surface: "panel" };
    default:
      return machine;
  }
}
