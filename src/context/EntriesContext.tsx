import axios from "axios";
import { Dialog, DialogOverlay, DialogPanel } from "solid-headless";
import {
  createContext,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  untrack,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { MS_IN_HOURS } from "../lib/constants";
import {
  deserializeEntries,
  Entry,
  entryEquals,
  entrySetEquals,
  getDistinctLabels,
  Label,
  makeEntry,
  mergeEntries,
} from "../lib/entries";
import {
  connectDB,
  getEntriesLocal,
  getEntryByIdLocal,
  putEntriesLocal,
} from "../lib/localDB";
import { getEntriesRemote, putEntriesRemote } from "../lib/remoteDB";
import { createSyncedStoreArray } from "../lib/solid-ext";
import { insertIntoSortedDecreasingBy, now, wait } from "../lib/util";
import { useUser } from "./UserContext";
import { useWindow } from "./WindowContext";

function newClientID() {
  return Math.random().toString(36).substring(2, 10);
}

type EntriesContextType = {
  entries: Entry[];
  labels: Label[];
  dispatch: (any) => any;
  sync: () => void;
  syncState: any;
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

  // SET UP SYNCED SOLIDJS STORE TO INDEXEDDB
  const [
    entries,
    { update, initialized, querying, mutating, forceSync: storeForceSync },
  ] = createSyncedStoreArray<Entry>(localDB, {
    query: getEntriesLocal,
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

  const entriesById = createMemo(() => {
    const m = new Map();
    for (const entry of entries) {
      m.set(entry.id, entry);
    }
    return m;
  });

  // CORE SYNCING FUNCTIONS
  const [pushingUpdates, setPushingUpdates] = createSignal();
  const pushUpdates = async () => {
    console.log("PUSH start");

    setPushingUpdates(true);
    const lastPushed = new Date(JSON.parse(localStorage.lastPushed || "0"));
    const newLastPushed = now().getTime();

    // get all local entries modified after lastPushed
    const updatedEntries = await getEntriesLocal({
      modifiedAfter: lastPushed,
      includeDeleted: true,
    });

    let response;
    if (updatedEntries.length > 0) {
      response = await putEntriesRemote(credentials, clientID, updatedEntries);
    }

    if (updatedEntries.length === 0 || response.status === "ok") {
      console.log(`PUSH end (${updatedEntries.length})`);
      localStorage.lastPushed = JSON.stringify(newLastPushed);
    } else {
      console.log(`PUSH error: ${response}`);
    }

    setPushingUpdates(false);
  };

  const [pullingUpdates, setPullingUpdates] = createSignal();
  const pullUpdates = async () => {
    console.log("PULL start");
    setPullingUpdates(true);

    const lastPulled = new Date(JSON.parse(localStorage.lastPulled || "0"));
    const newLastPulled = now().getTime();

    // pull all entries from the server modified after lastPulled
    const pulledEntries = await getEntriesRemote(credentials, {
      syncedAfter: lastPulled.getTime(),
      includeDeleted: true,
    });

    if (typeof pulledEntries === "string") {
      console.log(`PULL deserialization error: ${pulledEntries}`);
    } else {
      console.log("PULL received entries from server");

      const updatedEntries = [];
      for (const newEntry of pulledEntries) {
        const existingEntry = await getEntryByIdLocal(newEntry.id);
        if (
          !existingEntry ||
          newEntry.lastModified.getTime() > existingEntry.lastModified.getTime()
        ) {
          updatedEntries.push(newEntry);
        }
      }
      console.log(
        `PULL parsed entries (total # of updated entries ${updatedEntries.length})`
      );

      if (updatedEntries.length > 0) {
        await updateEntries(updatedEntries);
      }

      console.log(`PULL end (${updatedEntries.length})`);
      localStorage.lastPulled = JSON.stringify(newLastPulled);
    }
    setPullingUpdates(false);
  };

  const sync = async () => {
    await Promise.all([pushUpdates(), pullUpdates()]);
  };

  // LONG POLLING FOR REAL TIME UPDATES
  const clientID = newClientID();

  const subscribe = async () => {
    //console.log(`SUB start (${clientID})`);
    const timeStart = now().getTime();

    try {
      const res = await axios.get("/api/sync", {
        params: { ...credentials, clientID },
      });
      if (res.status === 200 && res.data == "ok") {
        await untrack(pullUpdates);
      }
    } catch (e) {
      await wait(1000);
    }

    const timeEnd = now().getTime();
    //    console.log(
    //    `SUB resolve (${clientID}, after ${renderDuration(timeEnd - timeStart)})`
    //  );
    subscribe();
  };

  // SET UP BROADCASTING TO OTHER TABS
  const bc = new BroadcastChannel("timetracking");
  bc.onmessage = (e) => {
    console.log(`MES (${e.data.length})`);

    updateEntries(e.data);
  };

  // VALIDATION
  const [validating, setValidating] = createSignal();
  const [validationError, setValidationError] = createSignal();
  const fullValidate = async () => {
    setValidating(true);
    console.log("VALIDATE start");

    const remoteEntries = await getEntriesRemote(credentials, {
      includeDeleted: true,
    });
    const localEntries = await getEntriesLocal({ includeDeleted: true });

    const result = entrySetEquals(localEntries, remoteEntries);

    console.log(`VALIDATE end (${result === true ? "ok" : result})`);

    setValidating(false);
    return result === true ? "ok" : result;
  };

  const fullUpdate = async () => {
    console.log("FULL UPDATE start");

    const remoteEntries = await getEntriesRemote(credentials, {
      includeDeleted: true,
    });
    const localEntries = await getEntriesLocal({ includeDeleted: true });
    const [localUpdates, remoteUpdates] = mergeEntries(
      localEntries,
      remoteEntries
    );

    console.log(
      `FULL UPDATE midpoint (remote updates: ${remoteUpdates.length}, local updates: ${localUpdates.length})`
    );

    const [localResponse, remoteResponse] = await Promise.all([
      localUpdates.length > 0 && putEntriesLocal(localUpdates),
      remoteUpdates.length > 0 &&
        putEntriesRemote(credentials, null, remoteUpdates),
    ]);
    console.log(
      `FULL UPDATE end (remote updates: ${remoteUpdates.length}, local updates: ${localUpdates.length})`
    );

    await storeForceSync();
  };

  // PERIODIC FULL UPDATE/FULL VALIDATION ON BLUR
  const onblur = async () => {
    const lastFull = localStorage.lastFull
      ? JSON.parse(localStorage.lastFull)
      : { time: 0 };
    const nowTime = now().getTime();

    if (nowTime - lastFull.time > MS_IN_HOURS) {
      console.log("PERIODIC FULL UPDATE/VALIDATION");

      localStorage.lastFull = JSON.stringify({
        time: nowTime,
        result: "pending...",
      });

      let res;
      try {
        await untrack(fullUpdate);
        res = await untrack(fullValidate);
      } catch (e) {
        console.log(`PERIODIC FULL UPDATE/VALIDATION error: ${e}`);
      }

      localStorage.lastFull = JSON.stringify({ time: nowTime, result: res });
      console.log(`PERIODIC FULL UPDATE/VALIDATION end (${res})`);
    }
  };
  onMount(() => {
    window.addEventListener("blur", onblur);
  });
  onCleanup(() => {
    window.removeEventListener("blur", onblur);
  });

  // EVENT HANDLING
  const updateEntries = async (_entries: Entry[]) => {
    if (_entries.length > 100) {
      await putEntriesLocal(_entries);
      storeForceSync();
    } else {
      await update({
        mutate: () => putEntriesLocal(_entries),
        expect: (set) => {
          set(
            _entries.reduce((es, newEntry) => {
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
    }
    updateLabels();
  };

  const putEntries = async (_entries: (Partial<Entry> | undefined)[]) => {
    if (_entries.length === 0) return;

    const newEntries = _entries.map((entry) => {
      const existingEntry = entry?.id ? entriesById().get(entry.id) : undefined;

      return {
        ...(existingEntry || makeEntry()),
        ...entry,
        lastModified: now(),
      };
    });

    await updateEntries(newEntries);

    bc.postMessage(newEntries);
    if (hasNetwork() && loggedIn()) {
      await pushUpdates();
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

  // LABELS
  const [labels, setLabels] = createStore([]);
  const updateLabels = () => {
    setLabels(getDistinctLabels([...entries]));
  };

  // UNDO
  const [undoStack, setUndoStack] = createStore([]),
    [redoStack, setRedoStack] = createStore([]),
    [history, setHistory] = createStore([]);
  const pushToUndoStack = (updatedEntries, event) => {
    const previousEntries = updatedEntries.map((entry) => {
      const existingEntry = entriesById().get(entry.id);
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

  const undoKeyHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      if (!e.shiftKey) undo();
      else redo();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", undoKeyHandler);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", undoKeyHandler);
  });

  // EXPOSING FUNCTIONS TO THE CONSOLE
  onMount(() => {
    window.timemarker = {};
    window.timemarker.putEntries = putEntries;
    window.timemarker.entries = entries;
    window.timemarker.pushEntriesFromConsole = async (serializedEntries) => {
      console.log("PUSH ENTRIES FROM CONSOLE start");

      const entries = deserializeEntries(serializedEntries);
      if (typeof entries === "string") {
        console.log("PUSH ENTRIES FROM CONSOLE parse error", entries);
      } else {
        try {
          await putEntriesLocal(entries);
          console.log(`PUSH ENTRIES FROM CONSOLE success (${entries.length})`);
        } catch (e) {
          console.error("PUSH ENTRIES FROM CONSOLE save error", e);
        }
      }
    };
  });

  // SYNC STATE
  const syncState = {
    local: { initialized, querying, mutating },
    remote: { loggedIn, pushingUpdates, pullingUpdates, validating },
  };

  // INITAIALIZATION
  createEffect(async () => {
    if (initialized()) {
      untrack(updateLabels);
      if (hasNetwork() && loggedIn()) {
        console.log("INIT");

        await untrack(sync);
        await untrack(subscribe);
      }
    }
  });

  // PULLING AND PUSHING KEYBINDS
  const pullKeybinds = async (e) => {
    if (!loggedIn() || !hasNetwork()) return;

    // if option+p
    if (e.altKey) {
      if (e.code === "KeyP") {
        untrack(sync);
      }
      // if option+shift+p
      if (e.shiftKey && e.code === "KeyP") {
        await untrack(fullUpdate);
        await untrack(fullValidate);
      }
    }
  };
  onMount(() => {
    window.addEventListener("keydown", pullKeybinds);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", pullKeybinds);
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
        <Dialog
          isOpen={validationError() ? true : false}
          onClose={() => setValidationError(false)}
          class="fixed inset-0 z-10 overflow-y-auto"
        >
          <div class="min-h-screen flex items-center justify-center">
            <DialogOverlay class="fixed inset-0 bg-gray-800 opacity-25" />
            <DialogPanel class="inline-block bg-white px-4 py-3 rounded-lg border-1 shadow z-20 space-y-1">
              <div class="font-bold">Validation error!</div>
              <pre>{JSON.stringify(validationError(), null, 2)}</pre>
              <Switch>
                <Match when={validating()}>Revalidating...</Match>
                <Match when={!validationError()}>Ok!</Match>
                <Match when={true}>Still not ok...</Match>
              </Switch>
            </DialogPanel>
          </div>
        </Dialog>
      </EntriesContext.Provider>
    </>
  );
};

export const useEntries = () => useContext(EntriesContext);
