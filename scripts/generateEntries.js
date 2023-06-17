(async () => {
  const N = 100000;
  const newUID = () => Math.random().toString(36).substring(2, 10);
  const categories = [...Array(20)].map(newUID);
  const labels = [...Array(N - 1)].map(() => {
    const cats = [...Array(Math.ceil(Math.random() * 3))].map(
      () => categories[Math.floor(Math.random() * categories.length)]
    );
    return cats.join("/");
  });
  let entries = [];
  let d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = N; i >= 1; i--) {
    entries.push({
      time: new Date(d.getTime()),
      before: labels[i],
      after: labels[i + 1],
      lastModified: new Date(d.getTime()),
      deleted: false,
      id: newUID(),
    });
    d.setTime(d.getTime() - Math.ceil(Math.random() * 1200000));
  }
  console.log(labels[0]);

  // put entries in batches
  const batchSize = 1000;
  for (let i = 0; i < entries.length; i += batchSize) {
    await window.timemarker.putEntries(entries.slice(i, i + batchSize));
  }
})();
