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

export function isChurchEmailConfigured(): boolean {
  return Boolean(getResendApiKey());
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

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getChurchEmailFrom(),
      to: [to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Church email send failed:", response.status, body);
    return { ok: false, error: "Could not send email." };
  }

  return { ok: true };
}
