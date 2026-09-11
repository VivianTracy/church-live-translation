"use client";

import { useState } from "react";

type ConfirmChurchFormProps = {
  token: string;
  churchName: string;
};

export function ConfirmChurchForm({
  token,
  churchName,
}: ConfirmChurchFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"confirmed" | "already" | null>(null);
  const [emailedOperator, setEmailedOperator] = useState(true);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/church-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json()) as {
        error?: string;
        alreadyConfirmed?: boolean;
        emailedOperator?: boolean;
      };

      if (!response.ok) {
        setError(body.error ?? "Could not confirm this church.");
        return;
      }

      setEmailedOperator(body.emailedOperator !== false);
      setResult(body.alreadyConfirmed ? "already" : "confirmed");
    } catch {
      setError("Could not confirm this church.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {result === "already"
            ? `${churchName} is already confirmed. They can sign in.`
            : `${churchName} is confirmed. They can sign in now.`}
        </p>
        {result === "confirmed" && !emailedOperator ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            We could not email the operator. Tell them they can sign in with the
            email and password they registered.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        {isSubmitting ? "Confirming…" : "Confirm this church"}
      </button>
    </form>
  );
}
