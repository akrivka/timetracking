import { delay, now, wait } from "./util";
import { openDB, IDBPDatabase } from "idb/with-async-ittr";
import { Entry } from "./entries";

let db: undefined | IDBPDatabase;

export async function connectDB() {
  await wait(delay);

  try {
    db = await openDB("timemarker", 2, {
      upgrade(db) {
        //db.deleteObjectStore("entries");
        const store = db.createObjectStore("entries", {
          keyPath: "id",
        });
        store.createIndex("time", "time", { unique: true });
        store.createIndex("lastModified", "lastModified", { unique: false });
        store.createIndex("before", "before", { unique: false });
      },
    });
  } catch (e) {
    console.error(e);
  }

  return { success: true };
}

export async function getAllEntries() {
  await wait(delay);

  return (await db?.getAllFromIndex("entries", "time")).reverse();
}

export async function getAllEntriesModifiedAfter(date: Date) {
  await wait(delay);

  const index = db?.transaction("entries").store.index("lastModified");
  const entries = [];

  for await (const cursor of index.iterate(IDBKeyRange.lowerBound(date))) {
    entries.push(cursor.value);
  }
  return entries.reverse();
}

export async function addEntry(entry: Entry) {
  await wait(delay);

  return await db?.add("entries", entry);
}

export async function updateEntry(id: number, entry: Partial<Entry>) {
  await wait(delay);

  const oldEntry: Entry = await db?.get("entries", id);
  const newEntry: Partial<Entry> = { ...oldEntry, ...entry };
  return await db?.put("entries", newEntry);
}

export async function updateEntries(entries: Entry[]) {
  await wait(delay);

  const tx = db.transaction("entries", "readwrite");

  return await Promise.all([
    ...entries.map((entry) => tx.store.put(entry)),
    tx.done,
  ]);
}
