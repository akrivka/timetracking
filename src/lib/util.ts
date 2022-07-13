import { createSignal } from "solid-js";

export let delay: number = 0;

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

export function stringToColor(str: string) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var color = "rgba(";
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xff;
    color += value.toString() + ",";
  }
  color += "1)";
  return color;
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
