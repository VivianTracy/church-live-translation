import {
  getParagraphAfterPause,
  type ParagraphState,
} from "@/lib/captionParagraph";

export type RollingLinesState = {
  paragraph: ParagraphState;
  lines: string[];
};

export function updateRollingLines(
  caption: string,
  updatedAt: number,
  previous: RollingLinesState | null,
  maxLines: number
): {
  lines: string[];
  currentLine: string;
  state: RollingLinesState | null;
} {
  const trimmedCaption = caption.trim();

  if (!trimmedCaption) {
    return { lines: [], currentLine: "", state: null };
  }

  const paragraphPrevious = previous?.paragraph ?? null;
  const result = getParagraphAfterPause(
    caption,
    updatedAt,
    paragraphPrevious
  );

  let lines = previous?.lines ?? [];

  if (
    paragraphPrevious &&
    trimmedCaption.length < paragraphPrevious.caption.length
  ) {
    lines = [];
  }

  if (
    paragraphPrevious &&
    result.state.baseIndex !== paragraphPrevious.baseIndex
  ) {
    const completedLine = paragraphPrevious.caption
      .slice(paragraphPrevious.baseIndex)
      .trim();

    if (completedLine && lines[lines.length - 1] !== completedLine) {
      lines = [...lines, completedLine].slice(-maxLines);
    }
  }

  return {
    lines,
    currentLine: result.paragraph,
    state: {
      paragraph: result.state,
      lines,
    },
  };
}
