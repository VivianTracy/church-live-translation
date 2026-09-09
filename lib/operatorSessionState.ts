export type OperatorSessionStatus =
  | "off"
  | "connecting"
  | "live"
  | "reconnecting"
  | "failed";

export const MAX_AUTO_RECONNECT_ATTEMPTS = 2;

export type OperatorSessionState = {
  status: OperatorSessionStatus;
  autoReconnectsUsed: number;
  error: string;
};

export const INITIAL_OPERATOR_SESSION_STATE: OperatorSessionState = {
  status: "off",
  autoReconnectsUsed: 0,
  error: "",
};

export type OperatorSessionEvent =
  | { type: "start" }
  | { type: "connected" }
  | { type: "start-failed"; error: string }
  | { type: "connection-lost"; reason: string }
  | { type: "stop" };

export function isOperatorSessionLocked(status: OperatorSessionStatus): boolean {
  return (
    status === "connecting" ||
    status === "live" ||
    status === "reconnecting"
  );
}

export function isOperatorSessionTiming(status: OperatorSessionStatus): boolean {
  return (
    status === "connecting" ||
    status === "live" ||
    status === "reconnecting"
  );
}

function connectionLostMessage(reason: string): string {
  if (reason.trim()) {
    return reason;
  }

  return "Translation connection lost.";
}

export function reduceOperatorSession(
  state: OperatorSessionState,
  event: OperatorSessionEvent
): OperatorSessionState {
  switch (event.type) {
    case "stop":
      return INITIAL_OPERATOR_SESSION_STATE;

    case "start":
      return {
        status: "connecting",
        autoReconnectsUsed: 0,
        error: "",
      };

    case "connected":
      if (state.status === "off") {
        return state;
      }

      return {
        status: "live",
        autoReconnectsUsed: state.autoReconnectsUsed,
        error: "",
      };

    case "start-failed": {
      if (state.status === "off") {
        return state;
      }

      if (
        state.status === "reconnecting" &&
        state.autoReconnectsUsed < MAX_AUTO_RECONNECT_ATTEMPTS
      ) {
        return {
          status: "reconnecting",
          autoReconnectsUsed: state.autoReconnectsUsed + 1,
          error: event.error,
        };
      }

      return {
        status: "failed",
        autoReconnectsUsed: state.autoReconnectsUsed,
        error: event.error,
      };
    }

    case "connection-lost": {
      if (state.status !== "live" && state.status !== "reconnecting") {
        return state;
      }

      if (state.autoReconnectsUsed < MAX_AUTO_RECONNECT_ATTEMPTS) {
        return {
          status: "reconnecting",
          autoReconnectsUsed: state.autoReconnectsUsed + 1,
          error: connectionLostMessage(event.reason),
        };
      }

      return {
        status: "failed",
        autoReconnectsUsed: state.autoReconnectsUsed,
        error: "Translation connection lost. Reconnect to continue.",
      };
    }
  }
}
