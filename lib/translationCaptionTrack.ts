import {
  getAudioTranslationDirectionConfig,
  type AudioTranslationDirection,
  type ResolvedAudioTranslationDirection,
} from "@/lib/audioTranslationDirection";
import {
  TRANSLATION_LANGUAGE_LABELS,
  type SermonLanguageCode,
  type TranslationLanguageCode,
} from "@/lib/translationLanguages";

export const CAPTION_TRACKS = ["original", "translation"] as const;

export type CaptionTrack = (typeof CAPTION_TRACKS)[number];

/** Commit a readable chunk when OpenAI has not closed the utterance yet. */
export const CAPTION_LINE_LIMIT = 160;

/** Send the in-progress line often enough to read, without a post per syllable. */
export const CAPTION_PARTIAL_FLUSH_MS = 400;

export const MAX_CAPTION_LINES = 40;
export const CAPTION_MAX_LINE_CHARS = 1000;

export type CaptionLine = {
  seq: number;
  text: string;
  createdAt: number;
};

export type CaptionLanguage = {
  label: string;
  code: string;
};

export type CaptionSnapshot = {
  isLive: boolean;
  languageLabel: string;
  languageCode: string;
  latestSeq: number;
  revision: number;
  partial: string;
  lines: CaptionLine[];
  updatedAt: number;
};

export type CaptionFeed = {
  isLive: boolean;
  languageLabel: string;
  languageCode: string;
  latestSeq: number;
  partial: string;
  lines: CaptionLine[];
  updatedAt: number;
};

export type CaptionTrackState = {
  pending: string;
  committed: string;
};

const BREAK_CHARACTERS = "\n。！？；.!?，,、 ";

export function emptyCaptionSnapshot(): CaptionSnapshot {
  return {
    isLive: false,
    languageLabel: "",
    languageCode: "",
    latestSeq: 0,
    revision: 0,
    partial: "",
    lines: [],
    updatedAt: 0,
  };
}

export function emptyCaptionTrackState(): CaptionTrackState {
  return {
    pending: "",
    committed: "",
  };
}

export function parseCaptionTrack(value: unknown): CaptionTrack | null {
  return value === "original" || value === "translation" ? value : null;
}

export function getTranslationCaptionPath(
  churchSlug: string,
  track: CaptionTrack
): string {
  return `/captions/${churchSlug}/${track}`;
}

export function normalizeCaptionText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, CAPTION_MAX_LINE_CHARS);
}

export function resolveCaptionLanguages(input: {
  sermonLanguage?: SermonLanguageCode | null;
  headsetLanguage?: TranslationLanguageCode | null;
  direction: AudioTranslationDirection;
  resolvedDirection: ResolvedAudioTranslationDirection | null;
}): { original: CaptionLanguage; translation: CaptionLanguage } {
  const lockedDirection =
    input.direction === "auto" ? input.resolvedDirection : input.direction;
  const config = getAudioTranslationDirectionConfig(
    input.direction,
    input.resolvedDirection
  );

  return {
    original: input.sermonLanguage
      ? {
          label: TRANSLATION_LANGUAGE_LABELS[input.sermonLanguage],
          code: input.sermonLanguage,
        }
      : {
          label: specificLanguageLabel(config.inputLanguageLabel),
          code:
            lockedDirection === "zh-to-en"
              ? "zh"
              : lockedDirection === "en-to-zh"
                ? "en"
                : "",
        },
    translation: input.headsetLanguage
      ? {
          label: TRANSLATION_LANGUAGE_LABELS[input.headsetLanguage],
          code: input.headsetLanguage,
        }
      : {
          label: specificLanguageLabel(config.outputLanguageLabel),
          code:
            lockedDirection === "zh-to-en"
              ? "en"
              : lockedDirection === "en-to-zh"
                ? "zh"
                : "",
        },
  };
}

function specificLanguageLabel(label: string): string {
  if (label === "Speech" || label === "Translation") {
    return "";
  }

  return label;
}

function splitReadableLine(
  text: string,
  limit: number
): { line: string; rest: string } {
  const trimmed = text.trim();

  if (trimmed.length <= limit) {
    return { line: trimmed, rest: "" };
  }

  const window = trimmed.slice(0, limit);
  let breakAt = -1;

  for (let index = window.length - 1; index >= Math.floor(limit * 0.5); index -= 1) {
    if (BREAK_CHARACTERS.includes(window[index] ?? "")) {
      breakAt = index;
      break;
    }
  }

  const cut = breakAt >= 0 ? breakAt + 1 : limit;

  return {
    line: trimmed.slice(0, cut).trim(),
    rest: trimmed.slice(cut).trim(),
  };
}

export function appendCaptionDelta(
  state: CaptionTrackState,
  delta: string
): { state: CaptionTrackState; lines: string[] } {
  if (!delta) {
    return { state, lines: [] };
  }

  let pending = state.pending + delta;
  let committed = state.committed;
  const lines: string[] = [];

  while (pending.trim().length >= CAPTION_LINE_LIMIT && lines.length < 8) {
    const split = splitReadableLine(pending, CAPTION_LINE_LIMIT);

    if (!split.line || split.line.length >= pending.trim().length) {
      if (split.line && split.rest === "") {
        lines.push(split.line);
        committed += split.line;
        pending = "";
      }
      break;
    }

    lines.push(split.line);
    committed += split.line;
    pending = split.rest;
  }

  return {
    state: { pending, committed },
    lines,
  };
}

export function stripCommittedPrefix(full: string, committed: string): string {
  const fullCompact = full.replace(/\s+/g, "");
  const committedCompact = committed.replace(/\s+/g, "");

  if (!committedCompact) {
    return full.trim();
  }

  if (!fullCompact || fullCompact === committedCompact) {
    return "";
  }

  if (!fullCompact.startsWith(committedCompact)) {
    return full.trim();
  }

  let seen = 0;
  let index = 0;

  while (index < full.length && seen < committedCompact.length) {
    if (!/\s/.test(full[index] ?? "")) {
      seen += 1;
    }

    index += 1;
  }

  return full.slice(index).trim();
}

export function finishCaptionUtterance(
  state: CaptionTrackState,
  text: string
): { state: CaptionTrackState; line: string | null } {
  const full = text.trim() || state.pending.trim();

  if (!full) {
    return { state: emptyCaptionTrackState(), line: null };
  }

  const line = stripCommittedPrefix(full, state.committed).trim();

  return {
    state: emptyCaptionTrackState(),
    line: line || null,
  };
}

export function createCaptionTrackPublisher(
  post: (update: { text: string; final: boolean }) => void
) {
  let state = emptyCaptionTrackState();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let lastPartial = "";

  const clearTimer = () => {
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    timer = null;
  };

  const schedulePartial = () => {
    if (timer || closed) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      const partial = state.pending.trim();

      if (!partial || partial === lastPartial) {
        return;
      }

      lastPartial = partial;
      post({ text: partial, final: false });
    }, CAPTION_PARTIAL_FLUSH_MS);
  };

  return {
    append(delta: string) {
      if (closed || !delta) {
        return;
      }

      const result = appendCaptionDelta(state, delta);
      state = result.state;

      if (result.lines.length > 0) {
        clearTimer();
        lastPartial = "";

        for (const line of result.lines) {
          post({ text: line, final: true });
        }

        const partial = state.pending.trim();

        if (partial) {
          lastPartial = partial;
          post({ text: partial, final: false });
        }

        return;
      }

      if (state.pending.trim()) {
        schedulePartial();
      }
    },

    finish(text: string) {
      if (closed) {
        return;
      }

      clearTimer();
      const result = finishCaptionUtterance(state, text);
      state = result.state;
      lastPartial = "";

      if (result.line) {
        post({ text: result.line, final: true });
        return;
      }

      post({ text: "", final: false });
    },

    reset() {
      clearTimer();
      state = emptyCaptionTrackState();
      lastPartial = "";
    },

    stop() {
      if (closed) {
        return;
      }

      closed = true;
      clearTimer();
      const result = finishCaptionUtterance(state, "");
      state = result.state;

      if (result.line) {
        post({ text: result.line, final: true });
      }
    },
  };
}

export function mergeCaptionLines(
  current: CaptionLine[],
  incoming: CaptionLine[]
): CaptionLine[] {
  if (incoming.length === 0) {
    return current;
  }

  const seen = new Set(current.map((line) => line.seq));
  const next = current.slice();

  for (const line of incoming) {
    if (seen.has(line.seq)) {
      continue;
    }

    next.push(line);
    seen.add(line.seq);
  }

  return next.length > MAX_CAPTION_LINES ? next.slice(-MAX_CAPTION_LINES) : next;
}

export function captionFeedAfter(
  snapshot: CaptionSnapshot,
  afterSeq: number
): CaptionFeed {
  return {
    isLive: snapshot.isLive,
    languageLabel: snapshot.languageLabel,
    languageCode: snapshot.languageCode,
    latestSeq: snapshot.latestSeq,
    partial: snapshot.partial,
    lines: snapshot.lines.filter((line) => line.seq > afterSeq),
    updatedAt: snapshot.updatedAt,
  };
}

export function applyCaptionUpdateToSnapshot(
  current: CaptionSnapshot,
  update: {
    text: string;
    final: boolean;
    languageLabel: string;
    languageCode: string;
    revision: number;
    now: number;
  }
): CaptionSnapshot | null {
  if (update.revision <= current.revision) {
    return null;
  }

  const languageLabel = update.languageLabel || current.languageLabel;
  const languageCode = update.languageCode || current.languageCode;
  const text = normalizeCaptionText(update.text);

  if (!update.final) {
    return {
      ...current,
      isLive: true,
      revision: update.revision,
      partial: text,
      languageLabel,
      languageCode,
      updatedAt: update.now,
    };
  }

  const lines = current.lines.slice();
  let latestSeq = current.latestSeq;

  if (text && lines[lines.length - 1]?.text !== text) {
    latestSeq += 1;
    lines.push({
      seq: latestSeq,
      text,
      createdAt: update.now,
    });

    if (lines.length > MAX_CAPTION_LINES) {
      lines.splice(0, lines.length - MAX_CAPTION_LINES);
    }
  }

  return {
    ...current,
    isLive: true,
    revision: update.revision,
    partial: "",
    lines,
    latestSeq,
    languageLabel,
    languageCode,
    updatedAt: update.now,
  };
}

export function applyCaptionClear(
  current: CaptionSnapshot,
  revision: number,
  now: number
): CaptionSnapshot | null {
  if (revision <= current.revision) {
    return null;
  }

  return {
    ...emptyCaptionSnapshot(),
    revision,
    updatedAt: now,
  };
}
