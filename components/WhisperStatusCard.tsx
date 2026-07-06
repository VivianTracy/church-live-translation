import {
  formatWhisperTime,
  type WhisperMonitorSnapshot,
} from "@/lib/openaiTranscriptionMonitor";

type WhisperStatusCardProps = {
  status: WhisperMonitorSnapshot | null;
};

function StatusRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number | boolean;
  warn?: boolean;
}) {
  return (
    <p>
      {label}:{" "}
      <span className={`font-semibold ${warn ? "text-amber-800" : ""}`}>
        {String(value)}
      </span>
    </p>
  );
}

export function WhisperStatusCard({ status }: WhisperStatusCardProps) {
  if (!status) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-semibold">Whisper API monitor</p>
        <p>Start the microphone to see live Whisper WebSocket status.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 space-y-4">
      <div>
        <p className="font-semibold">Transcription monitor</p>
        <p className="text-xs text-amber-900/80">
          Live diagnostics for REST chunk transcription (5s WAV chunks).
        </p>
      </div>

      <div className="grid gap-1 sm:grid-cols-2 rounded-2xl bg-white/70 p-4 text-xs">
        <StatusRow label="Connection" value={status.connectionState} />
        <StatusRow label="Microphone" value={status.micLabel ?? "—"} />
        <StatusRow label="Track state" value={status.micReadyState ?? "—"} />
        <StatusRow
          label="AudioContext"
          value={status.audioContextState ?? "—"}
          warn={status.audioContextState === "suspended"}
        />
        <StatusRow
          label="Last chunk RMS"
          value={status.lastChunkRms?.toFixed(4) ?? "—"}
          warn={(status.lastChunkRms ?? 0) < 0.001}
        />
        <StatusRow
          label="Last chunk peak"
          value={status.lastChunkPeak?.toFixed(4) ?? "—"}
          warn={(status.lastChunkPeak ?? 0) < 0.001}
        />
        <StatusRow label="PCM chunks" value={status.appendCount} />
        <StatusRow label="REST transcribe calls" value={status.commitCount} />
        <StatusRow
          label="Quiet chunks skipped"
          value={status.commitSkippedCount}
        />
        <StatusRow label="Empty transcripts" value={status.emptyCompletedCount} />
        <StatusRow label="Segments emitted" value={status.segmentCount} />
        <StatusRow label="Server events total" value={status.serverEventCount} />
        <StatusRow label="Errors" value={status.errorCount} warn={status.errorCount > 0} />
        <StatusRow
          label="Ignored errors"
          value={status.ignoredErrorCount}
        />
      </div>

      {(status.lastCommitSkippedReason ||
        status.lastServerEvent ||
        status.lastError) && (
        <div className="rounded-2xl bg-white/70 p-4 text-xs space-y-1">
          {status.lastServerEvent && (
            <p>
              Last server event:{" "}
              <span className="font-semibold">{status.lastServerEvent}</span>
              {status.lastServerEventAt
                ? ` at ${formatWhisperTime(status.lastServerEventAt)}`
                : ""}
            </p>
          )}
          {status.lastCommitSkippedReason && (
            <p className="text-amber-900">
              Last commit skip:{" "}
              <span className="font-semibold">
                {status.lastCommitSkippedReason}
              </span>
            </p>
          )}
          {status.lastError && (
            <p className="text-red-700">
              Last error:{" "}
              <span className="font-semibold">{status.lastError}</span>
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white/70 p-4 max-h-64 overflow-y-auto">
        <p className="mb-2 text-xs font-semibold">Event log</p>
        {status.logs.length === 0 ? (
          <p className="text-xs text-amber-900/70">No events yet.</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {status.logs.map((entry, index) => (
              <li
                key={`${entry.at}-${index}`}
                className={
                  entry.level === "error"
                    ? "text-red-700"
                    : entry.level === "warn"
                      ? "text-amber-900"
                      : "text-slate-700"
                }
              >
                [{formatWhisperTime(entry.at)}] {entry.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
