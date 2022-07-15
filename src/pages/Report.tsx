import { Component, createEffect, createSignal, For, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { entriesIterator, Label, useEntries } from "../context/EntriesContext";
import { daysAfter, msBetween } from "../lib/date";
import { renderDuration } from "../lib/format";
import { listPairs, listPairsAndEnds, revit } from "../lib/util";

const Block: Component = ({ map }: { map: Map<string, number> }) => {
  // get top level labels
  const topLabels = [...map.keys()].filter((k) => k.includes("/") === false);
  const [expanded, setExpanded] = createStore(topLabels.map(() => false));

  // generate maps of reduced sublabels
  const mapOfMaps = new Map<string, Map<string, number>>();
  for (const topLabel of topLabels) {
    mapOfMaps.set(topLabel, new Map());
  }
  for (const label of map.keys()) {
    const [topLabel, rest] = prefixAndRemainder(label);
    if (rest !== "") {
      mapOfMaps.get(topLabel).set(rest, map.get(label));
    }
  }
  // for each top level labels, make a block
  return (
    <For each={topLabels}>
      {(topLabel, i) => {
        const isLeaf = mapOfMaps.get(topLabel).size == 0;
        return (
          <div
            class="flex flex-col"
            onclick={() =>
              setExpanded(
                produce((expanded) => (expanded[i()] = !expanded[i()]))
              )
            }
          >
            <div class={!isLeaf ? "cursor-pointer" : ""}>
              [{renderDuration(map.get(topLabel))}] {topLabel}{" "}
              {!isLeaf ? "[+]" : ""}
            </div>
            <Show when={expanded[i()]}>
              <div class="pl-8">
                <Block map={mapOfMaps.get(topLabel)} />
              </div>
            </Show>
          </div>
        );
      }}
    </For>
  );
};

//Splits on the first slash
//Second part is empty if no slash
//If first symbol is '?', whole thing is prefix
function coarseLabel(label: string): string {
  const i = label.lastIndexOf("/");
  if (i == -1) return null;
  else return label.slice(0, i).trim();
}

function prefixAndRemainder(s: string): [string, string] {
  const n = s.indexOf("/");
  if (n < 0 || s[0] == "?") return [s, ""];
  return [s.slice(0, n).trim(), s.slice(n + 1).trim()];
}

const Report: Component = () => {
  const { entries, syncState } = useEntries();
  const { initialized } = syncState.local;
  const [startDate, setStart] = createSignal(daysAfter(new Date(), -1));
  const [endDate, setEnd] = createSignal(new Date());

  const labelTimeMap = () => {
    if (initialized()) {
      const map: Map<Label, number> = new Map();
      console.log([
        ...entriesIterator(entries, { start: startDate(), end: endDate() }),
      ]);

      for (const [start, end] of listPairs(
        revit([
          ...entriesIterator(entries, {
            start: startDate(),
            end: endDate(),
          }),
        ])
      )) {
        const time = msBetween(start.time, end.time);
        const label = end.before || "";

        function add(label: string) {
          map.set(label, (map.get(label) || 0) + time);
          const labelAbove = coarseLabel(label);
          if (labelAbove) add(labelAbove);
        }

        console.log("label", label);

        add(label);
      }
      return map;
    }
  };

  return (
    <div>
      <div class="flex">
        <label class="w-24">Start</label>
        <input class="" type="text" />
      </div>
      <div class="flex">
        <label class="w-24">End</label>
        <input class="" type="text" />
      </div>
      <div class="flex">
        <label class="w-24">Labels</label>
        <input class="" type="text" />
      </div>
      <div class="flex">
        <label class="w-24">Edit</label>
        <input class="" type="checkbox" />
      </div>
      <div class="flex">
        <label class="w-24">Show</label>
        <input class="" type="radio" />
      </div>
      <div class="flex">
        <button>Generate</button>
        <button>Export</button>
      </div>
      <div>
        <Show when={initialized()}>
          <Block map={labelTimeMap()} />
        </Show>
      </div>
    </div>
  );
};

export default Report;
