import { it, now } from "./util";

export type uid = string;

export type Label = string;

export interface Entry {
  before?: string; // label of the interval before
  after?: string; // label of the interval after
  time: Date; // time of the time mark
  id: uid; // unique id of the entry (random, not auto incremented)
  lastModified: Date; // last time the entry was modified, for syncing purposes
  deleted: boolean;
}

function newUID(): uid {
  return Math.random().toString(36).substring(2, 10);
}

export function makeEntry(): Entry {
  return {
    before: "",
    after: "",
    time: new Date(),
    id: newUID(),
    lastModified: new Date(),
    deleted: false,
  };
}

export function entryEquals(a: Entry, b: Entry) {
  if ((a.before || "") !== (b.before || "")) {
    return [a, b, "before", a.before, b.before];
  } else if ((a.after || "") !== (b.after || "")) {
    return [a, b, "after", a.after, b.after];
  } else if (a.time.getTime() !== b.time.getTime()) {
    return [a, b, "time"];
  } else if (a.id !== b.id) {
    return [a, b, "id", a.id, b.id];
  } else if (a.lastModified.getTime() !== b.lastModified.getTime()) {
    return [
      a,
      b,
      "lastModified",
      a.lastModified.getTime(),
      b.lastModified.getTime(),
    ];
  } else if (a.deleted !== b.deleted) {
    return [a, b, "deleted", a.deleted, b.deleted];
  } else {
    return true;
  }
}

function pretifyEntry(entry: Entry) {
  return `[${entry.id}, ${entry.time.toISOString()}, ${entry.before}, ${
    entry.after
  }, ${entry.deleted}, ${entry.lastModified.toISOString()}]`;
}

export function entrySetEquals(xs: Entry[], ys: Entry[]) {
  function makeMap(entries: Entry[]): Map<uid, Entry> {
    const result = new Map();
    for (const entry of entries) {
      result.set(entry.id, entry);
    }
    return result;
  }

  const xMap: Map<uid, Entry> = makeMap(xs);
  const yMap: Map<uid, Entry> = makeMap(ys);

  for (const x of xs) {
    const y = yMap.get(x.id);
    if (y === undefined) return pretifyEntry(x) + " not found (x)";
    const eq = entryEquals(x, y);
    if (eq !== true) return eq;
  }
  for (const y of ys) {
    const x = xMap.get(y.id);
    if (x === undefined) return pretifyEntry(y) + " not found (y)";
    const eq = entryEquals(x, y);
    if (eq !== true) return eq;
  }

  return true;
}

export function* entriesIterator(
  entries: Entry[],
  { start, end }: { start?: Date; end?: Date }
): Generator<Entry> {
  for (const entry of entries) {
    if ((!start || entry.time >= start) && (!end || entry.time <= end))
      yield entry;
  }
}

export function* entriesIteratorWithEnds(
  entries: Entry[],
  { start, end }: { start: Date; end: Date }
): Generator<Partial<Entry>> {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const prevEntry = i > 0 ? entries[i - 1] : null;
    const nextEntry = i < entries.length - 1 ? entries[i + 1] : null;

    // no boundaries
    if (!end && !start) yield entry;

    // on boundaries
    if (end && nextEntry && nextEntry.time < end && entry.time >= end) {
      yield { ...entry, time: end };
    }
    if (start && prevEntry && entry.time <= start && prevEntry.time > start)
      yield { ...entry, time: start };

    if ((!start || entry.time >= start) && (!end || entry.time <= end)) {
      if (i == 0) yield { time: end };
      yield entry;
    }
  }
}

export function labelFrom(a: Partial<Entry>, b: Partial<Entry>): string {
  if (!a?.after && !b?.before) return "?unlabeled";
  if (!a?.after) {
    if (!b?.before) return "?unlabeled";
    return b?.before;
  } else {
    if (!b?.before) return a.after;
    if (b?.before !== a?.after) return `?conflict-${a?.after}-${b?.before}`;
    return a?.after;
  }
}

function* namesFrom(label: Label | undefined): Generator<Label> {
  if (label === undefined) return;
  const parts = label.split("/");
  for (let i = 0; i < parts.length; i++) {
    yield parts.slice(0, i + 1).join("/");
  }
}

//returns labels starting from the most recent
//TODO: can make faster
export function getDistinctLabels(entries: Entry[]): Label[] {
  const seen: Set<string> = new Set();

  for (const entry of it(entries)) {
    for (const name of namesFrom(entry.before)) seen.add(name.trim());
    for (const name of namesFrom(entry.after)) seen.add(name.trim());
  }
  return [...seen];
}

export function preserializeEntry(x: Entry) {
  return {
    time: x.time.getTime(),
    before: x.before,
    after: x.after,
    lastModified: x.lastModified.getTime(),
    deleted: x.deleted,
    id: x.id,
  };
}

export function serializeEntries(entries: Entry[]): string {
  return JSON.stringify(entries.map((x) => preserializeEntry(x)));
}

export function parseEntry(x): Entry {
  const time: Date | undefined =
    typeof x.time == "number" ? new Date(x.time) : undefined;
  const lastModified: Date =
    typeof x.lastModified == "number" ? new Date(x.lastModified) : now();
  const before: string | undefined =
    typeof x.before == "string" ? x.before : undefined;
  const after: string | undefined =
    typeof x.after == "string" ? x.after : undefined;
  const deleted: boolean = typeof x.deleted == "boolean" ? x.deleted : false;
  const id: string = typeof x.id == "string" ? x.id : newUID();
  return {
    time,
    lastModified,
    before,
    after,
    deleted,
    id,
  };
}

export function deserializeEntries(s: string): Entry[] {
  const result: Entry[] = [];
  try {
    const json = JSON.parse(s);
    if (Array.isArray(json)) {
      for (const x of json) {
        result.push(parseEntry(x));
      }
    }
  } finally {
    return result;
  }
}

export function mergeEntries(xs: Entry[], ys: Entry[]) {
  function makeMap(entries: Entry[]): Map<uid, Entry> {
    const result = new Map();
    for (const entry of entries) {
      result.set(entry.id, entry);
    }
    return result;
  }
  const xMap: Map<uid, Entry> = makeMap(xs);
  const yMap: Map<uid, Entry> = makeMap(ys);
  const merged: Entry[] = [];
  const xUpdates: Entry[] = [];
  const yUpdates: Entry[] = [];
  for (const entry of xs) {
    const other = yMap.get(entry.id);
    if (
      other == undefined ||
      other.lastModified.getTime() < entry.lastModified.getTime()
    ) {
      yUpdates.push(entry);
      merged.push(entry);
    }
    if (
      other !== undefined &&
      other.lastModified.getTime() == entry.lastModified.getTime()
    ) {
      merged.push(entry);
    }
  }
  for (const entry of ys) {
    const other = xMap.get(entry.id);
    if (
      other == undefined ||
      other.lastModified.getTime() < entry.lastModified.getTime()
    ) {
      xUpdates.push(entry);
      merged.push(entry);
    }
  }
  return [xUpdates, yUpdates];
}
