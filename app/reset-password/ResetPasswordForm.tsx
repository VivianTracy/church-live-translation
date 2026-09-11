"use client";

import {
  MIN_CHURCH_PASSWORD_LENGTH,
  parseOperatorPassword,
} from "@/lib/churchRegister";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        if (!data.user) {
          setLinkError("This reset link expired. Request a new one.");
          return;
        }

        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLinkError("This reset link expired. Request a new one.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = parseOperatorPassword(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!password) {
      setError(
        `Choose a password of at least ${MIN_CHURCH_PASSWORD_LENGTH} characters.`
      );
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("The new passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("Could not save the new password. Try the reset link again.");
        return;
      }

      router.replace("/operator-live");
      router.refresh();
    } catch {
      setError("Could not save the new password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (linkError) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {linkError}
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-medium text-emerald-800 hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (!isReady) {
    return <p className="text-sm text-slate-500">Checking reset link…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">New password</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={MIN_CHURCH_PASSWORD_LENGTH}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">
          Confirm new password
        </span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={MIN_CHURCH_PASSWORD_LENGTH}
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
        {isSubmitting ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
