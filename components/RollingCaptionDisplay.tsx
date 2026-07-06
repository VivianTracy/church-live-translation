"use client";

import {
  CAPTION_PAUSE_MS,
  getParagraphAfterPause,
} from "@/lib/captionParagraph";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type RollingCaptionDisplayProps = {
  caption: string;
  updatedAt?: number;
  placeholder?: string;
  minFontPx?: number;
  maxFontPx?: number;
  className?: string;
};

type ParagraphState = {
  caption: string;
  updatedAt: number;
  baseIndex: number;
};

export function RollingCaptionDisplay({
  caption,
  updatedAt,
  placeholder = "Captions will appear here.",
  minFontPx = 20,
  maxFontPx = 48,
  className = "",
}: RollingCaptionDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const paragraphStateRef = useRef<ParagraphState | null>(null);
  const localUpdatedAtRef = useRef(0);
  const [paragraph, setParagraph] = useState("");
  const [paragraphKey, setParagraphKey] = useState(0);
  const [fontSize, setFontSize] = useState(maxFontPx);

  useEffect(() => {
    const effectiveUpdatedAt =
      updatedAt && updatedAt > 0 ? updatedAt : ++localUpdatedAtRef.current;

    const result = getParagraphAfterPause(
      caption,
      effectiveUpdatedAt,
      paragraphStateRef.current
    );

    if (result.state.baseIndex !== paragraphStateRef.current?.baseIndex) {
      setParagraphKey((value) => value + 1);
    }

    paragraphStateRef.current = result.state;
    setParagraph(result.paragraph);
  }, [caption, updatedAt]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) {
      return;
    }

    const fitText = () => {
      if (!paragraph.trim()) {
        setFontSize(maxFontPx);
        return;
      }

      let size = maxFontPx;
      text.style.fontSize = `${size}px`;

      while (
        size > minFontPx &&
        (text.scrollHeight > container.clientHeight ||
          text.scrollWidth > container.clientWidth)
      ) {
        size -= 1;
        text.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    fitText();

    const observer = new ResizeObserver(fitText);
    observer.observe(container);

    return () => observer.disconnect();
  }, [paragraph, paragraphKey, minFontPx, maxFontPx]);

  const hasParagraph = paragraph.trim().length > 0;
  const textStyle: CSSProperties = {
    fontSize: `${fontSize}px`,
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-1 items-center justify-center overflow-hidden ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {hasParagraph ? (
        <p
          key={paragraphKey}
          ref={textRef}
          style={textStyle}
          className="rolling-caption-text w-full text-center font-semibold leading-snug text-slate-900 transition-[font-size] duration-200"
        >
          {paragraph}
        </p>
      ) : (
        <p
          ref={textRef}
          style={{ fontSize: `${Math.min(maxFontPx, 28)}px` }}
          className="w-full text-center font-medium leading-relaxed text-slate-400"
        >
          {placeholder}
        </p>
      )}
    </div>
  );
}

export { CAPTION_PAUSE_MS };
