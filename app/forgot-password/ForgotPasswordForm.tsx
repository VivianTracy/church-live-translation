"use client";

import { parseOperatorEmail } from "@/lib/churchRegister";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = parseOperatorEmail(formData.get("email"));

    if (!email) {
      setError("Enter a valid operator email.");
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );

      if (resetError) {
        console.error("Password reset email error:", resetError);
        setError("Could not send a reset email. Try again later.");
        return;
      }

      setSent(true);
    } catch {
      setError("Church sign-in is not configured on this computer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
        If that email is registered, we sent a reset link. Check the inbox, then
        choose a new password.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
