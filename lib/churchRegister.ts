import { parseChurchSlug } from "@/lib/churchSlug";

export const MIN_CHURCH_PASSWORD_LENGTH = 8;
export const MAX_CHURCH_NAME_LENGTH = 80;

const RESERVED_CHURCH_SLUGS = new Set([
  "local",
  "login",
  "register",
  "listen",
  "operator-live",
  "api",
  "auth",
  "health",
]);

export type ChurchRegisterFields = {
  churchName: string;
  churchSlug: string;
  email: string;
  password: string;
  openaiApiKey: string;
};

export type ParsedChurchRegister = ChurchRegisterFields & {
  keyLastFour: string;
};

export type ChurchRegisterParseResult =
  | { ok: true; value: ParsedChurchRegister }
  | { ok: false; error: string };

export function parseChurchName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (name.length === 0 || name.length > MAX_CHURCH_NAME_LENGTH) {
    return null;
  }

  return name;
}

export function isReservedChurchSlug(slug: string): boolean {
  return RESERVED_CHURCH_SLUGS.has(slug);
}

export function parseRegisterChurchSlug(value: unknown): string | null {
  const slug = parseChurchSlug(value);

  if (!slug || isReservedChurchSlug(slug)) {
    return null;
  }

  return slug;
}

export function parseChurchNickname(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return parseRegisterChurchSlug(value.trim().toLowerCase().replace(/\s+/g, ""));
}

export function parseOperatorEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return null;
  }

  return email;
}

export function parseOperatorPassword(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  if (value.length < MIN_CHURCH_PASSWORD_LENGTH || value.length > 128) {
    return null;
  }

  return value;
}

export function parseOpenAIApiKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const apiKey = value.trim();

  if (!apiKey.startsWith("sk-") || apiKey.length < 20 || apiKey.length > 256) {
    return null;
  }

  if (/\s/.test(apiKey)) {
    return null;
  }

  return apiKey;
}

export function openAIKeyLastFour(apiKey: string): string {
  return apiKey.slice(-4);
}

export function parseChurchRegisterInput(
  body: unknown
): ChurchRegisterParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Church details are required." };
  }

  const input = body as Record<string, unknown>;
  const churchName = parseChurchName(input.churchName);
  const churchSlug = parseChurchNickname(
    input.churchNickname ?? input.churchSlug
  );
  const email = parseOperatorEmail(input.email);
  const password = parseOperatorPassword(input.password);
  const openaiApiKey = parseOpenAIApiKey(input.openaiApiKey);

  if (!churchName) {
    return { ok: false, error: "Enter the church name." };
  }

  if (!churchSlug) {
    return {
      ok: false,
      error:
        "Enter a brief church name like pvccc. Use letters and numbers, with no spaces.",
    };
  }

  if (!email) {
    return { ok: false, error: "Enter a valid operator email." };
  }

  if (!password) {
    return {
      ok: false,
      error: `Choose a password of at least ${MIN_CHURCH_PASSWORD_LENGTH} characters.`,
    };
  }

  if (!openaiApiKey) {
    return { ok: false, error: "Enter this church’s OpenAI API key." };
  }

  return {
    ok: true,
    value: {
      churchName,
      churchSlug,
      email,
      password,
      openaiApiKey,
      keyLastFour: openAIKeyLastFour(openaiApiKey),
    },
  };
}

export function mapChurchRegisterRpcError(message: string): {
  error: string;
  status: number;
} {
  if (message.includes("slug_taken")) {
    return {
      error: "That brief name is already taken. Choose another.",
      status: 409,
    };
  }

  if (message.includes("already_operator")) {
    return {
      error: "That email is already registered. Sign in instead.",
      status: 409,
    };
  }

  if (message.includes("invalid_register_input")) {
    return { error: "Church details are not valid.", status: 400 };
  }

  return { error: "Could not finish church registration.", status: 500 };
}

export function isExistingAuthUserError(message: string | undefined): boolean {
  const lower = message?.toLowerCase() ?? "";
  return (
    lower.includes("already been registered") ||
    lower.includes("already registered") ||
    lower.includes("user already exists")
  );
}
