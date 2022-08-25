import { IDBPDatabase, openDB } from "idb/with-async-ittr";
import { Entry } from "./entries";
import { delay, wait } from "./util";

let db: undefined | IDBPDatabase;

export async function connectDB(username: string) {
  await wait(delay);

  try {
    db = await openDB((username || "_local") + "-timemarker", 1, {
      upgrade(db) {
        //db.deleteObjectStore("entries");
        const store = db.createObjectStore("entries", {
          keyPath: "id",
        });
        store.createIndex("time", "time", { unique: false });
        store.createIndex("lastModified", "lastModified", { unique: false });
        store.createIndex("before", "before", { unique: false });
      },
    });
  } catch (e) {
    console.error(e);
  }

  return { success: true };
}

export async function getEntryByIdLocal(id: string) {
  await wait(delay);

  try {
    const entry = (await db!.get("entries", id)) as Entry;
    return entry;
  } catch (e) {
    console.error(e);
  }
}

export async function getEntriesLocal({
  modifiedAfter,
  includeDeleted,
}: { modifiedAfter?: Date; includeDeleted?: boolean } = {}) {
  await wait(delay);

  let entries;

  if (modifiedAfter) {
    entries = (
      await db?.getAllFromIndex(
        "entries",
        "lastModified",
        IDBKeyRange.lowerBound(modifiedAfter)
      )
    ).sort((a, b) => b.time.getTime() - a.time.getTime());
  } else {
    entries = (await db?.getAllFromIndex("entries", "time")).reverse();
  }

  if (!includeDeleted) {
    entries = entries.filter((e) => !e.deleted);
  }
  return entries;
}

export async function getAllEntriesLocalModifiedAfter(date: Date) {
  await wait(delay);

  const index = db?.transaction("entries").store.index("lastModified");
  const entries = [];

  for await (const cursor of index.iterate(IDBKeyRange.lowerBound(date))) {
    entries.push(cursor.value);
  }
  return entries.reverse();
}

export async function getAllEntriesLocal() {
  await wait(delay);

  return (await db?.getAllFromIndex("entries", "time"))
    .reverse()
    .filter((e) => !e.deleted);
}

export async function putEntriesLocal(entries: Entry[]) {
  //await wait(delay);

  const tx = db.transaction("entries", "readwrite");

  return await Promise.all([
    ...entries.map((entry) => tx.store.put(entry)),
    tx.done,
  ]);
}
