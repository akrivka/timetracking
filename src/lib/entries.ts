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

export function entryEquals(a: Entry, b: Entry): boolean {
  return (
    (a.before || "") === (b.before || "") &&
    (a.after || "") === (b.after || "") &&
    a.time.getTime() === b.time.getTime() &&
    a.id === b.id &&
    a.lastModified.getTime() === b.lastModified.getTime() &&
    a.deleted === b.deleted
  );
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
    if (y === undefined) return false;
    if (!entryEquals(x, y)) return false;
  }
  for (const y of ys) {
    const x = xMap.get(y.id);
    if (x === undefined) return false;
    if (!entryEquals(x, y)) return false;
  }

  return true;
}

export function* entriesIterator(
  entries: Entry[],
  { start, end }: { start: Date; end: Date }
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
  yield { time: end };
  for (const entry of entries) {
    if ((!start || entry.time >= start) && (!end || entry.time <= end))
      yield entry;
  }
  yield { time: start };
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

export function serializeEntries(entries: Entry[]): string {
  return JSON.stringify(
    entries.map((x) => ({
      time: x.time.getTime(),
      before: x.before,
      after: x.after,
      lastModified: x.lastModified.getTime(),
      deleted: x.deleted,
      id: x.id,
    }))
  );
}

export function deserializeEntries(s: string): Entry[] {
  const result: Entry[] = [];
  try {
    const json = JSON.parse(s);
    if (Array.isArray(json)) {
      for (const x of json) {
        const time: Date | undefined =
          typeof x.time == "number" ? new Date(x.time) : undefined;
        if (time === undefined) continue;
        const lastModified: Date =
          typeof x.lastModified == "number" ? new Date(x.lastModified) : now();
        const before: string | undefined =
          typeof x.before == "string" ? x.before : undefined;
        const after: string | undefined =
          typeof x.after == "string" ? x.after : undefined;
        const deleted: boolean =
          typeof x.deleted == "boolean" ? x.deleted : false;
        const id: string = typeof x.id == "string" ? x.id : newUID();
        result.push({
          time: time,
          lastModified: lastModified,
          before: before,
          after: after,
          deleted: deleted,
          id: id,
        });
      }
    }
  } finally {
    return result;
  }
}
