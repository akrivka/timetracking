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
  deserializeEntries,
  Entry,
  entryEquals,
  entrySetEquals,
  makeEntry,
  serializeEntries,
  uid,
} from "../lib/entries";
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

  const loggedIn = () => user() && user().username;

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
