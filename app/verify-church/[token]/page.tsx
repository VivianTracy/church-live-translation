import { ConfirmChurchForm } from "@/app/verify-church/ConfirmChurchForm";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { getTranslationListenPath } from "@/lib/churchSlug";
import { parseChurchVerificationToken } from "@/lib/churchVerification";
import { getChurchVerificationByToken } from "@/lib/churchVerificationAccess";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

type VerifyChurchPageProps = {
  params: Promise<{ token: string }>;
};

export default async function VerifyChurchPage({
  params,
}: VerifyChurchPageProps) {
  const { token: rawToken } = await params;
  const token = parseChurchVerificationToken(rawToken);
  const configured = isSupabaseAdminConfigured();
  const record =
    configured && token ? await getChurchVerificationByToken(token) : null;

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Confirm this church
          </h2>

          {!configured ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church review is not configured.
            </p>
          ) : !record || !token ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
              This review link is not valid.
            </p>
          ) : record.status === "active" ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              {record.churchName} is already confirmed. They can sign in.
            </p>
          ) : record.status !== "pending" ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              This church cannot be confirmed.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Check these details, then confirm so they can sign in.
              </p>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-700">Church name</dt>
                  <dd className="text-slate-900">{record.churchName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Brief name</dt>
                  <dd className="font-mono text-slate-900">{record.churchSlug}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Listen page</dt>
                  <dd className="font-mono text-slate-900">
                    {getTranslationListenPath(record.churchSlug)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Operator email</dt>
                  <dd className="text-slate-900">{record.operatorEmail}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">OpenAI key</dt>
                  <dd className="text-slate-900">
                    {record.keyLastFour
                      ? `Ending ${record.keyLastFour}`
                      : "Saved"}
                  </dd>
                </div>
              </dl>
              <ConfirmChurchForm token={token} churchName={record.churchName} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
