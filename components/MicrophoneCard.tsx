type MicrophoneCardProps = {
  isListening: boolean;
  micTranscript: string;
  isTranslating: boolean;
  translationError: string;
  lastTranslationMs: number | null;
  onStartMicrophone: () => void;
};

export function MicrophoneCard({
  isListening,
  micTranscript,
  isTranslating,
  translationError,
  lastTranslationMs,
  onStartMicrophone,
}: MicrophoneCardProps) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5">
      <h2 className="text-2xl font-bold text-center">
        Microphone Test
      </h2>

      <button
        onClick={onStartMicrophone}
        disabled={isListening}
        className={`w-full rounded-2xl px-6 py-5 text-2xl font-bold text-white ${
          isListening
            ? "cursor-not-allowed bg-blue-400"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isListening ? "Listening..." : "Start Microphone"}
      </button>

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

        {translationError && (
          <p className="font-semibold text-red-600">
            {translationError}
          </p>
        )}
      </div>
    </section>
  );
}