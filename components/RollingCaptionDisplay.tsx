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
  lineAlign?: "left" | "center" | "right";
};

type ParagraphState = {
  caption: string;
  updatedAt: number;
  baseIndex: number;
};

const LINE_GAP_PX = 8;

function measureRollingViewport(
  lineElements: HTMLElement[],
  maxLines: number
): { viewportHeight: number; trackOffsetY: number; totalHeight: number } {
  if (lineElements.length === 0) {
    return { viewportHeight: 0, trackOffsetY: 0, totalHeight: 0 };
  }

  const totalHeight = lineElements.reduce((sum, line, index) => {
    const gap = index > 0 ? LINE_GAP_PX : 0;
    return sum + line.offsetHeight + gap;
  }, 0);

  let viewportHeight = 0;
  let linesInWindow = 0;

  for (let index = lineElements.length - 1; index >= 0 && linesInWindow < maxLines; index--) {
    const gap = linesInWindow > 0 ? LINE_GAP_PX : 0;
    viewportHeight += lineElements[index].offsetHeight + gap;
    linesInWindow += 1;
  }

  return {
    viewportHeight,
    trackOffsetY: Math.max(0, totalHeight - viewportHeight),
    totalHeight,
  };
}

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
  lineAlign = "center",
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
  const [viewportHeight, setViewportHeight] = useState(0);
  const [trackOffsetY, setTrackOffsetY] = useState(0);

  const textClassName = lightText ? "text-white" : "text-slate-900";
  const lineAlignClass =
    lineAlign === "left"
      ? "text-left"
      : lineAlign === "right"
        ? "text-right"
        : "text-center";

  useEffect(() => {
    const effectiveUpdatedAt =
      updatedAt && updatedAt > 0 ? updatedAt : ++localUpdatedAtRef.current;

    if (!caption.trim()) {
      paragraphStateRef.current = null;
      rollingLinesStateRef.current = null;
      setParagraph("");
      setFinalizedLines([]);
      setCurrentLine("");
      setViewportHeight(0);
      setTrackOffsetY(0);
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

    const fitAndMeasure = () => {
      const lineElements = [
        ...inner.querySelectorAll("[data-caption-line]"),
      ] as HTMLElement[];

      let size = maxFontPx;

      for (const line of lineElements) {
        line.style.fontSize = `${size}px`;
      }

      while (size > minFontPx) {
        const widest = lineElements.some(
          (line) => line.scrollWidth > container.clientWidth
        );

        if (!widest) {
          break;
        }

        size -= 1;

        for (const line of lineElements) {
          line.style.fontSize = `${size}px`;
        }
      }

      setFontSize(size);

      const measured = measureRollingViewport(lineElements, maxLines);
      setViewportHeight(measured.viewportHeight);
      setTrackOffsetY(measured.trackOffsetY);
    };

    fitAndMeasure();

    const observer = new ResizeObserver(fitAndMeasure);
    observer.observe(container);
    observer.observe(inner);

    return () => observer.disconnect();
  }, [layout, finalizedLines, currentLine, minFontPx, maxFontPx, maxLines]);

  if (layout === "rollingLines") {
    const displayLines = [...finalizedLines, currentLine].filter(Boolean);
    const lineStyle: CSSProperties = {
      fontSize: `${fontSize}px`,
    };

    return (
      <div
        ref={containerRef}
        className={`rolling-caption-viewport relative w-full overflow-hidden ${className}`}
        style={{
          height: viewportHeight > 0 ? `${viewportHeight}px` : undefined,
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        <div
          ref={linesInnerRef}
          className="rolling-caption-lines-track flex w-full flex-col"
          style={{
            gap: `${LINE_GAP_PX}px`,
            transform: `translateY(-${trackOffsetY}px)`,
          }}
        >
          {displayLines.length > 0 ? (
            <>
              {finalizedLines.map((line, index) => (
                <p
                  key={`final-${index}-${line.slice(0, 32)}`}
                  data-caption-line
                  style={lineStyle}
                  className={`rolling-caption-line w-full font-semibold leading-snug ${lineAlignClass} ${textClassName}`}
                >
                  {line}
                </p>
              ))}
              {currentLine ? (
                <p
                  key="current-line"
                  data-caption-line
                  style={lineStyle}
                  className={`rolling-caption-line w-full font-semibold leading-snug ${lineAlignClass} ${textClassName}`}
                >
                  {currentLine}
                </p>
              ) : null}
            </>
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
