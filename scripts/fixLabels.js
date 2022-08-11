(async () => {
    const entries = []
    for (const entry of timemarker.entries) {
        entries.push({ ...entry, before: entry.before && entry.before.replace(" / ", "/"), after: entry.after && entry.after.replace(" / ", "/") })
    }

    await timemarker.putEntries(entries)
})()