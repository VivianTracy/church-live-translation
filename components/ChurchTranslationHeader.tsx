type ChurchTranslationHeaderProps = {
  churchName?: string | null;
  email?: string | null;
  showSignOut?: boolean;
};

export function ChurchTranslationHeader({
  churchName,
  email,
  showSignOut = false,
}: ChurchTranslationHeaderProps) {
  return (
    <header className="text-center space-y-2">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        Live translation console
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Church Translation
      </h1>
      <p className="text-lg text-slate-600">
        {churchName || "Live audio to wireless headsets"}
      </p>
      {email || showSignOut ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-sm text-slate-600">
          {email ? <span>{email}</span> : null}
          {showSignOut ? (
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-full px-3 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
