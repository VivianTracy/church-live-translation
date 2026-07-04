import { redis } from "@/lib/redis";
import {
  EMPTY_SERVICE_CONTEXT,
  ServiceContext,
} from "@/types/serviceContext";

export {
  buildLiveUtteranceMessage,
  buildRestTranslationInput,
  buildSermonReferenceSetupMessage,
  buildSystemInstructionWithSermonRules,
} from "@/lib/serviceContextPrompt";

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
