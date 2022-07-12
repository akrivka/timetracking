import { createSignal, createEffect, Accessor } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

type CreateSyncProps<T> = {
  query: () => Promise<T[]>;
  equals: (dataA: T[], dataB: T[]) => boolean;
};

export function createSyncedStoreArray<T>(
  source: Accessor<any>,
  { query, equals }: CreateSyncProps<T>
): [
  Store<T[]>,
  {
    update: (arg: {
      mutate: () => Promise<any>;
      expect: (setStore: SetStoreFunction<T[]>) => void;
    }) => void;
    initialized: Accessor<boolean>;
    mutating: Accessor<boolean>;
    querying: Accessor<boolean>;
    forceSync: () => Promise<any>;
  }
] {
  const [store, setStore] = createStore<T[]>([]);
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
    expect(setStore);
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

  const forceSync = async () => {
    setStore(await query());
  };

  return [store, { update, initialized, querying, mutating, forceSync }];
}
