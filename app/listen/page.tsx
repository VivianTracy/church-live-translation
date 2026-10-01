export default function ListenIndexPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Church Translation
        </p>
        <h1 className="text-3xl font-bold">Use your church link</h1>
        <p className="text-zinc-400">
          Each church has its own phone page. Scan the QR code on the operator
          screen, or open the listen link shown there.
        </p>
        <p className="text-zinc-500">
          请扫描操作员屏幕上的二维码收听本教会翻译。
        </p>
      </div>
    </main>
  );
}
