"use client";

import { useState } from "react";

type ChurchAccountCardProps = {
  churchName: string;
  churchSlug: string;
  keyLastFour: string | null;
  onChurchNameChange?: (name: string) => void;
};

export function ChurchAccountCard({
  churchName,
  churchSlug,
  keyLastFour,
  onChurchNameChange,
}: ChurchAccountCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(churchName);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shownLastFour, setShownLastFour] = useState(keyLastFour);

  function startEditing() {
    setError("");
    setSaved("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setName(churchName);
    setOpenaiApiKey("");
    setError("");
    setSaved("");
    setIsEditing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved("");
    setIsSaving(true);

    const body: { churchName?: string; openaiApiKey?: string } = {};

    if (name.trim() && name.trim() !== churchName) {
      body.churchName = name.trim();
    }

    if (openaiApiKey.trim()) {
      body.openaiApiKey = openaiApiKey.trim();
    }

    if (!body.churchName && !body.openaiApiKey) {
      setError("Change the church name or enter a new OpenAI key.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/operator/church", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        error?: string;
        churchName?: string;
        keyLastFour?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Could not save church settings.");
        return;
      }

      if (result.churchName) {
        onChurchNameChange?.(result.churchName);
        setName(result.churchName);
      }

      if (result.keyLastFour) {
        setShownLastFour(result.keyLastFour);
      }

      setOpenaiApiKey("");
      setIsEditing(false);
      setSaved("Saved.");
    } catch {
      setError("Could not save church settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">This church</h2>
        <p className="mt-1 text-sm text-slate-600">
          Listen link and OpenAI key for this church. Phone listeners do not
          sign in.
        </p>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
            />
          </label>

          <ChurchSummary
            churchSlug={churchSlug}
            shownLastFour={shownLastFour}
          />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Replace OpenAI key
            </span>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(event) => setOpenaiApiKey(event.target.value)}
              autoComplete="off"
              placeholder="Paste a new key only to replace it"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
            />
          </label>

          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={cancelEditing}
              className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Name <span className="font-medium text-slate-900">{name}</span>
          </p>

          <ChurchSummary
            churchSlug={churchSlug}
            shownLastFour={shownLastFour}
          />

          {saved ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              {saved}
            </p>
          ) : null}

          <button
            type="button"
            onClick={startEditing}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Change church settings
          </button>
        </div>
      )}
    </section>
  );
}

function ChurchSummary({
  churchSlug,
  shownLastFour,
}: {
  churchSlug: string;
  shownLastFour: string | null;
}) {
  return (
    <>
      <p className="text-sm text-slate-600">
        Listen link{" "}
        <span className="font-mono text-slate-900">/listen/{churchSlug}</span>
      </p>

      <p className="text-sm text-slate-600">
        OpenAI key{" "}
        <span className="font-mono text-slate-900">
          {shownLastFour ? `sk-…${shownLastFour}` : "Not saved yet"}
        </span>
      </p>
    </>
  );
}
