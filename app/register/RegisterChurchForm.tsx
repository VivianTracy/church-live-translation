"use client";

import { useState } from "react";

export function RegisterChurchForm() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [churchNickname, setChurchNickname] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const churchName = String(formData.get("churchName") ?? "").trim();
    const nickname = String(formData.get("churchNickname") ?? "").trim();
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
          churchNickname: nickname,
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

      setSubmitted(true);
    } catch {
      setError("Could not register this church.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
        This church is waiting for confirmation. You will get an email when you
        can sign in.
      </p>
    );
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
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">
          Church brief name
        </span>
        <input
          type="text"
          name="churchNickname"
          required
          value={churchNickname}
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setChurchNickname(
              event.target.value.toLowerCase().replace(/\s+/g, "")
            );
          }}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
        <span className="block text-xs text-slate-500">
          No spaces. Phones will open{" "}
          <span className="font-mono">
            /listen/{churchNickname || "nickname"}
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
