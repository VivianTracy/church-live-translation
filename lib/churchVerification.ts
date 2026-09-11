import { randomBytes, createHash } from "node:crypto";
import { getTranslationListenUrl } from "@/lib/audienceUrl";
import { parseOperatorEmail } from "@/lib/churchRegister";

export const CHURCH_VERIFICATION_TOKEN_BYTES = 32;
export const DEFAULT_CHURCH_REVIEW_EMAIL = "vivian.zke@gmail.com";
export const DEFAULT_PUBLIC_APP_ORIGIN = "https://church-translation.vercel.app";

export type ChurchVerificationDetails = {
  churchName: string;
  churchSlug: string;
  operatorEmail: string;
  keyLastFour: string | null;
};

export type ChurchEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function normalizeOrigin(value: string | undefined): string | undefined {
  return value?.trim().replace(/\/$/, "") || undefined;
}

export function getPublicAppOrigin(requestUrl?: string): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_AUDIENCE_URL) ??
    (requestUrl ? new URL(requestUrl).origin : undefined) ??
    DEFAULT_PUBLIC_APP_ORIGIN
  );
}

export function getChurchReviewEmail(): string {
  return (
    parseOperatorEmail(process.env.CHURCH_REVIEW_EMAIL) ??
    DEFAULT_CHURCH_REVIEW_EMAIL
  );
}

export function createChurchVerificationToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(CHURCH_VERIFICATION_TOKEN_BYTES).toString("hex");

  return {
    token,
    tokenHash: hashChurchVerificationToken(token),
  };
}

export function hashChurchVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseChurchVerificationToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim().toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }

  return token;
}

export function getChurchVerificationPath(token: string): string {
  return `/verify-church/${token}`;
}

export function getChurchVerificationUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}${getChurchVerificationPath(token)}`;
}

export function getChurchLoginUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/login`;
}

export function buildChurchReviewEmail(input: {
  origin: string;
  token: string;
  details: ChurchVerificationDetails;
}): ChurchEmailContent {
  const reviewUrl = getChurchVerificationUrl(input.origin, input.token);
  const listenUrl = getTranslationListenUrl(input.origin, input.details.churchSlug);
  const keyLine = input.details.keyLastFour
    ? `OpenAI key ending: ${input.details.keyLastFour}`
    : "OpenAI key: saved";

  return {
    subject: `Confirm church registration: ${input.details.churchName}`,
    text: [
      `${input.details.churchName} asked to use Church Translation.`,
      "",
      `Church name: ${input.details.churchName}`,
      `Brief name: ${input.details.churchSlug}`,
      `Listen page: ${listenUrl}`,
      `Operator email: ${input.details.operatorEmail}`,
      keyLine,
      "",
      "Open this page to confirm they can sign in:",
      reviewUrl,
      "",
      "If this is not a real church, ignore this email. They will not be able to sign in.",
    ].join("\n"),
    html: [
      `<p>${escapeHtml(input.details.churchName)} asked to use Church Translation.</p>`,
      "<p>",
      `Church name: ${escapeHtml(input.details.churchName)}<br>`,
      `Brief name: ${escapeHtml(input.details.churchSlug)}<br>`,
      `Listen page: ${escapeHtml(listenUrl)}<br>`,
      `Operator email: ${escapeHtml(input.details.operatorEmail)}<br>`,
      `${escapeHtml(keyLine)}`,
      "</p>",
      `<p><a href="${escapeHtml(reviewUrl)}">Confirm this church</a></p>`,
      "<p>If this is not a real church, ignore this email. They will not be able to sign in.</p>",
    ].join(""),
  };
}

export function buildChurchApprovedEmail(input: {
  origin: string;
  churchName: string;
}): ChurchEmailContent {
  const loginUrl = getChurchLoginUrl(input.origin);

  return {
    subject: "You can sign in to Church Translation",
    text: [
      `${input.churchName} is confirmed.`,
      "You can sign in with the email and password you registered:",
      loginUrl,
    ].join("\n"),
    html: [
      `<p>${escapeHtml(input.churchName)} is confirmed.</p>`,
      `<p>You can <a href="${escapeHtml(loginUrl)}">sign in</a> with the email and password you registered.</p>`,
    ].join(""),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
