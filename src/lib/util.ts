
export let delay: number = 0;

export function setDelay(ms: number) {
  delay = ms;
}

export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function twoDigits(n: number): string {
  const s = `${n}`;
  if (s.length == 1) {
    return "0" + s;
  } else {
    return s;
  }
}

interface MyDate {
  year: number;
  month: string;
  day: number;
  ampm: "am" | "pm";
  hour: number;
  minute: number;
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function renderMonth(d: Date): string {
  return months[d.getMonth()];
}

function convertDate(d: Date): MyDate {
  return {
    year: d.getFullYear(),
    //month: d.toLocaleString('default', {month: 'short'}),
    month: renderMonth(d),
    day: d.getDate(),
    hour: ((d.getHours() + 11) % 12) + 1,
    ampm: d.getHours() < 12 ? "am" : "pm",
    minute: d.getMinutes(),
  };
}

export function renderTime(date: Date): string {
  const now = convertDate(new Date());
  const myDate = convertDate(date);
  function renderTime(d: MyDate) {
    return `${d.hour}:${twoDigits(d.minute)}`;
  }
  function renderAMPM(d: MyDate) {
    return `${renderTime(d)} ${d.ampm == "am" ? "AM" : "PM"}`;
  }
  function renderDay(d: MyDate, prefix: string) {
    return `${prefix || renderAMPM(d) + ","} ${d.month} ${d.day}`;
  }
  function renderYear(d: MyDate, prefix: string) {
    return `${renderDay(d, prefix)}, ${d.year}`;
  }
  //const isMidnight = (myDate.ampm == 'am' && myDate.hour == 12 && myDate.minute == 0)
  const prefix = renderAMPM(myDate) + ",";
  if (now.year != myDate.year) return renderYear(myDate, prefix);
  else if (now.month != myDate.month || now.day != myDate.day)
    return renderDay(myDate, prefix);
  else if (now.ampm != myDate.ampm || myDate.hour == 12)
    return renderAMPM(myDate);
  else return renderTime(myDate);
}

export function renderDuration(ms: number): string {
  if (ms < 0) {
    return `-${renderDuration(-ms)}`;
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const s = Math.floor(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  const minutes = Math.round(s / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h:${twoDigits(m)}m`;
}

export function now(): Date {
  return new Date();
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

export function hash(s:string):number{
  var hash:number = 0;
  for (var i = 0; i < s.length; i++) {
      hash = ((hash<<5)-hash)+s.charCodeAt(i)
  }
  return hash
}

export function hashPassword(password: string): string {
  return hash(password).toString(16);
}
