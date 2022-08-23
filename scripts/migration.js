/* 1. RUN THIS IN THE ORIGINAL APP CONSOLE AND
 COPY THE RESULT TO CLIPBOARD (there should be 
 a neat button if you're using Chrome) */

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

/* 2. IN THE NEW APP CONSOLE, WRITE THIS AND 
PASTE FROM THE PREVIOUS STEP INTO THE BACKTICKS */

window.timemarker.pushEntriesFromConsole(``)