import { isChurchEmailConfigured, readResendSendError } from "@/lib/churchEmail";
import {
  buildChurchApprovedEmail,
  buildChurchReviewEmail,
  createChurchVerificationToken,
  getChurchLoginUrl,
  getChurchReviewEmail,
  getChurchVerificationUrl,
  getPublicAppOrigin,
  hashChurchVerificationToken,
  isChurchReviewer,
  parseChurchId,
  parseChurchVerificationToken,
} from "@/lib/churchVerification";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("church verification tokens", () => {
  it("creates a 64-character hex token and matching hash", () => {
    const { token, tokenHash } = createChurchVerificationToken();

    expect(parseChurchVerificationToken(token)).toBe(token);
    expect(tokenHash).toBe(hashChurchVerificationToken(token));
    expect(tokenHash).not.toBe(token);
  });

  it("rejects short or non-hex tokens", () => {
    expect(parseChurchVerificationToken("abc")).toBeNull();
    expect(parseChurchVerificationToken("g".repeat(64))).toBeNull();
    expect(parseChurchVerificationToken(null)).toBeNull();
  });
});

describe("church verification emails", () => {
  it("builds a review email with the confirm page", () => {
    const token = "a".repeat(64);
    const email = buildChurchReviewEmail({
      origin: "https://church-translation.vercel.app",
      token,
      details: {
        churchName: "Example Church",
        churchSlug: "examplechurch",
        operatorEmail: "op@example.com",
        keyLastFour: "wxyz",
      },
    });

    expect(email.subject).toContain("Example Church");
    expect(email.text).toContain("op@example.com");
    expect(email.text).toContain("OpenAI key ending: wxyz");
    expect(email.text).toContain(
      getChurchVerificationUrl("https://church-translation.vercel.app", token)
    );
    expect(email.html).toContain("Confirm this church");
  });

  it("builds an approved email with the login page", () => {
    const email = buildChurchApprovedEmail({
      origin: "https://church-translation.vercel.app",
      churchName: "Example Church",
    });

    expect(email.subject).toBe("You can sign in to Church Translation");
    expect(email.text).toContain(
      getChurchLoginUrl("https://church-translation.vercel.app")
    );
    expect(email.html).toContain("Example Church");
  });

  it("emails reviews to Vivian unless overridden", () => {
    vi.stubEnv("CHURCH_REVIEW_EMAIL", "");
    expect(getChurchReviewEmail()).toBe("vivian.zke@gmail.com");
    expect(isChurchReviewer("Vivian.zke@gmail.com")).toBe(true);
    expect(isChurchReviewer("op@example.com")).toBe(false);
    vi.stubEnv("CHURCH_REVIEW_EMAIL", "review@example.com");
    expect(getChurchReviewEmail()).toBe("review@example.com");
  });

  it("accepts a church id", () => {
    expect(parseChurchId("2f1b7c4a-3d5e-4f6a-8b9c-0d1e2f3a4b5c")).toBe(
      "2f1b7c4a-3d5e-4f6a-8b9c-0d1e2f3a4b5c"
    );
    expect(parseChurchId("not-an-id")).toBeNull();
  });

  it("uses the public site origin for review links", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIENCE_URL", "https://church-translation.vercel.app/");
    expect(getPublicAppOrigin("http://127.0.0.1:3000")).toBe(
      "https://church-translation.vercel.app"
    );
  });

  it("requires a Resend key before sending", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isChurchEmailConfigured()).toBe(false);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    expect(isChurchEmailConfigured()).toBe(true);
  });

  it("explains Resend testing-mode failures", () => {
    expect(
      readResendSendError(
        403,
        JSON.stringify({
          message:
            "You can only send testing emails to your own email address (you@example.com).",
        })
      )
    ).toBe(
      "Resend can only email the account owner until a sending domain is verified."
    );
    expect(readResendSendError(401, "")).toBe(
      "Resend rejected the API key or from-address."
    );
  });
});
