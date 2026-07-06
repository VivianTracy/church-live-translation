/** Gap between caption updates that starts a new on-screen paragraph. */
export const CAPTION_PAUSE_MS = 2500;

type ParagraphState = {
  caption: string;
  updatedAt: number;
  baseIndex: number;
};

export function getParagraphAfterPause(
  caption: string,
  updatedAt: number,
  previous: ParagraphState | null
): { paragraph: string; state: ParagraphState } {
  const trimmedCaption = caption.trim();

  if (!trimmedCaption) {
    return {
      paragraph: "",
      state: { caption: "", updatedAt, baseIndex: 0 },
    };
  }

  if (!previous || trimmedCaption.length < previous.caption.length) {
    return {
      paragraph: trimmedCaption,
      state: { caption: trimmedCaption, updatedAt, baseIndex: 0 },
    };
  }

  const gap = previous.updatedAt > 0 ? updatedAt - previous.updatedAt : 0;
  let baseIndex = previous.baseIndex;

  if (
    gap >= CAPTION_PAUSE_MS &&
    trimmedCaption.length > previous.caption.length
  ) {
    baseIndex = previous.caption.length;
  }

  const paragraph = trimmedCaption.slice(baseIndex).trim();

  return {
    paragraph,
    state: {
      caption: trimmedCaption,
      updatedAt,
      baseIndex,
    },
  };
}
