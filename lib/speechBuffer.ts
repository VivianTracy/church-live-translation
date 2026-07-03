export type SpeechBufferOptions = {
  delayMs: number;
  onFlush: (text: string) => void;
};

export function createSpeechBuffer({ delayMs, onFlush }: SpeechBufferOptions) {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    const text = buffer.trim();

    buffer = "";

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (text) {
      onFlush(text);
    }
  };

  const add = (text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    buffer = buffer ? `${buffer} ${cleanText}` : cleanText;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(flush, delayMs);
  };

  const clear = () => {
    buffer = "";

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    add,
    flush,
    clear,
  };
}