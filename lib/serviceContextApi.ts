import {
  EMPTY_SERVICE_CONTEXT,
  ServiceContext,
} from "@/types/serviceContext";

export async function loadServiceContext(): Promise<ServiceContext> {
  const response = await fetch("/api/service-context");

  if (!response.ok) {
    throw new Error("Failed to load service context.");
  }

  const data = (await response.json()) as ServiceContext;

  return {
    sermonText:
      typeof data.sermonText === "string" ? data.sermonText.trim() : "",
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}

export async function saveServiceContext(
  sermonText: string
): Promise<ServiceContext> {
  const response = await fetch("/api/service-context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sermonText }),
  });

  if (!response.ok) {
    throw new Error("Failed to save service context.");
  }

  const data = (await response.json()) as { context?: ServiceContext };

  return data.context ?? {
    ...EMPTY_SERVICE_CONTEXT,
    sermonText: sermonText.trim(),
    updatedAt: Date.now(),
  };
}
