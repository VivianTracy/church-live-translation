import { AudioLevelMeter } from "@/components/AudioLevelMeter";

type AudioMonitorCardProps = {
  isListening: boolean;
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
  onStartListening: () => void;
  onStopListening: () => void;
  onRestartListening: () => void;
};

export function AudioMonitorCard({
  isListening,
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
  onStartListening,
  onStopListening,
  onRestartListening,
}: AudioMonitorCardProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">4. Audio input</h2>
        <p className="text-sm text-slate-600">
          Start listening after translation is live. Check levels before relying
          on the transmitter.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStartListening}
          disabled={isListening}
          className={`rounded-xl px-5 py-4 text-lg font-semibold text-white ${
            isListening
              ? "cursor-not-allowed bg-violet-400"
              : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          Start audio input
        </button>

        <button
          type="button"
          onClick={onStopListening}
          disabled={!isListening}
          className={`rounded-xl px-5 py-4 text-lg font-semibold text-white ${
            !isListening
              ? "cursor-not-allowed bg-slate-400"
              : "bg-slate-700 hover:bg-slate-800"
          }`}
        >
          Stop audio input
        </button>
      </div>

      {isListening ? (
        <button
          type="button"
          onClick={onRestartListening}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-100"
        >
          Restart audio input
        </button>
      ) : null}

      <div className="rounded-2xl bg-slate-50 p-4 space-y-4">
        <AudioLevelMeter
          label={`${inputLanguageLabel} in`}
          level={inputLevel}
          peak={inputPeak}
          active={isListening}
          accent="sky"
        />
        <AudioLevelMeter
          label={`${outputLanguageLabel} out`}
          level={outputLevel}
          peak={outputPeak}
          active={isListening && isTranslating}
          accent="emerald"
        />
      </div>

      <div className="text-sm text-slate-600 space-y-1">
        <p>
          Input:{" "}
          <span className="font-semibold text-slate-900">
            {isListening ? "Listening" : "Stopped"}
          </span>
        </p>
        <p>
          Output:{" "}
          <span className="font-semibold text-slate-900">
            {isTranslating ? "Sending translation" : "Waiting"}
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

      {micError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {micError}
        </p>
      ) : null}

      {translationError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {translationError}
        </p>
      ) : null}
    </section>
  );
}
