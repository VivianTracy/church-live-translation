import { AudioLevelMeter } from "@/components/AudioLevelMeter";

type AudioMonitorCardProps = {
  isListening: boolean;
  isTranslating: boolean;
  inputLevel: number;
  inputPeak: number;
  outputLevel: number;
  outputPeak: number;
  latencyMs: number | null;
  inputTranscript?: string;
  outputTranscript?: string;
  translationStatusLabel?: string;
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
  inputTranscript,
  outputTranscript,
  translationStatusLabel,
  micError,
  translationError,
  onStartListening,
  onStopListening,
  onRestartListening,
}: AudioMonitorCardProps) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5">
      <h2 className="text-2xl font-bold text-center">Audio Monitor</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStartListening}
          disabled={isListening}
          className={`rounded-2xl px-6 py-5 text-xl font-bold text-white ${
            isListening
              ? "cursor-not-allowed bg-violet-400"
              : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          Start Audio Input
        </button>

        <button
          type="button"
          onClick={onStopListening}
          disabled={!isListening}
          className={`rounded-2xl px-6 py-5 text-xl font-bold text-white ${
            !isListening
              ? "cursor-not-allowed bg-slate-400"
              : "bg-slate-700 hover:bg-slate-800"
          }`}
        >
          Stop Audio Input
        </button>
      </div>

      {isListening && (
        <button
          type="button"
          onClick={onRestartListening}
          className="w-full rounded-2xl border border-amber-300 bg-amber-50 px-6 py-4 text-lg font-semibold text-amber-950 hover:bg-amber-100"
        >
          Restart Audio Input
        </button>
      )}

      <div className="rounded-2xl bg-slate-50 p-5 space-y-4">
        <AudioLevelMeter
          label="Chinese input (sermon audio)"
          level={inputLevel}
          peak={inputPeak}
          active={isListening}
          accent="sky"
        />
        <AudioLevelMeter
          label="English output (translation channel)"
          level={outputLevel}
          peak={outputPeak}
          active={isListening && isTranslating}
          accent="emerald"
        />
      </div>

      {(inputTranscript !== undefined || outputTranscript !== undefined) && (
        <div className="grid gap-3">
          {inputTranscript !== undefined && (
            <div className="rounded-2xl bg-slate-50 p-4 min-h-20 text-sm text-slate-700 whitespace-pre-wrap">
              {inputTranscript || "Chinese transcript will appear here."}
            </div>
          )}
          {outputTranscript !== undefined && (
            <div className="rounded-2xl bg-emerald-50 p-4 min-h-20 text-sm text-emerald-950 whitespace-pre-wrap">
              {outputTranscript || "English transcript will appear here."}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-950 space-y-1">
        {translationStatusLabel ? (
          <p>
            Engine: <span className="font-semibold">{translationStatusLabel}</span>
          </p>
        ) : null}
        <p>
          Input status:{" "}
          <span className="font-semibold">
            {isListening ? "Receiving Chinese audio" : "Not receiving"}
          </span>
        </p>
        <p>
          Translation status:{" "}
          <span className="font-semibold">
            {isTranslating ? "Sending English audio" : "Ready"}
          </span>
        </p>
        {latencyMs !== null && (
          <p>
            Round-trip latency:{" "}
            <span className="font-semibold">
              {(latencyMs / 1000).toFixed(1)}s
            </span>
          </p>
        )}
      </div>

      {micError && (
        <p className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          Audio input: {micError}
        </p>
      )}

      {translationError && (
        <p className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          Translation: {translationError}
        </p>
      )}
    </section>
  );
}
