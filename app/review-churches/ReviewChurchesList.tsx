"use client";

import { useEffect, useState } from "react";

type PendingChurch = {
  churchId: string;
  churchName: string;
  churchSlug: string;
  operatorEmail: string;
  keyLastFour: string | null;
};

type ChurchReviewState = {
  confirmingId: string;
  error: string;
  confirmedName: string;
  emailedOperator: boolean;
};

export function ReviewChurchesList() {
  const [churches, setChurches] = useState<PendingChurch[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [review, setReview] = useState<ChurchReviewState>({
    confirmingId: "",
    error: "",
    confirmedName: "",
    emailedOperator: true,
  });

  useEffect(() => {
    void fetch("/api/church-reviews", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as {
          error?: string;
          churches?: PendingChurch[];
        };

        if (!response.ok) {
          setLoadError(body.error ?? "Could not load churches to review.");
          setChurches([]);
          return;
        }

        setChurches(body.churches ?? []);
      })
      .catch(() => {
        setLoadError("Could not load churches to review.");
        setChurches([]);
      });
  }, []);

  async function confirmChurch(church: PendingChurch) {
    setReview({
      confirmingId: church.churchId,
      error: "",
      confirmedName: "",
      emailedOperator: true,
    });

    try {
      const response = await fetch("/api/church-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ churchId: church.churchId }),
      });
      const body = (await response.json()) as {
        error?: string;
        churchName?: string;
        emailedOperator?: boolean;
      };

      if (!response.ok) {
        setReview({
          confirmingId: "",
          error: body.error ?? "Could not confirm this church.",
          confirmedName: "",
          emailedOperator: true,
        });
        return;
      }

      setChurches(
        (current) =>
          current?.filter((item) => item.churchId !== church.churchId) ?? []
      );
      setReview({
        confirmingId: "",
        error: "",
        confirmedName: body.churchName ?? church.churchName,
        emailedOperator: body.emailedOperator !== false,
      });
    } catch {
      setReview({
        confirmingId: "",
        error: "Could not confirm this church.",
        confirmedName: "",
        emailedOperator: true,
      });
    }
  }

  if (churches === null) {
    return <p className="text-sm text-slate-500">Loading churches…</p>;
  }

  if (loadError) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {review.confirmedName ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {review.confirmedName} is confirmed.
          {review.emailedOperator
            ? " They can sign in now."
            : " Tell them they can sign in with the email and password they registered."}
        </p>
      ) : null}

      {review.error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {review.error}
        </p>
      ) : null}

      {churches.length === 0 ? (
        <p className="text-sm text-slate-600">
          No churches are waiting for confirmation.
        </p>
      ) : (
        churches.map((church) => (
          <article
            key={church.churchId}
            className="space-y-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-slate-200"
          >
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-slate-700">Church name</dt>
                <dd className="text-slate-900">{church.churchName}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Brief name</dt>
                <dd className="font-mono text-slate-900">{church.churchSlug}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Operator email</dt>
                <dd className="text-slate-900">
                  {church.operatorEmail || "Not available"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">OpenAI key</dt>
                <dd className="text-slate-900">
                  {church.keyLastFour ? `Ending ${church.keyLastFour}` : "Saved"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={review.confirmingId === church.churchId}
              onClick={() => {
                void confirmChurch(church);
              }}
              className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {review.confirmingId === church.churchId
                ? "Confirming…"
                : "Confirm this church"}
            </button>
          </article>
        ))
      )}
    </div>
  );
}
