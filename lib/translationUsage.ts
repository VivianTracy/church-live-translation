import { startOfZonedDay, startOfZonedMonth } from "@/lib/zonedTime";

export type TranslationUsageEvent = {
  createdAt: string;
};

export type TranslationUsageSummary = {
  sessionsToday: number;
  sessionsThisMonth: number;
  lastStartedAt: string | null;
};

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
    sessionsToday: events.filter(
      (event) => Date.parse(event.createdAt) >= todayStart
    ).length,
    sessionsThisMonth: events.filter(
      (event) => Date.parse(event.createdAt) >= monthStart
    ).length,
    lastStartedAt: lastStartedAt ?? latestFromEvents,
  };
}

export function formatSessionCount(count: number): string {
  return count === 1 ? "1 session" : `${count} sessions`;
}
