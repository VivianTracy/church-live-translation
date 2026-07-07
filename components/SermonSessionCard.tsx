import type { SermonSession } from "@/types/sermonSession";

type SermonSessionCardProps = {
  mode: "sermon" | "others";
  session: SermonSession | null;
  onEndSermon: () => void;
};

function formatStatus(status: SermonSession["status"] | undefined): string {
  switch (status) {
    case "recording":
      return "Recording";
    case "paused":
      return "Paused";
    case "ended":
      return "Saved";
    default:
      return "Not started";
  }
}

export function SermonSessionCard({
  mode,
  session,
  onEndSermon,
}: SermonSessionCardProps) {
  if (mode !== "sermon") {
    return null;
  }

  const canEndSession =
    session?.status === "recording" || session?.status === "paused";

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-950 space-y-3">
      <p className="font-semibold">Sermon transcript files</p>

      <div className="space-y-1">
        <p>
          Status:{" "}
          <span className="font-semibold">{formatStatus(session?.status)}</span>
        </p>
        {session ? (
          <>
            <p>
              Session: <span className="font-mono">{session.id}</span>
            </p>
            <p className="break-all">
              Chinese: <span className="font-mono">{session.chineseFile}</span>
            </p>
            <p className="break-all">
              English: <span className="font-mono">{session.englishFile}</span>
            </p>
            <p className="break-all">
              Segments: <span className="font-mono">{session.segmentsFile}</span>
            </p>
          </>
        ) : (
          <p>Start the microphone in Sermon mode to create transcript files.</p>
        )}
      </div>

      {canEndSession ? (
        <button
          type="button"
          onClick={onEndSermon}
          className="rounded-2xl bg-emerald-900 px-5 py-3 font-semibold text-white hover:bg-emerald-950"
        >
          End sermon session
        </button>
      ) : null}

      {session?.status === "ended" ? (
        <p className="text-xs text-emerald-900">
          Transcript files are saved on this computer. Start the microphone again
          in Sermon mode to begin a new session.
        </p>
      ) : (
        <p className="text-xs text-emerald-900">
          Files save automatically as you record. Stop the microphone during a
          break to pause writing, then start again to append. Click End sermon
          session when the sermon is finished.
        </p>
      )}
    </section>
  );
}
