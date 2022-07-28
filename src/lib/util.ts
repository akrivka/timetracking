import { createSignal } from "solid-js";

export let delay: number = 500;

export function setDelay(ms: number) {
  delay = ms;
}

export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function now(): Date {
  return new Date();
}

export function nowTime() {
  const [time, setTime] = createSignal(now().getTime());
  // set timeout
  setTimeout(() => setTime(now().getTime()), 1000);
}

export function hash(s: string): number {
  var hash: number = 0;
  for (var i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
  }
  return hash;
}

export function hashPassword(password: string): string {
  return hash(password).toString(16);
}

export function* it<T>(xs: T[]): Generator<T> {
  for (let i = 0; i < xs.length; i++) {
    yield xs[i];
  }
}
export function* revit<T>(xs: T[], limit?: number): Generator<T> {
  const bottom = limit == undefined ? 0 : xs.length - limit;
  for (let i = xs.length - 1; i >= bottom; i--) {
    yield xs[i];
  }
}

export function minutesAfter(a: Date, n: number): Date {
  const result = new Date(a);
  result.setMinutes(result.getMinutes() + n);
  return result;
}

export function* listPairsAndEnds<T>(
  xs: Generator<T>
): Generator<[T | null, T | null]> {
  let a: T | null = null;
  let b: T | null = null;
  for (const x of xs) {
    a = b;
    b = x;
    yield [a, b];
  }
  if (b != null) yield [b, null];
}

export function* listPairs<T>(xs: Generator<T>): Generator<[T, T]> {
  for (const [x, y] of listPairsAndEnds(xs)) {
    if (x != null && y != null) yield [x, y];
  }
}

export function insertIntoSortedDecreasingBy<T>(
  array: T[],
  by: (item: T) => number,
  item: T
): T[] {
  const index = array.findIndex((x) => by(item) > by(x));
  if (index == -1) return [...array, item];
  return [...array.slice(0, index), item, ...array.slice(index)];
}

export const isIterable = (value) => {
  return Symbol.iterator in Object(value);
};
