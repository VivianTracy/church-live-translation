export function AudienceCard() {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-5">
      <h2 className="text-2xl font-bold">Audience</h2>

      <p className="text-lg text-slate-600">
        Connected devices: <span className="font-bold">0</span>
      </p>

      <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }).map((_, index) => (
            <div
              key={index}
              className={`h-8 w-8 rounded-sm ${
                [
                  0, 1, 2, 5, 7,
                  10, 12, 14, 17, 19,
                  20, 22, 23, 24,
                ].includes(index)
                  ? "bg-slate-900"
                  : "bg-slate-100"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-lg font-medium">
        Scan to receive live English captions.
      </p>

      <p className="text-sm text-slate-500">
        localhost:3000/live
      </p>
    </section>
  );
}