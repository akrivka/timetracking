(async () => {
    const N = 1000
    const entries = []
    let d = new Date()
    d.setDate(d.getDate() - 21)
    for (let i = 0; i < N; i++) {
        entries.push({ time: new Date(d.getTime()) })
        d.setTime(d.getTime() - 1800000)
    }

    await timemarker.putEntries(entries)
})()