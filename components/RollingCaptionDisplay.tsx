"use client";

import {
  CAPTION_PAUSE_MS,
  getParagraphAfterPause,
} from "@/lib/captionParagraph";
import { updateRollingLines } from "@/lib/captionRollingLines";
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
  lightText?: boolean;
  /** Single growing paragraph (operator). Multi-line scroll-up (overlay). */
  layout?: "paragraph" | "rollingLines";
  maxLines?: number;
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
  lightText = false,
  layout = "paragraph",
  maxLines = 3,
}: RollingCaptionDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const linesInnerRef = useRef<HTMLDivElement>(null);
  const paragraphStateRef = useRef<ParagraphState | null>(null);
  const rollingLinesStateRef = useRef<ReturnType<
    typeof updateRollingLines
  >["state"]>(null);
  const localUpdatedAtRef = useRef(0);
  const [paragraph, setParagraph] = useState("");
  const [finalizedLines, setFinalizedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [fontSize, setFontSize] = useState(maxFontPx);
  const [linesOffsetY, setLinesOffsetY] = useState(0);

  const textClassName = lightText ? "text-white" : "text-slate-900";

  useEffect(() => {
    const effectiveUpdatedAt =
      updatedAt && updatedAt > 0 ? updatedAt : ++localUpdatedAtRef.current;

    if (!caption.trim()) {
      paragraphStateRef.current = null;
      rollingLinesStateRef.current = null;
      setParagraph("");
      setFinalizedLines([]);
      setCurrentLine("");
      setLinesOffsetY(0);
      return;
    }

    if (layout === "rollingLines") {
      const result = updateRollingLines(
        caption,
        effectiveUpdatedAt,
        rollingLinesStateRef.current,
        maxLines
      );
      rollingLinesStateRef.current = result.state;
      setFinalizedLines(result.lines);
      setCurrentLine(result.currentLine);
      return;
    }

    const result = getParagraphAfterPause(
      caption,
      effectiveUpdatedAt,
      paragraphStateRef.current
    );

    paragraphStateRef.current = result.state;
    setParagraph(result.paragraph);
  }, [caption, updatedAt, layout, maxLines]);

  useLayoutEffect(() => {
    if (layout !== "rollingLines") {
      return;
    }

    const viewport = containerRef.current;
    const inner = linesInnerRef.current;

    if (!viewport || !inner) {
      return;
    }

    const overflow = inner.scrollHeight - viewport.clientHeight;
    setLinesOffsetY(overflow > 0 ? -overflow : 0);
  }, [layout, finalizedLines, currentLine, fontSize, maxLines]);

  useLayoutEffect(() => {
    if (layout === "rollingLines") {
      return;
    }

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
  }, [layout, paragraph, minFontPx, maxFontPx]);

  useLayoutEffect(() => {
    if (layout !== "rollingLines") {
      return;
    }

    const container = containerRef.current;
    const inner = linesInnerRef.current;

    if (!container || !inner) {
      return;
    }

    const fitLines = () => {
      const lineElements = inner.querySelectorAll("[data-caption-line]");
      let size = maxFontPx;

      for (const element of lineElements) {
        const line = element as HTMLElement;
        line.style.fontSize = `${size}px`;
      }

      while (size > minFontPx) {
        const overflow = inner.scrollHeight - container.clientHeight;
        const widest = [...lineElements].some(
          (element) =>
            (element as HTMLElement).scrollWidth > container.clientWidth
        );

        if (overflow <= 0 && !widest) {
          break;
        }

        size -= 1;

        for (const element of lineElements) {
          const line = element as HTMLElement;
          line.style.fontSize = `${size}px`;
        }
      }

      setFontSize(size);
    };

    fitLines();

    const observer = new ResizeObserver(fitLines);
    observer.observe(container);

    return () => observer.disconnect();
  }, [layout, finalizedLines, currentLine, minFontPx, maxFontPx, maxLines]);

  if (layout === "rollingLines") {
    const visibleLines = [...finalizedLines, currentLine].filter(Boolean);
    const lineStyle: CSSProperties = {
      fontSize: `${fontSize}px`,
    };

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ maxHeight: `${maxLines * 1.45}em` }}
        aria-live="polite"
        aria-atomic="false"
      >
        <div
          ref={linesInnerRef}
          className="rolling-caption-lines-track flex flex-col gap-1"
          style={{ transform: `translateY(${linesOffsetY}px)` }}
        >
          {visibleLines.length > 0 ? (
            visibleLines.map((line, index) => (
              <p
                key={`${index}-${line.slice(0, 24)}`}
                data-caption-line
                style={lineStyle}
                className={`w-full text-center font-semibold leading-snug ${textClassName}`}
              >
                {line}
              </p>
            ))
          ) : (
            <p
              data-caption-line
              style={{ fontSize: `${Math.min(maxFontPx, 28)}px` }}
              className="w-full text-center font-medium leading-relaxed text-slate-400"
            >
              {placeholder}
            </p>
          )}
        </div>
      </div>
    );
  }

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
          ref={textRef}
          style={textStyle}
          className={`w-full text-center font-semibold leading-snug transition-[font-size] duration-200 ${textClassName}`}
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
