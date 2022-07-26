import axios from "axios";
import {
  batch,
  createComputed,
  createContext,
  createEffect,
  createResource,
  createSignal,
  onMount,
  startTransition,
  untrack,
  useContext,
} from "solid-js";
import {
  connectDB,
  getAllEntries,
  getAllEntriesModifiedAfter,
  putEntryLocal,
  removeEntryLocal,
  updateEntriesLocal,
} from "../lib/localDB";
import { createSyncedStoreArray } from "../lib/solid-ext";
import { insertIntoSortedDecreasingBy, now, revit } from "../lib/util";
import { useWindow } from "./WindowContext";
import { Credentials, useUser } from "./UserContext";
import { createStore } from "solid-js/store";
import { getEntriesRemote } from "../lib/remoteDB";

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

function* namesFrom(label: Label | undefined): Generator<Label> {
  if (label === undefined) return;
  const parts = label.split("/");
  for (let i = 0; i < parts.length; i++) {
    yield parts.slice(0, i + 1).join("/");
  }
}

//returns labels starting from the most recent
//TODO: can make faster
function getDistinctLabels(entries: Entry[]): Label[] {
  const seen: Set<string> = new Set();

  for (const entry of revit(entries)) {
    for (const name of namesFrom(entry.before)) seen.add(name);
    for (const name of namesFrom(entry.after)) seen.add(name);
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

export async function pushUpdates(credentials: Credentials) {
  const lastPushed = new Date(JSON.parse(localStorage.lastPushed || "0"));

  // get all local entries modified after lastPushed
  const entries = await getAllEntriesModifiedAfter(lastPushed);

  // serialize entries
  const s = serializeEntries(entries);

  // send to server using axios
  const response = await axios.post(
    "/api/update",
    "entries=" + encodeURIComponent(s),
    { params: credentials }
  );

  // update lastPushed
  localStorage.lastPushed = JSON.stringify(now().getTime());
}

export async function pullUpdates(credentials: Credentials) {
  const lastPulled = new Date(JSON.parse(localStorage.lastPulled || "0"));

  // pull all entries from the server modified after lastPulled

  const entries = await getEntriesRemote(
    { after: lastPulled.getTime() },
    credentials
  );

  updateEntriesLocal(entries);

  // change last pulled
  localStorage.lastPulled = JSON.stringify(now().getTime());
}

export async function fullValidate(credentials: Credentials) {
  const response = await axios.get("/api/entries", {
    params: credentials,
  });
  const remoteEntries = deserializeEntries(decodeURIComponent(response.data));
  const localEntries = await getAllEntries();

  return entrySetEquals(localEntries, remoteEntries);
}

type EntriesContextType = {
  entries: Entry[];
  labels: Label[];
  dispatch: (any) => any;
  syncState: any;
  forceSync: () => void;
};

const EntriesContext = createContext<EntriesContextType>();

export const EntriesProvider = (props) => {
  const { hasNetwork } = useWindow();
  const user = useUser();

  const loggedIn = () => user() && user().credentials;

  const [localDB, _] = createResource(connectDB);

  // set up synced SolidJS store with the local database
  const [
    entries,
    { update, initialized, querying, mutating, forceSync: storeForceSync },
  ] = createSyncedStoreArray<Entry>(localDB, {
    query: getAllEntries,
    equals: (entriesA, entriesB) => {
      const breakingIndex = entriesA.findIndex(
        (entryA, i) => !entryEquals(entryA, entriesB[i])
      );
      if (breakingIndex === -1) return true;
      else {
        const a = entriesA[breakingIndex],
          b = entriesB[breakingIndex];
        return [a, b];
      }
    },
  });

  const [labels, setLabels] = createStore([]);
  const updateLabels = () => {
    setLabels(getDistinctLabels(entries));
  };

  // remote signals
  const [syncingUp, setSyncingUp] = createSignal();
  const [syncingDown, setSyncingDown] = createSignal();

  const putEntries = async (_entries: (Partial<Entry> | undefined)[]) => {
    const newEntries = _entries.map((entry) => {
      const existingEntry = entries.find((e) => e.id === entry?.id);

      return {
        ...(existingEntry || makeEntry()),
        ...entry,
        lastModified: now(),
      };
    });

    await update({
      mutate: () =>
        Promise.all(newEntries.map((newEntry) => putEntryLocal(newEntry))),
      expect: (set) => {
        set(
          newEntries.reduce((es, newEntry) => {
            const fes = es.filter((e) => e.id !== newEntry.id);
            if (newEntry.deleted) return fes;
            else
              return insertIntoSortedDecreasingBy(
                fes,
                (e) => e.time.getTime(),
                newEntry
              );
          }, entries)
        );
      },
    });

    updateLabels();

    if (hasNetwork() && loggedIn()) {
      setSyncingUp(true);
      await pushUpdates(user().credentials);
      setSyncingUp(false);
    }
  };

  const putEntry = (entry: Partial<Entry> | undefined) => putEntries([entry]);

  const dispatch = async ([event, info]) => {
    const { start, end, entry, label, time } = info;

    let updatedEntries = [];
    switch (event) {
      case "append":
        updatedEntries.push(entry);
        break;
      case "insert":
        updatedEntries.push(entry);
        entry.before &&
          start &&
          updatedEntries.push({ ...start, after: entry.before });
        entry.after &&
          end &&
          updatedEntries.push({ ...end, before: entry.after });
        break;
      case "adjustTime":
        updatedEntries.push({ ...entry, time });
        break;
      case "relabel":
        end && updatedEntries.push({ ...end, before: label });
        start && updatedEntries.push({ ...start, after: label });
        break;
      case "delete":
        updatedEntries.push({ ...entry, deleted: true });
        break;
      case "deleteRelabel":
        updatedEntries.push({ ...entry, deleted: true });
        end && updatedEntries.push({ ...end, before: label });
        start && updatedEntries.push({ ...start, after: label });
        break;
      case "bulkRename":
        // info.oldLabel, info.newLabel
        break;
    }

    await putEntries(updatedEntries);
  };

  const forceSync = async () => {
    storeForceSync();

    delete localStorage.lastPushed;
    delete localStorage.lastPulled;
    setSyncingDown(true);
    await pullUpdates(user().credentials);
    setSyncingDown(false);
    setSyncingUp(true);
    await pushUpdates(user().credentials);
    setSyncingUp(false);
    localStorage.lastPushed = JSON.stringify(now().getTime());
    localStorage.lastPulled = JSON.stringify(now().getTime());
    return null;
  };

  const syncState = {
    local: { initialized, querying, mutating },
    remote: { loggedIn, syncingUp, syncingDown },
  };

  createEffect(() => {
    if (initialized()) {
      if (hasNetwork() && loggedIn()) {
        untrack(forceSync);
      }
      updateLabels();
    }
  });

  return (
    <EntriesContext.Provider
      value={{
        entries,
        labels,
        dispatch,
        forceSync,
        syncState,
      }}
    >
      {props.children}
    </EntriesContext.Provider>
  );
};

export const useEntries = () => useContext(EntriesContext);
