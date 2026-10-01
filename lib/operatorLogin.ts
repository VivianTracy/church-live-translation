export const OPERATOR_LOGIN_COOKIE = "church-operator-login";
export const OPERATOR_IDLE_MS = 10 * 60 * 1000;
export const OPERATOR_IDLE_MINUTES = OPERATOR_IDLE_MS / 60_000;
export const OPERATOR_DEMO_MS = 5 * 60 * 1000;
export const OPERATOR_DEMO_MINUTES = OPERATOR_DEMO_MS / 60_000;

export type OperatorLoginReason = "idle" | "replaced" | "demo";

export type OperatorLoginTimes = {
  loginId: string;
  loggedInAt: string;
  lastTranslationAt: string | null;
  sessionExpiresAt?: string | null;
};

export type OperatorLoginDecision =
  | { ok: true }
  | { ok: false; reason: OperatorLoginReason };

export function isOperatorLoginId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function operatorLastActivityMs(
  login: Pick<OperatorLoginTimes, "loggedInAt" | "lastTranslationAt">
): number {
  const activityAt = login.lastTranslationAt ?? login.loggedInAt;
  return Date.parse(activityAt);
}

export function isOperatorLoginIdle(
  login: Pick<OperatorLoginTimes, "loggedInAt" | "lastTranslationAt">,
  now: Date = new Date()
): boolean {
  const activityMs = operatorLastActivityMs(login);

  if (!Number.isFinite(activityMs)) {
    return true;
  }

  return now.getTime() - activityMs >= OPERATOR_IDLE_MS;
}

export function operatorIdleDeadlineAt(
  login: Pick<OperatorLoginTimes, "loggedInAt" | "lastTranslationAt">
): string {
  const activityMs = operatorLastActivityMs(login);
  const startMs = Number.isFinite(activityMs) ? activityMs : Date.now();
  return new Date(startMs + OPERATOR_IDLE_MS).toISOString();
}

export function isOperatorSessionExpired(
  login: Pick<OperatorLoginTimes, "sessionExpiresAt">,
  now: Date = new Date()
): boolean {
  if (!login.sessionExpiresAt) {
    return false;
  }

  const expiresMs = Date.parse(login.sessionExpiresAt);

  if (!Number.isFinite(expiresMs)) {
    return true;
  }

  return now.getTime() >= expiresMs;
}

export function operatorSessionDeadlineAt(
  login: Pick<
    OperatorLoginTimes,
    "loggedInAt" | "lastTranslationAt" | "sessionExpiresAt"
  >
): string {
  const idleDeadline = operatorIdleDeadlineAt(login);

  if (!login.sessionExpiresAt) {
    return idleDeadline;
  }

  const expiresMs = Date.parse(login.sessionExpiresAt);
  const idleMs = Date.parse(idleDeadline);

  if (!Number.isFinite(expiresMs)) {
    return idleDeadline;
  }

  if (!Number.isFinite(idleMs) || expiresMs <= idleMs) {
    return new Date(expiresMs).toISOString();
  }

  return idleDeadline;
}

export function parseOperatorLoginReason(
  value: string | null | undefined
): OperatorLoginReason | undefined {
  if (value === "idle" || value === "replaced" || value === "demo") {
    return value;
  }

  return undefined;
}

export function evaluateOperatorLogin(input: {
  cookieLoginId: string | null;
  stored: OperatorLoginTimes | null;
  now?: Date;
}): OperatorLoginDecision {
  if (
    !input.stored ||
    !isOperatorLoginId(input.stored.loginId) ||
    !isOperatorLoginId(input.cookieLoginId) ||
    input.stored.loginId !== input.cookieLoginId
  ) {
    return { ok: false, reason: "replaced" };
  }

  if (isOperatorSessionExpired(input.stored, input.now)) {
    return { ok: false, reason: "demo" };
  }

  if (isOperatorLoginIdle(input.stored, input.now)) {
    return { ok: false, reason: "idle" };
  }

  return { ok: true };
}

export function operatorLoginReasonMessage(
  reason: string | null | undefined
): string | null {
  if (reason === "idle") {
    return `Signed out because translation was not used for ${OPERATOR_IDLE_MINUTES} minutes.`;
  }

  if (reason === "replaced") {
    return "This account is signed in on another computer.";
  }

  if (reason === "demo") {
    return `The demo signed out after ${OPERATOR_DEMO_MINUTES} minutes.`;
  }

  return null;
}

export function operatorLoginCookieOptions(maxAgeSeconds = 60 * 60 * 24) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
