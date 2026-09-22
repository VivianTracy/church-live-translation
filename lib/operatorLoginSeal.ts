import { isOperatorLoginId } from "@/lib/operatorLogin";
import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "v1";

export type SealedOperatorLogin = {
  loginId: string;
  sessionExpiresAt: string | null;
};

export function sealOperatorLoginCookie(
  loginId: string,
  sessionExpiresAt: string | null,
  secret: string
): string {
  const expiresMs = sessionExpiresAt ? Date.parse(sessionExpiresAt) : 0;
  const body = `${PREFIX}.${loginId}.${Number.isFinite(expiresMs) ? expiresMs : 0}`;
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function openOperatorLoginCookie(
  value: string | undefined,
  secret: string
): SealedOperatorLogin | null {
  if (!value || !secret) {
    return null;
  }

  const parts = value.split(".");

  if (parts.length !== 4 || parts[0] !== PREFIX) {
    return null;
  }

  const [prefix, loginId, expiresRaw, mac] = parts;

  if (!isOperatorLoginId(loginId) || !mac) {
    return null;
  }

  const body = `${prefix}.${loginId}.${expiresRaw}`;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const actualBuffer = Buffer.from(mac);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const expiresMs = Number(expiresRaw);

  if (!Number.isFinite(expiresMs) || expiresMs < 0) {
    return null;
  }

  return {
    loginId,
    sessionExpiresAt: expiresMs > 0 ? new Date(expiresMs).toISOString() : null,
  };
}
