import { Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import { createStore, SetStoreFunction, Store, unwrap } from "solid-js/store";
import { delay, wait } from "./util";

type CreateSyncProps<T> = {
  query: () => Promise<T[]>;
  equals: (dataA: T[], dataB: T[]) => true | [T, T];
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
    }) => Promise<void>;
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
    await wait(delay);
    // mutate
    setMutating(true);
    await mutate();
    setMutating(false);
    // query
    setQuerying(true);
    const newStore = await query();
    setQuerying(false);
    // equals
    const eq = equals(newStore, unwrap(store));
    if (eq !== true) {
      console.log("something went wrong: ");

      console.log(eq);
      setStore(newStore);
    }
  };

  const forceSync = async () => {
    setStore(await query());
  };

  return [store, { update, initialized, querying, mutating, forceSync }];
}

import { createPopper, Instance, Options } from "@popperjs/core";

export function usePopper<
  Target extends HTMLElement,
  Popper extends HTMLElement
>(
  targetElement: () => Target | undefined | null,
  popperElement: () => Popper | undefined | null,
  options: Partial<Options> = {}
): () => Instance | undefined {
  const [current, setCurrent] = createSignal<Instance>();

  createEffect(() => {
    setCurrent(undefined);

    const target = targetElement();
    const popper = popperElement();

    if (target && popper) {
      const instance = createPopper(target, popper, {});

      setCurrent(instance);

      onCleanup(() => {
        instance.destroy();
      });
    }
  });

  createEffect(() => {
    const instance = current();

    if (instance) {
      instance.setOptions({
        onFirstUpdate: options.onFirstUpdate,
        placement: options.placement ?? "bottom",
        modifiers: options.modifiers ?? [],
        strategy: options.strategy ?? "absolute",
      });
    }
  });

  return () => {
    const instance = current();
    if (instance) {
      return {
        ...instance,
      };
    }
    return undefined;
  };
}

export function clickOutside(el, accessor) {
  const onClick = (e) => !el.contains(e.target) && accessor()?.();
  document.addEventListener("click", onClick);

  onCleanup(() => document.removeEventListener("click", onClick));
}
