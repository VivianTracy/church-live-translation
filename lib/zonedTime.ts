function readPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  return Number(parts.find((part) => part.type === type)?.value);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(value: string | null | undefined): string {
  const timeZone = value?.trim();

  if (!timeZone || !isValidTimeZone(timeZone)) {
    return "UTC";
  }

  return timeZone;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const asUtc = Date.UTC(
    readPart(parts, "year"),
    readPart(parts, "month") - 1,
    readPart(parts, "day"),
    readPart(parts, "hour"),
    readPart(parts, "minute"),
    readPart(parts, "second")
  );

  return asUtc - date.getTime();
}

export function zonedLocalTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const instant = utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - getTimeZoneOffsetMs(new Date(instant), timeZone));
}

export function startOfZonedDay(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  return zonedLocalTimeToUtc(
    timeZone,
    readPart(parts, "year"),
    readPart(parts, "month"),
    readPart(parts, "day")
  );
}

export function startOfZonedMonth(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  return zonedLocalTimeToUtc(
    timeZone,
    readPart(parts, "year"),
    readPart(parts, "month"),
    1
  );
}
