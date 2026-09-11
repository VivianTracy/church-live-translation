"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") ? value : "/operator-live";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pendingReview, setPendingReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPendingReview(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Could not sign in. Check the email and password.");
        return;
      }

      const meResponse = await fetch("/api/operator/me", { cache: "no-store" });
      const meBody = (await meResponse.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (meResponse.status === 403 && meBody.code === "church_pending") {
        await supabase.auth.signOut();
        setPendingReview(true);
        setError(
          meBody.error ??
            "This church is waiting for confirmation. You will get an email when you can sign in."
        );
        return;
      }

      if (meResponse.status === 403) {
        await supabase.auth.signOut();
        setError(
          meBody.error ?? "This account is not an authorized church operator."
        );
        return;
      }

      if (!meResponse.ok) {
        setError(
          meBody.error ?? "Could not confirm church sign-in. Try again."
        );
        return;
      }

      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("Church sign-in is not configured on this computer.");
    } finally {
      setIsSubmitting(false);
    }
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

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
      </label>

      <p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          Forgot password?
        </Link>
      </p>

      {error ? (
        <p
          className={
            pendingReview
              ? "rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200"
              : "rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200"
          }
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
