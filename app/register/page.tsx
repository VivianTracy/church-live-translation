import { RegisterChurchForm } from "@/app/register/RegisterChurchForm";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { isChurchEmailConfigured } from "@/lib/churchEmail";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Register this church
          </h2>
          <p className="text-sm text-slate-600">
            Create the operator sign-in, church brief name, and OpenAI key for
            this church. After you register, we confirm the church. You will get
            an email when you can sign in. Phone listeners do not register.
          </p>

          {isSupabaseConfigured() ? (
            isChurchEmailConfigured() ? (
              <RegisterChurchForm />
            ) : (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
                Church review email is not configured. Add{" "}
                <span className="font-mono">RESEND_API_KEY</span> on Vercel or
                in <span className="font-mono">.env.local</span>.
              </p>
            )
          ) : (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church registration is not configured. Add the Supabase keys on
              Vercel or in <span className="font-mono">.env.local</span>.
            </p>
          )}
        </section>

        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-emerald-800">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
