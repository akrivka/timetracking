import {
  Accessor,
  Component,
  createContext,
  createSignal,
  For,
  Show,
  useContext,
} from "solid-js";
import { entriesIterator, Label, useEntries } from "../context/EntriesContext";
import { daysAfter, msBetween } from "../lib/date";
import { renderDuration } from "../lib/format";
import { listPairs, revit } from "../lib/util";

const Block: Component<{
  subMap: Map<string, number>;
  label: Label;
  duration: number;
}> = ({ subMap, label, duration }) => {
  const edit = isEdit();

  const topLabels = [...subMap.keys()].filter((k) => k.includes("/") === false);

  // TODO: make load from user/local storage
  const [expanded, setExpanded] = createSignal(true);

  // generate maps of reduced sublabels
  const mapOfMaps = new Map<string, Map<string, number>>();
  for (const topLabel of topLabels) {
    mapOfMaps.set(topLabel, new Map());
  }
  for (const label of subMap.keys()) {
    const [topLabel, rest] = prefixAndRemainder(label);
    if (rest !== "") {
      mapOfMaps.get(topLabel).set(rest, subMap.get(label));
    }
  }

  const isLeaf = mapOfMaps.size == 0;

  return (
    <>
      <div
        class={!isLeaf ? "cursor-pointer" : ""}
        onclick={() => setExpanded(!expanded())}
      >
        [{renderDuration(duration)}] {label} {!isLeaf ? "[+]" : ""}
        // TODO: add color input element with a callback that writes to local storage
        // maybe do this FIRST so it's clear what the API for the rest should be?
        {edit() && "hello"}
      </div>
      <Show when={expanded()}>
        <div class="pl-8 flex flex-col">
          <For each={topLabels}>
            {(topLabel) => (
              <Block
                subMap={mapOfMaps.get(topLabel)}
                label={topLabel}
                duration={subMap.get(topLabel)}
              />
            )}
          </For>
        </div>
      </Show>
    </>
  );
};

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

const EditContext = createContext<Accessor<boolean>>(() => false);
const isEdit = () => useContext(EditContext);

const Report: Component = () => {
  const { entries, syncState } = useEntries();
  const { initialized } = syncState.local;
  const [startDate, setStart] = createSignal(daysAfter(new Date(), -1));
  const [endDate, setEnd] = createSignal(new Date());
  const [edit, setEdit] = createSignal(false);

  const totalDuration = () => msBetween(startDate(), endDate());

  const labelTimeMap = () => {
    if (initialized()) {
      const map: Map<Label, number> = new Map();

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
        <input
          class=""
          type="checkbox"
          onchange={(e) => setEdit(e.currentTarget.checked)}
        />
      </div>
      <div class="flex">
        <label class="w-24">Show</label>
        <input class="" type="radio" />
      </div>
      <div class="flex">
        <button>Generate</button>
        <button>Export</button>
      </div>
      <div class="select-none">
        <Show when={initialized()}>
          <EditContext.Provider value={edit}>
            <Block
              subMap={labelTimeMap()}
              label="total"
              duration={totalDuration()}
            />
          </EditContext.Provider>
        </Show>
      </div>
    </div>
  );
};

export default Report;
