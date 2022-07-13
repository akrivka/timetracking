import axios from "axios";
import {
  createComputed,
  createContext,
  createEffect,
  createResource,
  createSignal,
  onMount,
  useContext,
} from "solid-js";
import { getLocalCredentials } from "../lib/auth";
import {
  connectDB,
  getAllEntries,
  getAllEntriesModifiedAfter,
  putEntryLocal,
  removeEntryLocal,
  updateEntriesLocal,
} from "../lib/localDB";
import { createSyncedStoreArray } from "../lib/solid-ext";
import { now } from "../lib/util";
import { useNetwork } from "./NetworkContext";
import { useUser } from "./UserContext";

export type uid = string;

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

export async function pushUpdates() {
  const lastPushed = new Date(JSON.parse(localStorage.lastPushed || "0"));

  // get all local entries modified after lastPushed
  const entries = await getAllEntriesModifiedAfter(lastPushed);

  // serialize entries
  const s = serializeEntries(entries);

  // send to server using axios
  const credentials = getLocalCredentials();
  const response = await axios.post(
    "/api/update",
    "entries=" + encodeURIComponent(s),
    { params: credentials }
  );

  // update lastPushed
  localStorage.lastPushed = JSON.stringify(now().getTime());
}

export async function pullUpdates() {
  const lastPulled = new Date(JSON.parse(localStorage.lastPulled || "0"));

  // pull all entries from the server modified after lastPulled
  const credentials = getLocalCredentials();

  const response = await axios.get("/api/entries", {
    params: { ...credentials, after: lastPulled.getTime() },
  });

  // store entries in localDB
  const entries = deserializeEntries(decodeURIComponent(response.data));

  updateEntriesLocal(entries);

  // change last pulled
  localStorage.lastPulled = JSON.stringify(now().getTime());
}

export async function fullValidate() {
  const credentials = getLocalCredentials();
  const response = await axios.get("/api/entries", {
    params: credentials,
  });
  const remoteEntries = deserializeEntries(decodeURIComponent(response.data));
  const localEntries = await getAllEntries();

  return entrySetEquals(localEntries, remoteEntries);
}

type EntriesContextType = {
  entries: Entry[];
  addEntry: (entry: Partial<Entry>) => void;
  updateEntry: (id: uid, entry: Partial<Entry>) => void;
  removeEntry: (id: uid) => void;
  syncState: any;
  forceSync: () => void;
};

const EntriesContext = createContext<EntriesContextType>();

export const EntriesProvider = (props) => {
  const hasNetwork = useNetwork();
  const user = useUser();

  const [localDB, _] = createResource(connectDB);

  // set up synced SolidJS store with the local database
  const [
    entries,
    { update, initialized, querying, mutating, forceSync: storeForceSync },
  ] = createSyncedStoreArray<Entry>(localDB, {
    query: getAllEntries,
    equals: (entriesA, entriesB) =>
      entriesA.every((entryA, i) => entryEquals(entryA, entriesB[i])),
  });

  const [syncingUp, setSyncingUp] = createSignal();
  const [syncingDown, setSyncingDown] = createSignal();

  const loggedIn = () => user() && user().credentials;

  const addEntry = async (entry: Partial<Entry> | undefined) => {
    const newEntry = { ...makeEntry(), ...entry };

    await update({
      mutate: () => putEntryLocal(newEntry),
      expect: (set) => set([newEntry, ...entries]),
    });
    if (hasNetwork() && loggedIn()) {
      setSyncingUp(true);
      await pushUpdates();
      setSyncingUp(false);
    }
  };

  const removeEntry = async (id: uid) => {
    await update({
      mutate: () => removeEntryLocal(id),
      expect: (set) => set(entries.filter((entry) => entry.id !== id)),
    });
    if (hasNetwork() && loggedIn()) {
      setSyncingUp(true);
      //await putEntryRemote(id, { deleted: true });
      setSyncingUp(false);
    }
  };

  const updateEntry = async (id: uid, entry: Partial<Entry>) => {
    const newEntry = {
      ...entries.find((e) => e.id === id),
      ...entry,
      lastModified: now(),
    };
    await update({
      mutate: () => putEntryLocal(newEntry),
      expect: (set) => set(entries.map((e) => (e.id === id ? newEntry : e))),
    });
    if (hasNetwork() && loggedIn()) {
      setSyncingUp(true);
      await pushUpdates();
      setSyncingUp(false);
    }
  };

  const forceSync = async () => {
    storeForceSync();

    delete localStorage.lastPushed;
    delete localStorage.lastPulled;
    setSyncingDown(true);
    await pullUpdates();
    setSyncingDown(false);
    setSyncingUp(true);
    await pushUpdates();
    setSyncingUp(false);
    localStorage.lastPushed = JSON.stringify(now().getTime());
    localStorage.lastPulled = JSON.stringify(now().getTime());
  };

  createEffect(() => initialized() && forceSync());

  const syncState = {
    local: { initialized, querying, mutating },
    remote: { loggedIn, syncingUp, syncingDown },
  };

  return (
    <EntriesContext.Provider
      value={{
        entries,
        addEntry,
        removeEntry,
        updateEntry,
        forceSync,
        syncState,
      }}
    >
      {props.children}
    </EntriesContext.Provider>
  );
};

export const useEntries = () => useContext(EntriesContext);
