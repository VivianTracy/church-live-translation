import {
  isExistingAuthUserError,
  mapChurchRegisterRpcError,
  openAIKeyLastFour,
  parseChurchRegisterInput,
  parseOpenAIApiKey,
  parseRegisterChurchSlug,
  suggestChurchSlug,
} from "@/lib/churchRegister";
import { describe, expect, it } from "vitest";

describe("church registration input", () => {
  it("suggests a listen slug from the church name", () => {
    expect(suggestChurchSlug("Peace Valley Chinese Christian Church")).toBe(
      "peace-valley-chinese-christian-church"
    );
    expect(suggestChurchSlug("PVCCC")).toBe("pvccc");
    expect(suggestChurchSlug("和平教会")).toBe("");
  });

  it("rejects reserved listen slugs", () => {
    expect(parseRegisterChurchSlug("local")).toBeNull();
    expect(parseRegisterChurchSlug("login")).toBeNull();
    expect(parseRegisterChurchSlug("pvccc")).toBe("pvccc");
  });

  it("accepts a valid OpenAI key and last four", () => {
    const apiKey = "sk-test_abcdefghijklmnopqrstuvwxyz";
    expect(parseOpenAIApiKey(apiKey)).toBe(apiKey);
    expect(openAIKeyLastFour(apiKey)).toBe("wxyz");
    expect(parseOpenAIApiKey("not-a-key")).toBeNull();
  });

  it("accepts a complete registration form", () => {
    const parsed = parseChurchRegisterInput({
      churchName: " Example Church ",
      churchSlug: "example-church",
      email: "Op@example.com",
      password: "sunday-123",
      openaiApiKey: "sk-test_abcdefghijklmnopqrstuvwxyz",
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        churchName: "Example Church",
        churchSlug: "example-church",
        email: "op@example.com",
        password: "sunday-123",
        openaiApiKey: "sk-test_abcdefghijklmnopqrstuvwxyz",
        keyLastFour: "wxyz",
      },
    });
  });

  it("rejects a missing church name", () => {
    expect(
      parseChurchRegisterInput({
        churchName: " ",
        churchSlug: "example-church",
        email: "op@example.com",
        password: "sunday-123",
        openaiApiKey: "sk-test_abcdefghijklmnopqrstuvwxyz",
      })
    ).toEqual({ ok: false, error: "Enter the church name." });
  });
});

describe("church registration failures", () => {
  it("maps a taken slug so the auth user can be rolled back", () => {
    expect(mapChurchRegisterRpcError("slug_taken")).toEqual({
      error: "That listen link is already taken. Choose another.",
      status: 409,
    });
  });

  it("maps an existing operator as a sign-in instead", () => {
    expect(mapChurchRegisterRpcError("already_operator").status).toBe(409);
    expect(isExistingAuthUserError("User already registered")).toBe(true);
    expect(isExistingAuthUserError("invalid login")).toBe(false);
  });
});
