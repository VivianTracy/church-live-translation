"use client";

import {
  loadServiceContext,
  saveServiceContext,
} from "@/lib/serviceContextApi";
import { useEffect, useState } from "react";

const MAX_SERMON_LENGTH = 16000;

type SermonContextCardProps = {
  onContextSaved?: () => void;
};

export function SermonContextCard({ onContextSaved }: SermonContextCardProps) {
  const [draftText, setDraftText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    loadServiceContext()
      .then((context) => {
        if (cancelled) {
          return;
        }

        setDraftText(context.sermonText);
        setSavedText(context.sermonText);
        setSavedAt(context.updatedAt || null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        console.error(loadError);
        setError("Could not load saved sermon context.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasUnsavedChanges = draftText.trim() !== savedText.trim();
  const isOverLimit = draftText.length > MAX_SERMON_LENGTH;
  const hasSavedContext = savedText.trim().length > 0;

  const handleSave = async () => {
    if (isOverLimit) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const context = await saveServiceContext(draftText);
      setDraftText(context.sermonText);
      setSavedText(context.sermonText);
      setSavedAt(context.updatedAt || Date.now());
      onContextSaved?.();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save sermon context.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    setError("");

    try {
      const context = await saveServiceContext("");
      setDraftText("");
      setSavedText("");
      setSavedAt(context.updatedAt || Date.now());
      onContextSaved?.();
    } catch (clearError) {
      console.error(clearError);
      setError("Could not clear sermon context.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 space-y-5">
      <div className="space-y-2 text-center">
        <p className="text-sm font-bold tracking-widest text-slate-500">
          SERVICE PREP
        </p>
        <h2 className="text-2xl font-bold">Sermon Manuscript</h2>
        <p className="text-sm text-slate-600">
          Paste the Chinese sermon before worship. This helps translation stay
          accurate and consistent. It is not shown to the audience.
        </p>
      </div>

      <textarea
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        disabled={isLoading || isSaving}
        placeholder="Paste the Chinese sermon manuscript or outline here..."
        className="h-48 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {isLoading
            ? "Loading saved context..."
            : hasSavedContext
              ? `Saved (${savedText.trim().length.toLocaleString()} characters)`
              : "No sermon context saved yet"}
        </p>
        <p className={isOverLimit ? "font-semibold text-red-700" : undefined}>
          {draftText.length.toLocaleString()} / {MAX_SERMON_LENGTH.toLocaleString()}
        </p>
      </div>

      {savedAt ? (
        <p className="text-xs text-slate-500">
          Last saved: {new Date(savedAt).toLocaleString()}
        </p>
      ) : null}

      {hasUnsavedChanges ? (
        <p className="text-sm font-medium text-amber-700">
          Unsaved changes. Save before worship so translation uses the latest
          manuscript.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isSaving || isOverLimit || !hasUnsavedChanges}
          className="rounded-2xl bg-slate-900 px-6 py-4 text-lg font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Saving..." : "Save Sermon Context"}
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={isLoading || isSaving || !hasSavedContext}
          className="rounded-2xl border border-slate-300 bg-white px-6 py-4 text-lg font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear Saved Context
        </button>
      </div>
    </section>
  );
}
