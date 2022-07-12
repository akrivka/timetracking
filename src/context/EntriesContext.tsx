import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  useContext,
} from "solid-js";
import { Entry, uid, entryEquals, makeEntry } from "../lib/entries";
import { useNetwork } from "./NetworkContext";
import {
  connectDB,
  getAllEntries,
  putEntryLocal,
  removeEntryLocal,
} from "../lib/localDB";
import { putEntryRemote } from "../lib/remoteDB";
import { createSyncedStoreArray } from "../lib/solid-ext";
import { now, wait } from "../lib/util";
import { useUser } from "./UserContext";

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

  const addEntry = async (entry: Partial<Entry> | undefined) => {
    const newEntry = { ...makeEntry(), ...entry };

    await update({
      mutate: () => putEntryLocal(newEntry),
      expect: (set) => set([newEntry, ...entries]),
    });
    if (hasNetwork()) {
      setSyncingUp(true);
      await putEntryRemote(newEntry);
      setSyncingUp(false);
    }
  };

  const removeEntry = async (id: uid) => {
    await update({
      mutate: () => removeEntryLocal(id),
      expect: (set) => set(entries.filter((entry) => entry.id !== id)),
    });
    if (hasNetwork()) {
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
    if (hasNetwork()) {
      setSyncingUp(true);
      await putEntryRemote(newEntry);
      setSyncingUp(false);
    }
  };

  const forceSync = async () => {
    storeForceSync();
  };

  const syncState = {
    local: { initialized, querying, mutating },
    remote: { hasNetwork, syncingUp, syncingDown },
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

// const syncState = createMemo(() => {
//   // test whether user is connected to the internet
//   let remote: string;
//   if (!isConnected()) {
//     remote = "Offline.";
//   } else if (syncingUp()) {
//     remote = "Syncing up... ";
//   } else if (syncingDown()) {
//     remote = "Syncing down... ";
//   } else {
//     remote = "Synced.";
//   }

//   let local: string;
//   if (!connection()) {
//     local = "Connecting to local database.";
//   } else if (querying()) {
//     local = "Querying entries.";
//   } else if (mutating()) {
//     local = "Saving entries locally.";
//   } else {
//     local = "Synced.";
//   }
//   return "Remote: " + remote + "\nLocal: " + local;
// });
