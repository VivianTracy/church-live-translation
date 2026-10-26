export default function CaptionsIndexPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Church Translation
        </p>
        <h1 className="text-3xl font-bold">Use your church caption link</h1>
        <p className="text-zinc-400">
          Scan the original or translation QR code on the operator screen.
        </p>
        <p className="text-zinc-500">请扫描操作员屏幕上的原文或翻译二维码。</p>
      </div>
    </main>
  );
}
