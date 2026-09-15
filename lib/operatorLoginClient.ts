import type { OperatorLoginReason } from "@/lib/operatorLogin";

type OperatorAuthBody = {
  error?: string;
  reason?: string;
  idleDeadlineAt?: string;
};

async function readOperatorAuthBody(
  response: Response
): Promise<OperatorAuthBody> {
  return (await response.json().catch(() => ({}))) as OperatorAuthBody;
}

export async function claimOperatorLogin(): Promise<{
  ok: boolean;
  error?: string;
  idleDeadlineAt?: string;
}> {
  try {
    const response = await fetch("/api/operator/login", {
      method: "POST",
      credentials: "same-origin",
    });
    const body = await readOperatorAuthBody(response);

    if (!response.ok) {
      return {
        ok: false,
        error: body.error ?? "Could not finish church sign-in.",
      };
    }

    return { ok: true, idleDeadlineAt: body.idleDeadlineAt };
  } catch {
    return { ok: false, error: "Could not finish church sign-in." };
  }
}

export async function reportOperatorTranslationActivity(): Promise<{
  ok: boolean;
  status?: number;
  reason?: string;
  idleDeadlineAt?: string;
}> {
  try {
    const response = await fetch("/api/operator/translation-activity", {
      method: "POST",
      credentials: "same-origin",
    });
    const body = await readOperatorAuthBody(response);

    if (!response.ok) {
      return { ok: false, status: response.status, reason: body.reason };
    }

    return { ok: true, idleDeadlineAt: body.idleDeadlineAt };
  } catch {
    return { ok: false };
  }
}

export async function pollOperatorLogin(): Promise<{
  ok: boolean;
  status?: number;
  reason?: string;
  idleDeadlineAt?: string;
}> {
  try {
    const response = await fetch("/api/operator/me", { cache: "no-store" });
    const body = await readOperatorAuthBody(response);

    if (!response.ok) {
      return { ok: false, status: response.status, reason: body.reason };
    }

    return { ok: true, idleDeadlineAt: body.idleDeadlineAt };
  } catch {
    return { ok: true };
  }
}

export async function redirectToOperatorLogin(reason?: OperatorLoginReason) {
  try {
    await fetch("/api/operator/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Still send the operator to sign in.
  }

  const params = new URLSearchParams();
  params.set("next", "/operator-live");

  if (reason) {
    params.set("reason", reason);
  }

  window.location.replace(`/login?${params.toString()}`);
}
