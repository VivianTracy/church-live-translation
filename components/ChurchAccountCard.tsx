"use client";

import {
  MIN_CHURCH_PASSWORD_LENGTH,
  parseOperatorPassword,
} from "@/lib/churchRegister";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState } from "react";

type ChurchAccountCardProps = {
  churchName: string;
  keyLastFour: string | null;
  onChurchNameChange?: (name: string) => void;
};

export function ChurchAccountCard({
  churchName,
  keyLastFour,
  onChurchNameChange,
}: ChurchAccountCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [name, setName] = useState(churchName);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    setNewPassword("");
    setConfirmPassword("");
    setIsResettingPassword(false);
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

    const passwordEntered = newPassword.length > 0 || confirmPassword.length > 0;
    const wantsPasswordReset = isResettingPassword && passwordEntered;

    if (!body.churchName && !body.openaiApiKey && !wantsPasswordReset) {
      setError(
        isResettingPassword
          ? "Enter a new password."
          : "Change the church name, enter a new OpenAI key, or reset the password."
      );
      setIsSaving(false);
      return;
    }

    try {
      if (wantsPasswordReset) {
        const password = parseOperatorPassword(newPassword);

        if (!password) {
          setError(
            `Choose a password of at least ${MIN_CHURCH_PASSWORD_LENGTH} characters.`
          );
          return;
        }

        if (newPassword !== confirmPassword) {
          setError("The new passwords do not match.");
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const { error: passwordError } = await supabase.auth.updateUser({
          password,
        });

        if (passwordError) {
          setError("Could not reset the password. Try again.");
          return;
        }
      }

      if (body.churchName || body.openaiApiKey) {
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
      }

      setOpenaiApiKey("");
      setNewPassword("");
      setConfirmPassword("");
      setIsResettingPassword(false);
      setIsEditing(false);
      setSaved(wantsPasswordReset ? "Password reset." : "Saved.");
    } catch {
      setError("Could not save church settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <h2 className="text-base font-semibold text-slate-900">This church</h2>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            aria-label="Church name"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
          />

          <OpenAIKeyHint shownLastFour={shownLastFour} />

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

          {isResettingPassword ? (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  New password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
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
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_CHURCH_PASSWORD_LENGTH}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-emerald-600 focus:ring-2"
                />
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsResettingPassword(true);
              }}
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              Reset password
            </button>
          )}

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
          <OpenAIKeyHint shownLastFour={shownLastFour} />

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

function OpenAIKeyHint({ shownLastFour }: { shownLastFour: string | null }) {
  return (
    <p className="text-sm text-slate-600">
      OpenAI key{" "}
      <span className="font-mono text-slate-900">
        {shownLastFour ? `sk-…${shownLastFour}` : "Not saved yet"}
      </span>
    </p>
  );
}
