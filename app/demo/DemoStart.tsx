"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

let demoLoginInFlight: Promise<{ ok: boolean; error?: string }> | null = null;

function startDemoLogin() {
  if (!demoLoginInFlight) {
    demoLoginInFlight = fetch("/api/demo/login", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        return {
          ok: response.ok,
          error: body.error,
        };
      })
      .finally(() => {
        demoLoginInFlight = null;
      });
  }

  return demoLoginInFlight;
}

export function DemoStart() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError("");

      try {
        const result = await startDemoLogin();

        if (!result.ok) {
          if (!cancelled) {
            setError(result.error ?? "Could not start the demo.");
          }
          return;
        }

        if (!cancelled) {
          router.replace("/operator-live");
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setError("Could not start the demo.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800"
        >
          Try the demo again
        </button>
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-emerald-800">
            Church sign in
          </Link>
        </p>
      </div>
    );
  }

  return <p className="text-sm text-slate-500">Signing in to the demo…</p>;
}
