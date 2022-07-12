import { Component } from "solid-js";
import { makeEntry } from "../lib/entries";
import { useEntries } from "../context/EntriesContext";
import { now } from "../lib/util";

const Mobile: Component = () => {
  return (
    <div class="h-screen">
      <div class="h-1/2">
        <h1>[maybe some limited view of some entries]</h1>
      </div>
      <div class="h-1/2 flex justify-center items-center">
        <button
          class="px-12 py-6 text-lg hover:bg-gray-100 rounded border-2 border-black"
          onClick={() => {
            //addEntryLocal(makeEntry());
          }}
        >
          Add entry.
        </button>
      </div>
    </div>
  );
};

export default Mobile;
