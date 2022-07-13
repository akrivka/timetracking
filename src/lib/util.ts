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