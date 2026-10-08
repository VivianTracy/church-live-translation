"use client";

import { OPERATOR_LIVE_PATH } from "@/lib/operatorRoutes";
import {
  TRANSLATION_LANGUAGES,
  TRANSLATION_LANGUAGE_LABELS,
  translationLanguagesMatch,
  type TranslationLanguageCode,
} from "@/lib/translationLanguages";
import Link from "next/link";

type TranslationLanguageCardProps = {
  sermonLanguage: TranslationLanguageCode;
  headsetLanguage: TranslationLanguageCode;
  disabled?: boolean;
  onSermonLanguageChange: (language: TranslationLanguageCode) => void;
  onHeadsetLanguageChange: (language: TranslationLanguageCode) => void;
};

function LanguageSelect({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: TranslationLanguageCode;
  disabled?: boolean;
  onChange: (language: TranslationLanguageCode) => void;
}) {
  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as TranslationLanguageCode)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {TRANSLATION_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {TRANSLATION_LANGUAGE_LABELS[language]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TranslationLanguageCard({
  sermonLanguage,
  headsetLanguage,
  disabled = false,
  onSermonLanguageChange,
  onHeadsetLanguageChange,
}: TranslationLanguageCardProps) {
  const sameLanguage = translationLanguagesMatch(sermonLanguage, headsetLanguage);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">1. Languages</h2>
        <p className="text-sm text-slate-600">
          Sermon language is what you expect to hear. Headset language is what
          listeners hear. The translator will recognize the spoken language
          on its own.
        </p>
      </div>

      <LanguageSelect
        id="sermon-language"
        label="Sermon language"
        value={sermonLanguage}
        disabled={disabled}
        onChange={onSermonLanguageChange}
      />

      <LanguageSelect
        id="headset-language"
        label="Headset language"
        value={headsetLanguage}
        disabled={disabled}
        onChange={onHeadsetLanguageChange}
      />

      {sameLanguage ? (
        <p className="text-sm text-amber-800">
          Choose a different headset language. Listeners already hear the
          sermon language, so translation would stay quiet.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Selected: {TRANSLATION_LANGUAGE_LABELS[sermonLanguage]} in →{" "}
          {TRANSLATION_LANGUAGE_LABELS[headsetLanguage]} out
        </p>
      )}

      <p className="text-xs text-slate-500">
        <Link href={OPERATOR_LIVE_PATH} className="font-medium text-emerald-800">
          Chinese and English
        </Link>{" "}
        keeps the original operator page.
      </p>
    </div>
  );
}
