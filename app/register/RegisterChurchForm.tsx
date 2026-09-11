"use client";

import { suggestChurchSlug } from "@/lib/churchRegister";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterChurchForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [churchSlug, setChurchSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const churchName = String(formData.get("churchName") ?? "").trim();
    const slug = String(formData.get("churchSlug") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const openaiApiKey = String(formData.get("openaiApiKey") ?? "").trim();

    try {
      const response = await fetch("/api/church-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          churchName,
          churchSlug: slug,
          email,
          password,
          openaiApiKey,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Could not register this church.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Church created. Sign in with the same email and password.");
        router.replace("/login");
        router.refresh();
        return;
      }

      router.replace("/operator-live");
      router.refresh();
    } catch {
      setError("Could not register this church.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Church name</span>
        <input
          type="text"
          name="churchName"
          autoComplete="organization"
          required
          maxLength={80}
          onChange={(event) => {
            if (!slugTouched) {
              setChurchSlug(suggestChurchSlug(event.target.value));
            }
          }}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Listen link</span>
        <input
          type="text"
          name="churchSlug"
          required
          value={churchSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setChurchSlug(event.target.value);
          }}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
        <span className="block text-xs text-slate-500">
          Phones will open{" "}
          <span className="font-mono">
            /listen/{churchSlug || "your-church"}
          </span>
        </span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">
          Operator email
        </span>
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
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">
          OpenAI API key
        </span>
        <input
          type="password"
          name="openaiApiKey"
          autoComplete="off"
          required
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
        <span className="block text-xs text-slate-500">
          Stored for this church only. It is not shown again.
        </span>
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
        {isSubmitting ? "Registering…" : "Register this church"}
      </button>
    </form>
  );
}
