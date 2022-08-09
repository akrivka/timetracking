import axios from "axios";
import { useNavigate } from "solid-app-router";
import { Icon } from "solid-heroicons";
import { check } from "solid-heroicons/solid";
import { Component, createSignal, For, Match, onMount, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { useWindow } from "../context/WindowContext";
import {
  deserializeEntries,
  makeEntry,
  serializeEntries
} from "../lib/entries";
import { renderTime } from "../lib/format";

const Mobile: Component = () => {
  const { hasNetwork } = useWindow();
  const navigate = useNavigate();
  const credentials = JSON.parse(
    localStorage.getItem("user") as any
  )?.credentials;
  if (!credentials) navigate("/login", { state: { redirect: "/mobile" } });

  const [entries, setEntries] = createStore(
    localStorage.getItem("entries")
      ? deserializeEntries(localStorage.getItem("entries"))
      : []
  );

  const [syncing, setSyncing] = createSignal();
  const [ok, setOk] = createSignal();

  const sync = async () => {
    setSyncing(true);
    const response = await axios.post(
      "/api/update",
      "entries=" + encodeURIComponent(serializeEntries(entries)),
      { params: credentials }
    );
    if (response.data === "ok") {
      setEntries([]);
      localStorage.removeItem("entries");
      setSyncing(false);
      setOk(true);
      setTimeout(() => setOk(false), 1000);
    }
  };

  const onclick = () => {
    const entry = makeEntry();
    // add entry to local storage
    setEntries([entry, ...entries]);
    localStorage.setItem("entries", serializeEntries(entries));

    sync();
  };

  onMount(sync);

  return (
    <div class="h-screen">
      <div class="h-1/2 px-4 pt-2">
        <div class="flex justify-between w-full text-gray-400 text-xs">
          <span>{credentials.username}</span>
          <Switch>
            <Match when={!hasNetwork()}>No internet.</Match>
            <Match when={syncing()}>Syncing...</Match>
            <Match when={entries.length > 0}>
              <button
                class="p-1 w-6 h-6 hover:bg-gray-100 active:bg-gray-200 rounded"
                onclick={sync}
              >
                Retry
              </button>
            </Match>
            <Match when={true}>All entries sent successfully.</Match>
          </Switch>
        </div>
        <Switch>
          <Match when={ok()}>
            <div class="w-full h-full flex justify-center items-center">
              <Icon class="w-20 h-20 text-gray-300" path={check}></Icon>
            </div>
          </Match>
          <Match when={!ok()}>
            <For each={entries}>
              {(entry) => {
                return (
                  <div class="flex items-center space-x-2">
                    <div class="flex justify-center items-center w-3 h-3">
                      <div class="w-2 h-2 bg-black rounded-full" />
                    </div>
                    <div class="text-sm font-bold">
                      {renderTime(entry.time)}
                      <span class="text-[8px] font-normal text-gray-500">
                        :{entry.time.getSeconds()}
                      </span>
                    </div>
                  </div>
                );
              }}
            </For>
          </Match>
        </Switch>
      </div>
      <div class="h-1/2 flex justify-center items-center">
        <button
          class="px-12 py-6 text-lg hover:bg-gray-100 active:bg-gray-200 active:shadow rounded border-2 border-black"
          onClick={onclick}
        >
          Add entry
        </button>
      </div>
    </div>
  );
};

export default Mobile;
