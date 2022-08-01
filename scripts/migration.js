// 1. RUN THIS IN THE ORIGINAL APP CONSOLE
// =======
function serializeEntries(entries) {
    return JSON.stringify(
        entries.map((x) => ({
            time: x.time.getTime(),
            before: x.before,
            after: x.after,
            lastModified: x.lastModified.getTime(),
            deleted: x.deleted,
            id: x.id,
        }))
    );
}

// connect to IndexedDB database called timetrack
indexedDB.open("timetrack", 1).onsuccess = function (event) {
    // store the database connection
    var db = event.target.result;
    var tx = db.transaction(["entries"], "readonly")
    var store = tx.objectStore("entries");

    var entries = store.getAll();

    entries.onsuccess = function (event) {
        var serializedEntries = serializeEntries(event.target.result);
        console.log(serializedEntries);
    }
}
// =======

// 2. COPY THE RESULT TO CLIPBOARD (there should be a neat button)

// 3. IN THE NEW APP CONSOLE, WRITE (make sure to use backticks)

window.timemarker.pushEntriesFromConsole(`*past the content of your clipboard here*`)