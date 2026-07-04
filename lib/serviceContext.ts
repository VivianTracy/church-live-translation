import { redis } from "@/lib/redis";
import {
  EMPTY_SERVICE_CONTEXT,
  ServiceContext,
} from "@/types/serviceContext";

const SERVICE_CONTEXT_KEY = "service-context";

export function normalizeServiceContext(value: unknown): ServiceContext {
  if (!value || typeof value !== "object") {
    return EMPTY_SERVICE_CONTEXT;
  }

  const record = value as Partial<ServiceContext>;

  return {
    sermonText:
      typeof record.sermonText === "string" ? record.sermonText.trim() : "",
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
  };
}

export async function readServiceContext(): Promise<ServiceContext> {
  const stored = await redis.get(SERVICE_CONTEXT_KEY);

  return normalizeServiceContext(stored);
}

const SERMON_CONTEXT_GUARDRAILS = `
Sermon manuscript (reference only):

The following Chinese sermon manuscript is provided for reference only.

Use it to improve translation accuracy for:
- terminology and church vocabulary
- speaker names and proper nouns
- scripture references and book names
- outline consistency

Critical rules:
- Live spoken input is always the source of truth.
- Never quote or output manuscript text unless the speaker's live utterance clearly includes it.
- Never invent, summarize, or add content from the manuscript that was not spoken.
- If live speech and manuscript differ, follow live speech.
`.trim();

export function appendSermonContextToPrompt(
  basePrompt: string,
  sermonText: string
): string {
  const trimmed = sermonText.trim();

  if (!trimmed) {
    return basePrompt;
  }

  return `${basePrompt.trim()}

${SERMON_CONTEXT_GUARDRAILS}

--- Sermon manuscript ---

${trimmed}

--- End sermon manuscript ---`;
}
