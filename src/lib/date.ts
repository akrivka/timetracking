import { MS_IN_HOURS } from "./constants";
import { DateSpec } from "./parse";
import { now } from "./util";

export function thisMonday(date = new Date()) {
  const day = date.getDay();
  const diff = (day === 0 ? 6 : day - 1) * 24 * 60 * 60 * 1000;
  const newDate = new Date(date.getTime() - diff);
  newDate.setHours(0);
  newDate.setMinutes(0);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
}

export function prevWeek(date = new Date()) {
  return thisMonday(new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000));
}

export function nextWeek(date = new Date()) {
  return thisMonday(new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000));
}

export function daysAfter(date = new Date(), n: number) {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

export function nextMidnight(date = new Date()) {
  const newDate = daysAfter(date, 1);
  newDate.setHours(0);
  newDate.setMinutes(0);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
}

export function msBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime());
}

export function hoursBetween(a: Date, b: Date) {
  return msBetween(a, b) / MS_IN_HOURS;
}

export function specToDate(
  spec: DateSpec,
  anchor: Date,
  rel: "next" | "previous" | "closest"
): Date {
  if (spec == "now") return now();
  const copiedAnchor = new Date(anchor);
  copiedAnchor.setMinutes(spec.minutes);
  let best: Date = new Date(anchor);
  let bestDiff: number | null = null;
  const month = spec.month === undefined ? anchor.getMonth() : spec.month;
  copiedAnchor.setMonth(month);
  const hours: number = spec.hours == 12 ? 0 : spec.hours;
  const year: number = spec.year || anchor.getFullYear();
  const dateCandidates: number[] =
    spec.day === undefined
      ? [-1, 0, 1].map((x) => anchor.getDate() + x)
      : [spec.day + (spec.dayOffset || 0)];
  const ampmCandidates: ("am" | "pm")[] =
    spec.ampm === undefined ? ["am", "pm"] : [spec.ampm];
  const hourCandidates: number[] = ampmCandidates.map((x) =>
    x == "am" ? hours : (hours + 12) % 24
  );
  for (const date of dateCandidates) {
    for (const hours of hourCandidates) {
      const candidate = new Date(copiedAnchor);
      candidate.setDate(date);
      candidate.setHours(hours);
      candidate.setFullYear(year);
      const diff = candidate.getTime() - anchor.getTime();
      const absDiff = Math.abs(diff);
      const isValid =
        rel == "closest" ||
        (rel == "next" && diff > 0) ||
        (rel == "previous" && diff < 0);
      if ((bestDiff == null || absDiff < bestDiff) && isValid) {
        best = new Date(candidate);
        bestDiff = absDiff;
      }
    }
  }
  return best;
}

export const fractionalHours = (d: Date) => d.getHours() + d.getMinutes() / 60;
