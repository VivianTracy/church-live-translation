import { AudioLevelMeter } from "@/components/AudioLevelMeter";
import type { OperatorSessionStatus } from "@/lib/operatorSessionState";

type AudioMonitorCardProps = {
  status: OperatorSessionStatus;
  isTranslating: boolean;
  inputLevel: number;
  inputPeak: number;
  outputLevel: number;
  outputPeak: number;
  latencyMs: number | null;
  inputLanguageLabel?: string;
  outputLanguageLabel?: string;
  micError: string;
  translationError: string;
};

export function AudioMonitorCard({
  status,
  isTranslating,
  inputLevel,
  inputPeak,
  outputLevel,
  outputPeak,
  latencyMs,
  inputLanguageLabel = "Input",
  outputLanguageLabel = "Output",
  micError,
  translationError,
}: AudioMonitorCardProps) {
  const metersActive = status === "live" || status === "reconnecting";

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Audio levels</h2>
        <p className="text-sm text-slate-600">
          Check input and headset output after translation starts.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 space-y-4">
        <AudioLevelMeter
          label={`${inputLanguageLabel} in`}
          level={inputLevel}
          peak={inputPeak}
          active={metersActive}
          accent="sky"
        />
        <AudioLevelMeter
          label={`${outputLanguageLabel} out`}
          level={outputLevel}
          peak={outputPeak}
          active={metersActive && isTranslating}
          accent="emerald"
        />
      </div>

      <div className="text-sm text-slate-600 space-y-1">
        <p>
          Input:{" "}
          <span className="font-semibold text-slate-900">
            {status === "live"
              ? "Listening"
              : status === "connecting" || status === "reconnecting"
                ? "Starting"
                : "Stopped"}
          </span>
        </p>
        <p>
          Output:{" "}
          <span className="font-semibold text-slate-900">
            {isTranslating && status === "live"
              ? "Sending translation"
              : "Waiting"}
          </span>
        </p>
        {latencyMs !== null ? (
          <p>
            Latency:{" "}
            <span className="font-semibold text-slate-900">
              {(latencyMs / 1000).toFixed(1)}s
            </span>
          </p>
        ) : null}
      </div>

      {micError && micError !== translationError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {micError}
        </p>
      ) : null}

      {Boolean(translationError) && status === "live" ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {translationError}
        </p>
      ) : null}
    </section>
  );
}
