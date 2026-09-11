import { parseOperatorEmail } from "@/lib/churchRegister";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_CHURCH_EMAIL_FROM =
  "Church Translation <beth.t@example.com>";

export type SendChurchEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendChurchEmailResult =
  | { ok: true }
  | { ok: false; error: string };

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^['"]|['"]$/g, "");
  return trimmed || undefined;
}

export function getResendApiKey(): string | undefined {
  return cleanEnv(process.env.RESEND_API_KEY);
}

export function getChurchEmailFrom(): string {
  return cleanEnv(process.env.CHURCH_EMAIL_FROM) ?? DEFAULT_CHURCH_EMAIL_FROM;
}

export function churchEmailFromCandidates(): string[] {
  return [
    ...new Set(
      [getChurchEmailFrom(), DEFAULT_CHURCH_EMAIL_FROM, "beth.t@example.com"].filter(
        (value): value is string => Boolean(value)
      )
    ),
  ];
}

export function isChurchEmailConfigured(): boolean {
  return Boolean(getResendApiKey());
}

export function readResendSendError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    const message = parsed.message?.trim();

    if (message) {
      if (message.toLowerCase().includes("testing emails")) {
        return "Resend can only email the account owner until a sending domain is verified.";
      }

      return message;
    }
  } catch {
    // Use the status fallback below.
  }

  if (status === 401 || status === 403) {
    return "Resend rejected the API key or from-address.";
  }

  return "Could not send email.";
}

export async function sendChurchEmail(
  input: SendChurchEmailInput
): Promise<SendChurchEmailResult> {
  const apiKey = getResendApiKey();
  const to = parseOperatorEmail(input.to);

  if (!apiKey) {
    return { ok: false, error: "Church review email is not configured." };
  }

  if (!to) {
    return { ok: false, error: "That email is not valid." };
  }

  try {
    let lastError = "Could not send email.";

    for (const from of churchEmailFromCandidates()) {
      const response = await fetch(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });

      if (response.ok) {
        return { ok: true };
      }

      const body = await response.text().catch(() => "");
      lastError = readResendSendError(response.status, body);
      console.error("Church email send failed:", from, response.status, body);
    }

    return { ok: false, error: lastError };
  } catch (error) {
    console.error("Church email send failed:", error);
    return { ok: false, error: "Could not send email." };
  }
}
