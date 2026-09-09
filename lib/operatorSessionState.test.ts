import {
  INITIAL_OPERATOR_SESSION_STATE,
  MAX_AUTO_RECONNECT_ATTEMPTS,
  isOperatorSessionLocked,
  isOperatorSessionTiming,
  reduceOperatorSession,
  type OperatorSessionState,
} from "@/lib/operatorSessionState";
import { describe, expect, it } from "vitest";

function apply(
  events: Parameters<typeof reduceOperatorSession>[1][],
  initial: OperatorSessionState = INITIAL_OPERATOR_SESSION_STATE
): OperatorSessionState {
  return events.reduce(reduceOperatorSession, initial);
}

describe("reduceOperatorSession", () => {
  it("starts in off", () => {
    expect(INITIAL_OPERATOR_SESSION_STATE.status).toBe("off");
    expect(isOperatorSessionLocked("off")).toBe(false);
    expect(isOperatorSessionTiming("off")).toBe(false);
  });

  it("moves start to connecting and connected to live", () => {
    const live = apply([{ type: "start" }, { type: "connected" }]);

    expect(live).toEqual({
      status: "live",
      autoReconnectsUsed: 0,
      error: "",
    });
    expect(isOperatorSessionLocked("live")).toBe(true);
    expect(isOperatorSessionTiming("connecting")).toBe(true);
  });

  it("fails a user start without auto-reconnect", () => {
    const failed = apply([
      { type: "start" },
      { type: "start-failed", error: "Could not create OpenAI audio translation session." },
    ]);

    expect(failed.status).toBe("failed");
    expect(failed.autoReconnectsUsed).toBe(0);
    expect(failed.error).toContain("OpenAI");
  });

  it("treats microphone permission failure as failed, not live", () => {
    const failed = apply([
      { type: "start" },
      { type: "start-failed", error: "Permission denied" },
    ]);

    expect(failed.status).toBe("failed");
    expect(failed.status).not.toBe("live");
  });

  it("reconnects twice after connection loss, then fails", () => {
    const afterFirstLoss = apply([
      { type: "start" },
      { type: "connected" },
      { type: "connection-lost", reason: "Translation connection disconnected." },
    ]);

    expect(afterFirstLoss.status).toBe("reconnecting");
    expect(afterFirstLoss.autoReconnectsUsed).toBe(1);

    const afterSecondLoss = apply(
      [
        { type: "connected" },
        { type: "connection-lost", reason: "Translation connection failed." },
      ],
      afterFirstLoss
    );

    expect(afterSecondLoss.status).toBe("reconnecting");
    expect(afterSecondLoss.autoReconnectsUsed).toBe(2);

    const afterThirdLoss = apply(
      [
        { type: "connected" },
        { type: "connection-lost", reason: "Translation connection disconnected." },
      ],
      afterSecondLoss
    );

    expect(afterThirdLoss.status).toBe("failed");
    expect(afterThirdLoss.autoReconnectsUsed).toBe(MAX_AUTO_RECONNECT_ATTEMPTS);
    expect(afterThirdLoss.error).toContain("Reconnect");
  });

  it("retries a failed reconnect when attempts remain", () => {
    const reconnecting = apply([
      { type: "start" },
      { type: "connected" },
      { type: "connection-lost", reason: "Translation connection failed." },
    ]);

    const retried = reduceOperatorSession(reconnecting, {
      type: "start-failed",
      error: "Could not create OpenAI audio translation session.",
    });

    expect(retried.status).toBe("reconnecting");
    expect(retried.autoReconnectsUsed).toBe(2);
  });

  it("stops from any status back to off", () => {
    const live = apply([{ type: "start" }, { type: "connected" }]);

    expect(reduceOperatorSession(live, { type: "stop" })).toEqual(
      INITIAL_OPERATOR_SESSION_STATE
    );
  });

  it("ignores connection events after stop", () => {
    const stopped = apply([
      { type: "start" },
      { type: "stop" },
      { type: "connected" },
      { type: "start-failed", error: "late error" },
      { type: "connection-lost", reason: "late disconnect" },
    ]);

    expect(stopped).toEqual(INITIAL_OPERATOR_SESSION_STATE);
  });

  it("resets reconnect budget on a new user start", () => {
    const failed = apply([
      { type: "start" },
      { type: "connected" },
      { type: "connection-lost", reason: "drop 1" },
      { type: "connected" },
      { type: "connection-lost", reason: "drop 2" },
      { type: "connected" },
      { type: "connection-lost", reason: "drop 3" },
      { type: "start" },
    ]);

    expect(failed.status).toBe("connecting");
    expect(failed.autoReconnectsUsed).toBe(0);
    expect(failed.error).toBe("");
  });
});
