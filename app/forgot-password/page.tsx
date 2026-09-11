import { ForgotPasswordForm } from "@/app/forgot-password/ForgotPasswordForm";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Reset password
          </h2>
          <p className="text-sm text-slate-600">
            Enter the operator email. We will send a link to choose a new
            password.
          </p>

          {isSupabaseConfigured() ? (
            <ForgotPasswordForm />
          ) : (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church sign-in is not configured. Add the Supabase keys on Vercel
              or in <span className="font-mono">.env.local</span>.
            </p>
          )}
        </section>

        <p className="text-center text-sm text-slate-600">
          Remember it?{" "}
          <Link href="/login" className="font-medium text-emerald-800">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
