import { createSignal, createMemo, createEffect } from "solid-js";
import { createStore, Store } from "solid-js/store";

type CreateSyncProps = {
  query: () => Promise<any>;
  equals: (dataA, dataB) => boolean;
};

export function createSyncedStore(source, { query, equals }: CreateSyncProps) {
  const [store, setStore] = createStore([]);
  const [initialized, setInitialized] = createSignal(false);
  const [mutating, setMutating] = createSignal(false);
  const [querying, setQuerying] = createSignal(false);

  // initialize
  createEffect(async () => {
    if (source()) {
      const newStore = await query();
      setQuerying(true);
      setStore(newStore || []);
      setInitialized(true);
      setQuerying(false);
    }
  });

  const update = async ({ mutate, expect }) => {
    expect();
    // mutate
    setMutating(true);
    await mutate();
    setMutating(false);
    // query
    setQuerying(true);
    const newStore = await query();
    setQuerying(false);
    // equals
    if (!equals(newStore, store)) {
      console.log("something went wrong");
      setStore(newStore);
    }
  };

  const sync = async () => {
    setStore(await query());
  };

  return [store, { update, setStore, initialized, querying, mutating, sync }];
}
