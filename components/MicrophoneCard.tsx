type MicrophoneCardProps = {
  isListening: boolean;
  micTranscript: string;
  isTranslating: boolean;
  micError: string;
  micNotice: string;
  translationError: string;
  lastTranslationMs: number | null;
  onStartMicrophone: () => void;
  onStopMicrophone: () => void;
  onRestartMicrophone: () => void;
};

export function MicrophoneCard({
  isListening,
  micTranscript,
  isTranslating,
  micError,
  micNotice,
  translationError,
  lastTranslationMs,
  onStartMicrophone,
  onStopMicrophone,
  onRestartMicrophone,
}: MicrophoneCardProps) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5">
      <h2 className="text-2xl font-bold text-center">Microphone Test</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStartMicrophone}
          disabled={isListening}
          className={`rounded-2xl px-6 py-5 text-xl font-bold text-white ${
            isListening
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Start Microphone
        </button>

        <button
          type="button"
          onClick={onStopMicrophone}
          disabled={!isListening}
          className={`rounded-2xl px-6 py-5 text-xl font-bold text-white ${
            !isListening
              ? "cursor-not-allowed bg-slate-400"
              : "bg-slate-700 hover:bg-slate-800"
          }`}
        >
          Stop Microphone
        </button>
      </div>

      {isListening && (
        <button
          type="button"
          onClick={onRestartMicrophone}
          className="w-full rounded-2xl border border-amber-300 bg-amber-50 px-6 py-4 text-lg font-semibold text-amber-950 hover:bg-amber-100"
        >
          Restart Microphone
        </button>
      )}

      <div className="rounded-2xl bg-slate-50 p-4 min-h-24 text-lg text-slate-700">
        {micTranscript || "Chinese transcript will appear here."}
      </div>

      <div className="rounded-2xl bg-stone-50 p-4 text-sm text-slate-600 space-y-1">
        <p>
          Listening status:{" "}
          <span className="font-semibold">
            {isListening ? "Listening" : "Not listening"}
          </span>
        </p>

        <p>
          Translation status:{" "}
          <span className="font-semibold">
            {isTranslating ? "Translating..." : "Ready"}
          </span>
        </p>

        {lastTranslationMs !== null && (
          <p>
            Last translation:{" "}
            <span className="font-semibold">
              {(lastTranslationMs / 1000).toFixed(1)}s
            </span>
          </p>
        )}

        {micNotice && (
          <pre className="whitespace-pre-wrap font-semibold text-amber-700 text-xs">
            {micNotice}
          </pre>
        )}

        {micError && (
          <pre className="whitespace-pre-wrap font-semibold text-red-700 text-xs">
            Microphone: {micError}
          </pre>
        )}

        {translationError && (
          <pre className="whitespace-pre-wrap font-semibold text-red-600 text-xs">
            Translation: {translationError}
          </pre>
        )}
      </div>
    </section>
  );
}
