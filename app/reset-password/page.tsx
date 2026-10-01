import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { ChurchTranslationHeader } from "@/components/ChurchTranslationHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <ChurchTranslationHeader />

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Choose a new password
          </h2>
          <p className="text-sm text-slate-600">
            Use this page after you open the reset link from email.
          </p>

          {isSupabaseConfigured() ? (
            <ResetPasswordForm />
          ) : (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
              Church sign-in is not configured. Add the Supabase keys on Vercel
              or in <span className="font-mono">.env.local</span>.
            </p>
          )}
        </section>

        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-emerald-800">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
