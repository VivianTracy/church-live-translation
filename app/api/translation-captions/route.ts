import {
  InvalidListenChurchError,
  UnknownListenChurchError,
  requireListenChurchSlug,
} from "@/lib/churchListen";
import {
  clearTranslationCaptionSnapshots,
  getTranslationCaptionSnapshot,
  updateTranslationCaption,
} from "@/lib/translationCaptionStore";
import { captionFeedAfter, parseCaptionTrack } from "@/lib/translationCaptionTrack";
import {
  translationRelayJsonResponse,
  translationRelayOptionsResponse,
} from "@/lib/translationRelayCors";
import {
  proxyTranslationRelay,
  shouldProxyTranslationRelay,
} from "@/lib/translationRelayProxy";
import { NextRequest } from "next/server";

function errorResponse(request: NextRequest, error: unknown, fallback: string) {
  if (error instanceof InvalidListenChurchError) {
    return translationRelayJsonResponse(
      request,
      { error: error.message },
      { status: 400 }
    );
  }

  if (error instanceof UnknownListenChurchError) {
    return translationRelayJsonResponse(
      request,
      { error: error.message },
      { status: 404 }
    );
  }

  const message = error instanceof Error ? error.message : fallback;

  return translationRelayJsonResponse(request, { error: message }, { status: 500 });
}

function cleanLanguageLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40);
}

function cleanLanguageCode(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const code = value.trim().toLowerCase();
  return /^[a-z]{2,8}$/.test(code) ? code : "";
}

function readRevision(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export async function OPTIONS(request: NextRequest) {
  return translationRelayOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    if (shouldProxyTranslationRelay(request)) {
      return await proxyTranslationRelay(request);
    }

    const { slug, church } = await requireListenChurchSlug(
      request.nextUrl.searchParams.get("church")
    );
    const track = parseCaptionTrack(request.nextUrl.searchParams.get("track"));

    if (!track) {
      return translationRelayJsonResponse(
        request,
        { error: "Choose original or translation captions." },
        { status: 400 }
      );
    }

    const afterParam = request.nextUrl.searchParams.get("after");
    const afterSeq =
      afterParam === null ? 0 : Number.parseInt(afterParam, 10);

    if (Number.isNaN(afterSeq) || afterSeq < 0) {
      return translationRelayJsonResponse(
        request,
        { error: "Invalid after parameter." },
        { status: 400 }
      );
    }

    const snapshot = await getTranslationCaptionSnapshot(slug, track);

    return translationRelayJsonResponse(request, {
      ...captionFeedAfter(snapshot, afterSeq),
      churchName: church?.name ?? null,
    });
  } catch (error) {
    return errorResponse(request, error, "Failed to load captions.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (shouldProxyTranslationRelay(request)) {
      return await proxyTranslationRelay(request);
    }

    const { slug } = await requireListenChurchSlug(
      request.nextUrl.searchParams.get("church")
    );

    let body: {
      clear?: unknown;
      revision?: unknown;
      track?: unknown;
      text?: unknown;
      final?: unknown;
      languageLabel?: unknown;
      languageCode?: unknown;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return translationRelayJsonResponse(
        request,
        { error: "Invalid caption update." },
        { status: 400 }
      );
    }

    const revision = readRevision(body.revision);

    if (revision === null) {
      return translationRelayJsonResponse(
        request,
        { error: "A caption revision is required." },
        { status: 400 }
      );
    }

    if (body.clear === true) {
      await clearTranslationCaptionSnapshots(slug, revision);
      return translationRelayJsonResponse(request, { success: true });
    }

    const track = parseCaptionTrack(body.track);

    if (!track || typeof body.text !== "string" || typeof body.final !== "boolean") {
      return translationRelayJsonResponse(
        request,
        { error: "track, text, and final are required." },
        { status: 400 }
      );
    }

    if (body.text.length > 8000) {
      return translationRelayJsonResponse(
        request,
        { error: "Caption text is too large." },
        { status: 413 }
      );
    }

    await updateTranslationCaption(slug, track, {
      text: body.text,
      final: body.final,
      languageLabel: cleanLanguageLabel(body.languageLabel),
      languageCode: cleanLanguageCode(body.languageCode),
      revision,
    });

    return translationRelayJsonResponse(request, { success: true });
  } catch (error) {
    return errorResponse(request, error, "Failed to update captions.");
  }
}
