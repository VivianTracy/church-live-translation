import {
  isExistingAuthUserError,
  mapChurchRegisterRpcError,
  openAIKeyLastFour,
  parseChurchNickname,
  parseChurchRegisterInput,
  parseOpenAIApiKey,
  parseRegisterChurchSlug,
} from "@/lib/churchRegister";
import { describe, expect, it } from "vitest";

describe("church registration input", () => {
  it("accepts a brief name with no spaces", () => {
    expect(parseChurchNickname("PVCCC")).toBe("pvccc");
    expect(parseChurchNickname(" demo ")).toBe("demo");
    expect(parseChurchNickname("Peace Valley")).toBe("peacevalley");
    expect(parseChurchNickname("example-church")).toBe("example-church");
  });

  it("rejects reserved or empty brief names", () => {
    expect(parseRegisterChurchSlug("local")).toBeNull();
    expect(parseRegisterChurchSlug("login")).toBeNull();
    expect(parseChurchNickname("local")).toBeNull();
    expect(parseChurchNickname("")).toBeNull();
    expect(parseChurchNickname("和平教会")).toBeNull();
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
      churchNickname: "ExampleChurch",
      email: "Op@example.com",
      password: "sunday-123",
      openaiApiKey: "sk-test_abcdefghijklmnopqrstuvwxyz",
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        churchName: "Example Church",
        churchSlug: "examplechurch",
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
        churchNickname: "examplechurch",
        email: "op@example.com",
        password: "sunday-123",
        openaiApiKey: "sk-test_abcdefghijklmnopqrstuvwxyz",
      })
    ).toEqual({ ok: false, error: "Enter the church name." });
  });

  it("rejects a missing brief name", () => {
    expect(
      parseChurchRegisterInput({
        churchName: "Example Church",
        churchNickname: " ",
        email: "op@example.com",
        password: "sunday-123",
        openaiApiKey: "sk-test_abcdefghijklmnopqrstuvwxyz",
      })
    ).toEqual({
      ok: false,
      error:
        "Enter a brief church name like pvccc. Use letters and numbers, with no spaces.",
    });
  });
});

describe("church registration failures", () => {
  it("maps a taken nickname so the auth user can be rolled back", () => {
    expect(mapChurchRegisterRpcError("slug_taken")).toEqual({
      error: "That brief name is already taken. Choose another.",
      status: 409,
    });
    expect(
      mapChurchRegisterRpcError(
        'duplicate key value violates unique constraint "churches_slug_key"'
      ).error
    ).toBe("That brief name is already taken. Choose another.");
  });

  it("maps an existing operator as a sign-in instead", () => {
    expect(mapChurchRegisterRpcError("already_operator").status).toBe(409);
    expect(isExistingAuthUserError("User already registered")).toBe(true);
    expect(isExistingAuthUserError("invalid login")).toBe(false);
  });

});
