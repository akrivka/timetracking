import {
  createContext,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  useContext,
} from "solid-js";
import { connectDB, getAllEntries } from "./localDB";
import { useNetwork } from "./network-context";
import { createSyncedStore } from "./solid-ext";
import { sync, syncDown, syncUp, validate } from "./sync";
import { wait } from "./util";

const EntriesContext = createContext([""]);

export const EntriesProvider = (props) => {
  let store = null;
  let isConnected = useNetwork();

  if (props.loggedIn()) {
    // connect to local database
    const [connection, _] = createResource(connectDB);

    const [syncingUp, setSyncingUp] = createSignal();
    const [syncingDown, setSyncingDown] = createSignal();

    createEffect(async () => {
      if (connection() && isConnected()) {
        setSyncingUp(true);
        await syncUp();
        setSyncingUp(false);

        setSyncingDown(true);
        await syncDown();
        setSyncingDown(false);
      }
    });

    // set up synced store with local database
    const [
      entries,
      { update, setStore: setEntries, initialized, querying, mutating, sync },
    ] = createSyncedStore(connection, {
      query: getAllEntries,
      equals: (entriesA, entriesB) => {
        return entriesA.every(
          (entryA, i) =>
            entryA.id === entriesB[i].id &&
            entryA.lastModified.getTime() === entriesB[i].lastModified.getTime()
        );
      },
    });

    const syncState = createMemo(() => {
      // test whether user is connected to the internet
      let remote: string;
      if (!isConnected()) {
        remote = "Offline.";
      } else if (syncingUp()) {
        remote = "Syncing up... ";
      } else if (syncingDown()) {
        remote = "Syncing down... ";
      } else {
        remote = "Synced.";
      }

      let local: string;
      if (!connection()) {
        local = "Connecting to local database.";
      } else if (querying()) {
        local = "Querying entries.";
      } else if (mutating()) {
        local = "Saving entries locally.";
      } else {
        local = "Synced.";
      }
      return "Remote: " + remote + "\nLocal: " + local;
    });

    const customUpdate = async (args) => {
      await update(args);
      if (navigator.onLine) {
        await wait(10);
        setSyncingUp(true);
        await syncUp();
        setSyncingUp(false);
        if (await validate()) {
          console.log("ok");
        } else {
          console.log("error");
        }
      }
    };

    const _sync = async () => {
      setSyncingDown(true);
      await syncDown();
      setSyncingDown(false);

      setSyncingUp(true);
      syncUp();
      setSyncingUp(false);

      sync()
    };

    // set up sync between local database and remote database
    store = {
      entries,
      setEntries,
      update: customUpdate,
      syncState,
      sync: _sync
    };
  }

  return (
    <EntriesContext.Provider value={store}>
      {props.children}
    </EntriesContext.Provider>
  );
};

export const useEntries = () => useContext(EntriesContext);
