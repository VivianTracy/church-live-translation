import type { CaptionMode } from "@/types/sermonSession";

type CaptionModeCardProps = {
  mode: CaptionMode;
  disabled?: boolean;
  onModeChange: (mode: CaptionMode) => void;
};

export function CaptionModeCard({
  mode,
  disabled = false,
  onModeChange,
}: CaptionModeCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          CAPTION MODE
        </p>
        <p className="text-sm text-slate-600">
          Choose <span className="font-semibold">Sermon</span> to save Chinese
          and English transcripts. Choose <span className="font-semibold">Others</span>{" "}
          for prayer and announcements without saving files.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("sermon")}
          className={`rounded-2xl px-5 py-4 text-left transition ${
            mode === "sermon"
              ? "bg-emerald-600 text-white shadow-sm"
              : "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <p className="text-lg font-bold">Sermon</p>
          <p
            className={`mt-1 text-sm ${
              mode === "sermon" ? "text-emerald-50" : "text-slate-600"
            }`}
          >
            Captions + transcript files
          </p>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("others")}
          className={`rounded-2xl px-5 py-4 text-left transition ${
            mode === "others"
              ? "bg-sky-600 text-white shadow-sm"
              : "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <p className="text-lg font-bold">Others</p>
          <p
            className={`mt-1 text-sm ${
              mode === "others" ? "text-sky-50" : "text-slate-600"
            }`}
          >
            Prayer and announcements only
          </p>
        </button>
      </div>
    </section>
  );
}
