type BroadcastCardProps = {
  testCaption: string;
  onChangeTestCaption: (value: string) => void;
  onSendTestCaption: () => void;
};

export function BroadcastCard({
  testCaption,
  onChangeTestCaption,
  onSendTestCaption,
}: BroadcastCardProps) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5">
      <h2 className="text-2xl font-bold text-center">
        Broadcast Test Caption
      </h2>

      <textarea
        value={testCaption}
        onChange={(event) => onChangeTestCaption(event.target.value)}
        className="h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg outline-none focus:ring-2 focus:ring-slate-300"
      />

      <button
        onClick={onSendTestCaption}
        className="w-full rounded-2xl bg-slate-900 px-6 py-5 text-2xl font-bold text-white hover:bg-slate-800"
      >
        Send Test Caption
      </button>
    </section>
  );
}