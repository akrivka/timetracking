import axios from "axios";
import { getLocalCredentials } from "./auth";
import {
  deserializeEntries,
  Entry,
  entryEquals,
  serializeEntries,
  uid,
} from "./entries";
import {
  addEntries,
  getAllEntries,
  getAllEntriesModifiedAfter,
  updateEntries,
} from "./localDB";
import { now } from "./util";

export async function syncUp() {
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

export async function syncDown() {
  const lastPulled = new Date(JSON.parse(localStorage.lastPulled || "0"));

  // pull all entries from the server modified after lastPulled
  const credentials = getLocalCredentials();

  const response = await axios.get("/api/entries", {
    params: { ...credentials, after: lastPulled.getTime() },
  });

  // store entries in localDB
  const entries = deserializeEntries(decodeURIComponent(response.data));

  updateEntries(entries);

  // change last pulled
  localStorage.lastPulled = JSON.stringify(now().getTime());
}

export async function sync() {
  await syncUp();
  await syncDown();
  return await validate()
}

function deepEquals(xs: Entry[], ys: Entry[]) {
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

export async function validate() {
  const credentials = getLocalCredentials();
  const response = await axios.get("/api/entries", {
    params: credentials,
  });
  const remoteEntries = deserializeEntries(decodeURIComponent(response.data));
  const localEntries = await getAllEntries();

  return deepEquals(localEntries, remoteEntries);
}
