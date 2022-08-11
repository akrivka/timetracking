import axios from "axios";
import {
  createContext,
  createEffect,
  createResource,
  createSignal,
  onMount,
  Show,
  untrack,
  useContext
} from "solid-js";
import { createStore } from "solid-js/store";
import {
  deserializeEntries,
  Entry,
  entryEquals,
  entrySetEquals,
  getDistinctLabels,
  makeEntry,
  serializeEntries
} from "../lib/entries";
import {
  connectDB,
  getAllEntries,
  getAllEntriesModifiedAfter,
  putEntriesLocal,
  putEntryLocal
} from "../lib/localDB";
import { getEntriesRemote } from "../lib/remoteDB";
import { createSyncedStoreArray } from "../lib/solid-ext";
import { insertIntoSortedDecreasingBy, now, wait } from "../lib/util";
import { Credentials, useUser } from "./UserContext";
import { useWindow } from "./WindowContext";

type EntriesContextType = {
  entries: Entry[];
  labels: Label[];
  dispatch: (any) => any;
  syncState: any;
  sync: () => void;
  undo: () => void;
  redo: () => void;
  history: any[];
};

const EntriesContext = createContext<EntriesContextType>();

export const EntriesProvider = (props) => {
  const { hasNetwork } = useWindow();
  const { credentials } = useUser();

  const loggedIn = () => credentials;

  const [localDB, _] = createResource(() => connectDB(credentials?.username));

  // set up synced SolidJS store with the local database
  const [
    entries,
    { update, initialized, querying, mutating, forceSync: storeForceSync },
  ] = createSyncedStoreArray<Entry>(localDB, {
    query: getAllEntries,
    equals: (entriesA, entriesB) => {
      const eq = entriesA.some(
        (entryA, i) => entryEquals(entryA, entriesB[i]) !== true
      );
      if (eq) {
        return eq;
      } else {
        return true;
      }
    },
  });

  const [pushingUpdates, setPushingUpdates] = createSignal();
  const [pushedUpdates, setPushedUpdates] = createSignal(false);

  const pushUpdates = async () => {
    console.log("pushing updates");

    setPushingUpdates(true);
    const lastPushed = new Date(JSON.parse(localStorage.lastPushed || "0"));

    // get all local entries modified after lastPushed
    const entries = await getAllEntriesModifiedAfter(lastPushed);

    // serialize entries
    const s = serializeEntries(entries);

    // send to server using axios
    setPushedUpdates(true);
    const response = await axios.post(
      "/api/update",
      "entries=" + encodeURIComponent(s),
      { params: credentials }
    );
    //if(response.)

    // update lastPushed
    localStorage.lastPushed = JSON.stringify(now().getTime());
    setPushingUpdates(false);
  };

  const [pullingUpdates, setPullingUpdates] = createSignal();
  const pullUpdates = async () => {
    console.log("pulling updates");

    setPullingUpdates(true);
    const lastPulled = new Date(JSON.parse(localStorage.lastPulled || "0"));

    // pull all entries from the server modified after lastPulled
    const entries = await getEntriesRemote(
      { after: lastPulled.getTime() },
      credentials
    );

    if (entries.length > 100) {
      await putEntriesFast(entries);
    } else {
      await putEntries(entries, { shouldPushUpdates: false });
    }

    // change last pulled
    localStorage.lastPulled = JSON.stringify(now().getTime());
    setPullingUpdates(false);
  };

  const [validating, setValidating] = createSignal();
  const fullValidate = async (credentials: Credentials) => {
    setValidating(true);
    const response = await axios.get("/api/entries", {
      params: credentials,
    });
    const remoteEntries = deserializeEntries(decodeURIComponent(response.data));
    const localEntries = await getAllEntries();
    console.log("validated", remoteEntries.length, "entries");

    const result = entrySetEquals(localEntries, remoteEntries);
    setValidating(false);
    return result === true ? "ok" : result;
  };

  const sync = async () => {
    await Promise.all([pushUpdates(), pullUpdates()]);

    console.log("validating");
    console.log(await fullValidate(credentials));
  };

  // long polling real time updates
  const subscribe = async () => {
    console.log("resubscribing");

    const res = await axios.get("/api/sync", {
      params: credentials,
    });

    if (res.status === 502) {
      await subscribe();
    } else if (res.status !== 200) {
      await wait(1000);
      await subscribe();
    } else {
      if (!pushedUpdates()) {
        setPushedUpdates(false);
        await pullUpdates();
      }
      setPushedUpdates(false);
      await subscribe();
    }
  };

  onMount(() => {
    //untrack(subscribe);

    document.addEventListener("focus", () => pullUpdates());
  });

  // SYNC STATE
  const syncState = {
    local: { initialized, querying, mutating },
    remote: { loggedIn, pushingUpdates, pullingUpdates, validating },
  };

  // EVENT HANDLING
  const putEntriesFast = async (entries: Entry[]) => {
    await putEntriesLocal(entries);
    storeForceSync();
    updateLabels();
  };

  const putEntries = async (
    _entries: (Partial<Entry> | undefined)[],
    { shouldPushUpdates = true }: { shouldPushUpdates?: boolean } = {}
  ) => {
    if (_entries.length === 0) return;

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

    if (hasNetwork() && loggedIn() && shouldPushUpdates) {
      setPushingUpdates(true);
      await pushUpdates();
      setPushingUpdates(false);
    }
  };

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
        const { from, to, moveChildren } = info;
        for (const entry of entries) {
          const newEntry = { ...entry };
          // either the whole label matches or a prefix matches
          const beforeMatches =
            entry.before &&
            (entry.before === from ||
              (moveChildren && entry.before.startsWith(from)));
          if (beforeMatches) {
            newEntry.before = to + entry.before.slice(from.length);
          }
          // do the same for the after label
          const afterMatches =
            entry.after &&
            (entry.after === from ||
              (moveChildren && entry.after.startsWith(from)));
          if (afterMatches) {
            newEntry.after = to + entry.after.slice(from.length);
          }

          if (beforeMatches || afterMatches) updatedEntries.push(newEntry);
        }
        break;
    }

    const updatedEntriesWithIds = updatedEntries.map((entry) => ({
      ...makeEntry(),
      ...entry,
    }));
    pushToUndoStack(updatedEntriesWithIds, event);
    await putEntries(updatedEntriesWithIds);
  };

  const putEntry = (entry: Partial<Entry> | undefined) => putEntries([entry]);

  const pushEntriesFromConsole = async (serializedEntries) => {
    const entries = deserializeEntries(serializedEntries);
    try {
      await putEntriesLocal(entries);
    } catch (e) {
      console.error(e);
    }
  };

  onMount(() => {
    window.timemarker = {};
    window.timemarker.pushEntriesFromConsole = pushEntriesFromConsole;
    window.timemarker.putEntries = putEntries;
    window.timemarker.entries = entries;
  });

  // LABELS
  const [labels, setLabels] = createStore([]);
  const updateLabels = () => {
    setLabels(getDistinctLabels([...entries]));
  };

  // INITAIALIZATION
  createEffect(() => {
    if (initialized()) {
      if (hasNetwork() && loggedIn()) {
        untrack(sync);
      }
      untrack(updateLabels);
    }
  });

  // UNDO
  const [undoStack, setUndoStack] = createStore([]),
    [redoStack, setRedoStack] = createStore([]),
    [history, setHistory] = createStore([]);
  const pushToUndoStack = (updatedEntries, event) => {
    const previousEntries = updatedEntries.map((entry) => {
      const existingEntry = entries.find((e) => e.id === entry.id);
      return existingEntry || { ...entry, deleted: true };
    });
    setUndoStack([
      ...undoStack,
      { prev: previousEntries, next: updatedEntries, event },
    ]);
    setRedoStack([]);
  };

  const createEvent = ({ event, type }) => {
    const [show, setShow] = createSignal(true);
    setTimeout(() => setShow(false), 2000);
    return { show, event, type };
  };
  const undo = async () => {
    if (undoStack.length === 0) return;
    const { prev, next, event } = undoStack[undoStack.length - 1];

    setUndoStack([...undoStack].slice(0, undoStack.length - 1));
    setRedoStack([...redoStack, { prev, next, event }]);
    await putEntries(prev);
    setHistory([...history, createEvent({ event, type: "undo" })]);
  };

  const redo = async () => {
    if (redoStack.length === 0) return;
    const { prev, next, event } = redoStack[redoStack.length - 1];

    setRedoStack([...redoStack].slice(0, redoStack.length - 1));
    setUndoStack([...undoStack, { prev, next, event }]);
    await putEntries(next);
    setHistory([...history, createEvent({ event, type: "redo" })]);
  };

  onMount(() => {
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (!e.shiftKey) undo();
        else redo();
      }
    });
  });

  return (
    <>
      <EntriesContext.Provider
        value={{
          entries,
          labels,
          dispatch,
          sync,
          syncState,
          undo,
          redo,
          history,
        }}
      >
        <Show when={initialized()} fallback="Loading...">
          {props.children}
        </Show>
      </EntriesContext.Provider>
    </>
  );
};

export const useEntries = () => useContext(EntriesContext);
