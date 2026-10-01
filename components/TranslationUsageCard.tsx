"use client";

import { formatMinutes } from "@/lib/translationUsage";
import { useEffect, useState } from "react";

type UsageResponse = {
  mode?: "local" | "church";
  minutesToday?: number;
  minutesThisMonth?: number;
  lastStartedAt?: string | null;
  error?: string;
};

type TranslationUsageCardProps = {
  refreshKey?: string;
};

function formatLastStarted(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TranslationUsageCard({ refreshKey }: TranslationUsageCardProps) {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const controller = new AbortController();

    const loadUsage = () => {
      void fetch(
        `/api/operator/usage?timeZone=${encodeURIComponent(timeZone)}`,
        { cache: "no-store", signal: controller.signal }
      )
        .then(async (response) => {
          const body = (await response.json()) as UsageResponse;

          if (!response.ok) {
            throw new Error(body.error ?? "Could not load church usage.");
          }

          setUsage(body);
          setError("");
        })
        .catch((loadError: unknown) => {
          if (controller.signal.aborted) {
            return;
          }

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load church usage."
          );
        });
    };

    loadUsage();
    const timer = window.setInterval(loadUsage, 30_000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refreshKey]);

  if (usage?.mode === "local") {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">
        Translation used
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Minutes this church has been translating. This is not the OpenAI dollar
        balance.
      </p>

      {error ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          {error}
        </p>
      ) : usage ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Today</dt>
            <dd className="font-medium text-slate-900">
              {formatMinutes(usage.minutesToday ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">This month</dt>
            <dd className="font-medium text-slate-900">
              {formatMinutes(usage.minutesThisMonth ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Last started</dt>
            <dd className="font-medium text-slate-900">
              {usage.lastStartedAt
                ? formatLastStarted(usage.lastStartedAt)
                : "Not yet"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Loading usage…</p>
      )}
    </section>
  );
}
