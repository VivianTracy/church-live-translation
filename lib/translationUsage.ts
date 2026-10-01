import { startOfZonedDay, startOfZonedMonth } from "@/lib/zonedTime";

export const MAX_SESSION_DURATION_SECONDS = 24 * 60 * 60;

export type TranslationUsageEvent = {
  createdAt: string;
  durationSeconds: number | null;
};

export type TranslationUsageSummary = {
  minutesToday: number;
  minutesThisMonth: number;
  lastStartedAt: string | null;
};

export function normalizeDurationSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const seconds = Math.round(value);

  if (seconds < 0 || seconds > MAX_SESSION_DURATION_SECONDS) {
    return null;
  }

  return seconds;
}

function minutesFromSeconds(totalSeconds: number): number {
  return Math.floor(Math.max(0, totalSeconds) / 60);
}

function secondsInWindow(
  events: TranslationUsageEvent[],
  startMs: number
): number {
  return events
    .filter((event) => Date.parse(event.createdAt) >= startMs)
    .reduce((total, event) => total + (event.durationSeconds ?? 0), 0);
}

export function summarizeTranslationUsage(
  events: TranslationUsageEvent[],
  now: Date,
  timeZone: string,
  lastStartedAt?: string | null
): TranslationUsageSummary {
  const todayStart = startOfZonedDay(now, timeZone).getTime();
  const monthStart = startOfZonedMonth(now, timeZone).getTime();
  const latestFromEvents = events.reduce<string | null>((latest, event) => {
    if (!latest || event.createdAt > latest) {
      return event.createdAt;
    }

    return latest;
  }, null);

  return {
    minutesToday: minutesFromSeconds(secondsInWindow(events, todayStart)),
    minutesThisMonth: minutesFromSeconds(secondsInWindow(events, monthStart)),
    lastStartedAt: lastStartedAt ?? latestFromEvents,
  };
}

export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 1) {
    return "0 min";
  }

  if (totalMinutes < 60) {
    return totalMinutes === 1 ? "1 min" : `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = hours === 1 ? "1 hr" : `${hours} hr`;

  if (minutes === 0) {
    return hourLabel;
  }

  return `${hourLabel} ${minutes} min`;
}

export function isSessionEventId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}
