export function thisMonday(date = new Date()) {
  const day = date.getDay();
  const diff = (day === 0 ? 6 : day - 1) * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() - diff);
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

export function msBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime());
}
