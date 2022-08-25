import axios from "axios";
import { Dialog, DialogOverlay, DialogPanel } from "solid-headless";
import {
  createContext,
  createEffect,
  createResource,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
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
  mergeEntries
} from "../lib/entries";
import {
  connectDB,
  getEntriesLocal,
  getEntryByIdLocal,
  putEntriesLocal
} from "../lib/localDB";
import { getEntriesRemote, putEntriesRemote } from "../lib/remoteDB";
import { createSyncedStoreArray } from "../lib/solid-ext";
import { insertIntoSortedDecreasingBy, now, wait } from "../lib/util";
import { Credentials, useUser } from "./UserContext";
import { useWindow } from "./WindowContext";

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

  // set up synced SolidJS store with the local database
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

  const [pushingUpdates, setPushingUpdates] = createSignal();
  const [pushedUpdates, setPushedUpdates] = createSignal(false);

  const pushUpdates = async () => {
    console.log("pushing updates");

    setPushingUpdates(true);
    const lastPushed = new Date(JSON.parse(localStorage.lastPushed || "0"));
    const newTime = now().getTime();

    // get all local entries modified after lastPushed
    const updatedEntries = await getEntriesLocal({
      modifiedAfter: lastPushed,
      includeDeleted: true,
    });

    setPushedUpdates(true);

    const response = await putEntriesRemote(credentials, updatedEntries);
    if (response === "ok") {
      console.log("pushed updates", updatedEntries.length);

      localStorage.lastPushed = JSON.stringify(newTime);
    }

    setPushingUpdates(false);
  };

  const [pullingUpdates, setPullingUpdates] = createSignal();
  const pullUpdates = async () => {
    console.log("pulling updates");

    setPullingUpdates(true);
    const lastPulled = new Date(JSON.parse(localStorage.lastPulled || "0"));

    // pull all entries from the server modified after lastPulled
    const newLastPulled = now().getTime();

    const pulledEntries = await getEntriesRemote(credentials, {
      modifiedAfter: lastPulled.getTime(),
      includeDeleted: true,
    });

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

    if (updatedEntries.length > 100) {
      await putEntriesFast(updatedEntries);
    } else {
      await update({
        mutate: () => putEntriesLocal(updatedEntries),
        expect: (set) => {
          set(
            updatedEntries.reduce((es, newEntry) => {
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
    }

    console.log("pulled updates", updatedEntries.length);
    if (updatedEntries.length > 0) {
      console.log(updatedEntries);
    }

    // change last pulled
    console.log("changing lastPulled");

    localStorage.lastPulled = JSON.stringify(newLastPulled);
    setPullingUpdates(false);
  };

  const [validating, setValidating] = createSignal();
  const [validationError, setValidationError] = createSignal();

  const fullValidate = async (credentials: Credentials) => {
    setValidating(true);
    const remoteEntries = await getEntriesRemote(credentials, {
      includeDeleted: true,
    });
    const localEntries = await getEntriesLocal({ includeDeleted: true });
    console.log("validating", remoteEntries.length, "entries");

    const result = entrySetEquals(localEntries, remoteEntries);
    setValidating(false);
    return result === true ? "ok" : result;
  };

  const [validateTimer, setValidateTimer] = createSignal();
  onMount(() => {
    setValidateTimer(setInterval(sync, 60 * 1000));
  });
  onCleanup(() => {
    validateTimer() && clearInterval(validateTimer() as NodeJS.Timer);
  });

  const fullUpdate = async () => {
    const remoteEntries = await getEntriesRemote(credentials, {
      includeDeleted: true,
    });
    const localEntries = await getEntriesLocal({ includeDeleted: true });
    const [localUpdates, remoteUpdates] = mergeEntries(
      localEntries,
      remoteEntries
    );
    console.log(localUpdates, remoteUpdates);

    const [localResponse, remoteResponse] = await Promise.all([
      putEntriesLocal(localUpdates),
      putEntriesRemote(credentials, remoteUpdates),
    ]);
    console.log(localResponse, remoteResponse);

    await storeForceSync();
  };

  const sync = async () => {
    await Promise.all([pushUpdates(), pullUpdates()]);

    console.log("validating");
    const result = await fullValidate(credentials);
    if (result === "ok") console.log("ok!");
    else {
      console.log("detected error:", result);
      setValidationError(result);
      console.log("doing full update");
      await fullUpdate();
      console.log("done full update");
      if ((await fullValidate(credentials)) === "ok") {
        setValidationError(null);
      }
    }
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
    window.addEventListener("focus", () => pullUpdates());
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
      mutate: () => putEntriesLocal(newEntries),
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

  const putEntry = (entry: Partial<Entry> | undefined) => putEntries([entry]);

  const pushEntriesFromConsole = async (serializedEntries) => {
    const entries = deserializeEntries(serializedEntries);
    try {
      await putEntriesLocal(entries);
      console.log(`successfully saved ${entries.length} entries`);
      return true;
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

  const onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      if (!e.shiftKey) undo();
      else redo();
    }
  };
  onMount(() => {
    document.addEventListener("keydown", onkeydown);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", onkeydown);
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
