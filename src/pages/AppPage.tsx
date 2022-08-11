import { Outlet } from "solid-app-router";
import { Component, createEffect, createSignal, Match, Switch } from "solid-js";
import { useEntries } from "../context/EntriesContext";

const Page: Component = () => {
  const { syncState } = useEntries();
  const [ok, setOk] = createSignal(false);
  createEffect(() => {
    if (syncState.remote.validating() === false) {
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    }
  });
  return (
    <>
      <div class="absolute top-1 right-1 text-sm text-gray-400">
        <Switch>
          <Match
            when={
              syncState.remote.pushingUpdates() ||
              syncState.remote.pullingUpdates()
            }
          >
            Syncing...
          </Match>
          <Match when={syncState.remote.validating()}>Validating...</Match>
          <Match when={ok()}>Ok!</Match>
        </Switch>
      </div>
      <Outlet />
    </>
  );
};

export default Page;
