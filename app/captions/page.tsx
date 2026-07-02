export default function CaptionsPage() {
  return (
    <div className="flex min-h-full flex-col bg-black px-4 py-8 font-sans text-white">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        <p className="mb-6 text-center text-sm text-zinc-400">
          English captions
        </p>
        <p className="text-center text-xl leading-relaxed text-zinc-500">
          Captions will appear here when the service is live.
        </p>
      </main>
    </div>
  );
}
