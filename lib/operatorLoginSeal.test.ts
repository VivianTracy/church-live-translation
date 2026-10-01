import {
  openOperatorLoginCookie,
  sealOperatorLoginCookie,
} from "@/lib/operatorLoginSeal";
import { describe, expect, it } from "vitest";

const LOGIN_ID = "11111111-1111-4111-8111-111111111111";
const SECRET = "test-secret";

describe("operator login cookie seal", () => {
  it("round-trips a 5-minute demo end time", () => {
    const expiresAt = "2026-09-15T10:00:00.000Z";
    const sealed = sealOperatorLoginCookie(LOGIN_ID, expiresAt, SECRET);

    expect(openOperatorLoginCookie(sealed, SECRET)).toEqual({
      loginId: LOGIN_ID,
      sessionExpiresAt: expiresAt,
    });
  });

  it("round-trips a normal login with no end time", () => {
    const sealed = sealOperatorLoginCookie(LOGIN_ID, null, SECRET);

    expect(openOperatorLoginCookie(sealed, SECRET)).toEqual({
      loginId: LOGIN_ID,
      sessionExpiresAt: null,
    });
  });

  it("rejects a cookie whose end time was removed or changed", () => {
    const sealed = sealOperatorLoginCookie(
      LOGIN_ID,
      "2026-09-15T10:00:00.000Z",
      SECRET
    );
    const [prefix, loginId] = sealed.split(".");

    expect(openOperatorLoginCookie(loginId, SECRET)).toBeNull();
    expect(
      openOperatorLoginCookie(`${prefix}.${loginId}.0.forged`, SECRET)
    ).toBeNull();
    expect(openOperatorLoginCookie(sealed, "other-secret")).toBeNull();
  });
});
