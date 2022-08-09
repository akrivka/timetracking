import { Outlet } from "solid-app-router";
import { Component, Show } from "solid-js";
import { useEntries } from "../context/EntriesContext";

const Page: Component = () => {
  const { syncState } = useEntries();
  return (
    <>
      <Show
        when={
          syncState.remote.pushingUpdates() || syncState.remote.pullingUpdates()
        }
      >
        <div class="absolute top-1 right-1 text-sm text-gray-400">
          Syncing...
        </div>
      </Show>
      <Outlet />
    </>
  );
};

export default Page;
