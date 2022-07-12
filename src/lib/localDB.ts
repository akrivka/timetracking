import { IDBPDatabase, openDB } from "idb/with-async-ittr";
import { Entry, uid } from "./entries";
import { delay, wait } from "./util";

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

export async function putEntryLocal(entry: Entry) {
  await wait(delay);

  return await db?.put("entries", entry);
}

export async function removeEntryLocal(id: uid) {
  await wait(delay);

  return await db?.delete("entries", id);
}

export async function updateEntriesLocal(entries: Entry[]) {
  await wait(delay);

  const tx = db.transaction("entries", "readwrite");

  return await Promise.all([
    ...entries.map((entry) => tx.store.put(entry)),
    tx.done,
  ]);
}
