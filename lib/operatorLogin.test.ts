import {
  OPERATOR_IDLE_MS,
  evaluateOperatorLogin,
  isOperatorLoginIdle,
  operatorIdleDeadlineAt,
  operatorLoginReasonMessage,
} from "@/lib/operatorLogin";
import { describe, expect, it } from "vitest";

const LOGIN_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_LOGIN_ID = "22222222-2222-4222-8222-222222222222";

describe("operator login idle timeout", () => {
  it("keeps a fresh login active", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");

    expect(
      isOperatorLoginIdle(
        {
          loggedInAt: "2026-09-15T09:55:00.000Z",
          lastTranslationAt: null,
        },
        now
      )
    ).toBe(false);
  });

  it("logs out 10 minutes after sign-in with no translation", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");

    expect(
      isOperatorLoginIdle(
        {
          loggedInAt: "2026-09-15T09:50:00.000Z",
          lastTranslationAt: null,
        },
        now
      )
    ).toBe(true);
  });

  it("uses the latest translation time instead of sign-in time", () => {
    const now = new Date("2026-09-15T10:00:00.000Z");

    expect(
      isOperatorLoginIdle(
        {
          loggedInAt: "2026-09-15T08:00:00.000Z",
          lastTranslationAt: "2026-09-15T09:55:00.000Z",
        },
        now
      )
    ).toBe(false);

    expect(
      isOperatorLoginIdle(
        {
          loggedInAt: "2026-09-15T08:00:00.000Z",
          lastTranslationAt: "2026-09-15T09:50:00.000Z",
        },
        now
      )
    ).toBe(true);
  });

  it("sets the idle deadline 10 minutes after last activity", () => {
    expect(
      operatorIdleDeadlineAt({
        loggedInAt: "2026-09-15T09:00:00.000Z",
        lastTranslationAt: "2026-09-15T09:05:00.000Z",
      })
    ).toBe(new Date(Date.parse("2026-09-15T09:05:00.000Z") + OPERATOR_IDLE_MS).toISOString());
  });
});

describe("evaluateOperatorLogin", () => {
  const stored = {
    loginId: LOGIN_ID,
    loggedInAt: "2026-09-15T09:55:00.000Z",
    lastTranslationAt: null,
  };

  it("allows the current login", () => {
    expect(
      evaluateOperatorLogin({
        cookieLoginId: LOGIN_ID,
        stored,
        now: new Date("2026-09-15T10:00:00.000Z"),
      })
    ).toEqual({ ok: true });
  });

  it("rejects a missing or older login", () => {
    expect(
      evaluateOperatorLogin({
        cookieLoginId: LOGIN_ID,
        stored: null,
      })
    ).toEqual({ ok: false, reason: "replaced" });

    expect(
      evaluateOperatorLogin({
        cookieLoginId: OTHER_LOGIN_ID,
        stored,
      })
    ).toEqual({ ok: false, reason: "replaced" });
  });

  it("rejects an idle current login", () => {
    expect(
      evaluateOperatorLogin({
        cookieLoginId: LOGIN_ID,
        stored,
        now: new Date("2026-09-15T10:10:00.000Z"),
      })
    ).toEqual({ ok: false, reason: "idle" });
  });
});

describe("operatorLoginReasonMessage", () => {
  it("explains idle and replaced sign-outs", () => {
    expect(operatorLoginReasonMessage("idle")).toContain("10 minutes");
    expect(operatorLoginReasonMessage("replaced")).toContain("another computer");
    expect(operatorLoginReasonMessage("other")).toBeNull();
  });
});
