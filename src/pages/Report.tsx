/* @refresh reload */
import * as R from "remeda";
import {
  RadioGroup,
  RadioGroupOption
} from "solid-headless";
import { Icon } from "solid-heroicons";
import { x } from "solid-heroicons/solid";
import {
  Accessor,
  Component,
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  Show,
  useContext
} from "solid-js";
import { useUIState } from "../App";
import { openBulkRenameDialog } from "../components/BulkRename";
import { InputBox } from "../components/InputBox";
import { openLabelEdit } from "../components/LabelEdit";
import { MyButton } from "../components/MyButton";
import { MyTextInput } from "../components/MyTextInput";
import {
  entriesIterator,
  entriesIteratorWithEnds,
  Entry,
  getDistinctLabels,
  Label,
  labelFrom,
  useEntries
} from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { msBetween, specToDate } from "../lib/date";
import { renderDuration, renderTime, renderTimeFull } from "../lib/format";
import { coarseLabel, leafLabel, prefixAndRemainder } from "../lib/labels";
import { DateRange, dateRangeRule, emptyRule, parseString } from "../lib/parse";
import { it, listPairs, now, removeIndex, revit } from "../lib/util";

const second_ms = 1000;
const minute_ms = 60 * second_ms;
const hour_ms = 60 * minute_ms;
const day_ms = 24 * hour_ms;
const week_ms = 7 * day_ms;

function renderPercentage(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function renderReportDuration(time: number, total: number, display: ShowType) {
  switch (display) {
    case "total":
      return renderDuration(time);
    case "daily":
      return `${renderDuration((time * day_ms) / total)}/d`;
    case "weekly":
      return `${renderDuration((time * week_ms) / total)}/w`;
    case "percent":
      return renderPercentage(time / total);
  }
}

const Block: Component<{
  subMap: Map<string, number>;
  label?: Label;
  duration: number;
}> = (props) => {
  const { getLabelInfo } = useUser();

  const { total, entriesInRange, triggerRerender } = useReport();

  const [showType, __] = useUIState<ShowType>("report", "showType");
  const [showLabels, ___] = useUIState<string[]>("report", "showLabels");

  const [info, setInfo] = props.label
    ? getLabelInfo(props.label)
    : [null, null];

  const filteredKeys = () => {
    const base = [...props.subMap.keys()];
    if (showLabels().length === 0) return base;
    return base.filter((topLabel) =>
      R.anyPass(
        topLabel,
        showLabels().map((showLabel) => {
          return (topLabel) => {
            const fullLabel = props.label
              ? props.label + " / " + topLabel
              : topLabel;
            return (
              fullLabel.startsWith(showLabel) || showLabel.startsWith(fullLabel)
            );
          };
        })
      )
    );
  };

  const topLabels = () => {
    return filteredKeys()
      .filter((k) => k.includes("/") === false)
      .sort((a, b) => props.subMap.get(b) - props.subMap.get(a));
  };

  // generate maps of reduced sublabels
  const mapOfMaps = () => {
    const m = new Map<string, Map<string, number>>();
    for (const topLabel of topLabels()) {
      m.set(topLabel, new Map());
    }
    for (const label of filteredKeys()) {
      const [topLabel, rest] = prefixAndRemainder(label);
      if (rest !== "") {
        m.get(topLabel).set(rest, props.subMap.get(label));
      }
    }
    return m;
  };
  const isLeaf = () => mapOfMaps().size == 0;

  const mostRecentEntry = () => {
    for (const [end, start] of listPairs(it(entriesInRange()))) {
      if (labelFrom(start, end).startsWith(props.label)) {
        return start;
      }
    }
  };

  return (
    <>
      <Show when={props.label}>
        <div
          class={!isLeaf() ? "cursor-pointer" : ""}
          onclick={() => setInfo({ expanded: !info.expanded })}
          oncontextmenu={(e) => {
            e.preventDefault();
            if (mostRecentEntry()) {
              openLabelEdit({
                coord: [e.clientX, e.clientY],
                label: props.label,
                entry: mostRecentEntry(),
              });
            }
          }}
        >
          [{renderReportDuration(props.duration, total, showType())}]{" "}
          {leafLabel(props.label)} {!isLeaf() ? "[+]" : ""}
        </div>
      </Show>
      <Show when={info?.expanded || !props.label}>
        <div class="pl-8 flex flex-col">
          <For each={topLabels()}>
            {(topLabel) => (
              <Block
                subMap={mapOfMaps().get(topLabel)}
                label={props.label ? props.label + " / " + topLabel : topLabel}
                duration={props.subMap.get(topLabel)}
              />
            )}
          </For>
        </div>
      </Show>
    </>
  );
};

type ShowType = "total" | "weekly" | "daily" | "percent";
const showTypes = ["total", "weekly", "daily", "percent"];

const ReportContext = createContext<{
  total?: number;
  entriesInRange?: Accessor<Entry[]>;
  triggerRerender?: () => void;
}>({});
const useReport = () => useContext(ReportContext);

export const defaultReportState = {
  rangeString: "today",
  showType: "total",
  showLabels: [],
};

const Report: Component = () => {
  const { entries, labels } = useEntries();

  const [rangeString, setRangeString] = useUIState<string>(
    "report",
    "rangeString"
  );
  const [showType, setShowType] = useUIState<ShowType>("report", "showType");
  const [showLabels, setShowLabels] = useUIState<string[]>(
    "report",
    "showLabels"
  );

  const [dateRange, setDateRange] = createSignal<DateRange>();
  const [error, setError] = createSignal(false);
  createRenderEffect(() => {
    const m = parseString(dateRangeRule, rangeString());
    if (m == "prefix" || m == "fail") {
      console.log("error", m);
      setError(true);
    } else {
      setDateRange(m[0]);
      setError(false);
    }
  });
  const startDate = () => specToDate(dateRange()?.start, now(), "closest");
  const endDate = () => specToDate(dateRange()?.end, now(), "closest");

  const shift = (dir: 1 | -1) => {
    const dur = totalDuration();
    const newStart = new Date(startDate().getTime() + dir * dur);
    const newEnd = new Date(endDate().getTime() + dir * dur);
    setRangeString(`${renderTimeFull(newStart)} to ${renderTimeFull(newEnd)}`);
    triggerRerender();
  };

  const [rerenderSignal, setRerenderSignal] = createSignal(false);
  const triggerRerender = () => setRerenderSignal(!rerenderSignal());

  const totalDuration = () => msBetween(startDate(), endDate());

  const entriesInRange = () => {
    return [
      ...entriesIterator(entries, { start: startDate(), end: endDate() }),
    ];
  };

  const labelsInWeek = createMemo(() => getDistinctLabels(entriesInRange()));

  const labelTimeMap = createMemo(() => {
    rerenderSignal();
    const map: Map<Label, number> = new Map();

    for (const [start, end] of listPairs(
      revit([
        ...entriesIteratorWithEnds(entries, {
          start: startDate(),
          end: endDate(),
        }),
      ])
    )) {
      const time = msBetween(start.time, end.time);
      const label = labelFrom(start, end);

      function add(label: string) {
        map.set(label, (map.get(label) || 0) + time);
        const labelAbove = coarseLabel(label);
        if (labelAbove) add(labelAbove);
      }

      add(label);
    }

    return map;
  });

  return (
    <div class="ml-4 mt-4">
      <div class="space-y-4 h-56">
        <div class="flex">
          <label class="w-16">Range:</label>
          <div class="w-96">
            <div class="flex">
              <MyTextInput
                class="w-96"
                value={rangeString()}
                onchange={(e) => setRangeString(e.currentTarget.value.trim())}
                onEnter={(val) => setRangeString(val.trim())}
              />
            </div>
            <div class="h-0.5" />
            <div class="flex justify-between">
              <div class="text-[10px] text-gray-500">
                {renderTime(startDate())} — {renderTime(endDate())}
              </div>
              <div class="flex border rounded">
                <button
                  class="w-4 h-4 flex items-center justify-center border-r hover:bg-gray-50"
                  onclick={() => shift(-1)}
                >
                  {"«"}
                </button>
                <button
                  class="w-4 h-4 flex items-center justify-center border-l hover:bg-gray-50"
                  onclick={() => shift(1)}
                >
                  {"»"}
                </button>
              </div>
            </div>
          </div>
          <Show when={error()}>
            <div class="ml-2 text-red-400">Parsing error.</div>
          </Show>
        </div>
        <div class="space-y-1">
          <div class="flex">
            <label class="w-16">Labels:</label>
            <InputBox
              class="w-72 px-1 border rounded"
              prefixRule={emptyRule}
              universe={labelsInWeek()}
              submit={async (_, label) => {
                setShowLabels([...showLabels(), label]);
              }}
              clearAndRefocus={true}
            />
          </div>
          <Show when={showLabels().length > 0}>
            <div class="flex">
              <div class="w-16 flex justify-end pr-1">
                <button
                  class="text-gray-500 hover:underline text-xs"
                  onclick={() => setShowLabels([])}
                >
                  Clear all
                </button>
              </div>
              <div class="flex flex-wrap space-x-1 w-56">
                <For each={showLabels()}>
                  {(label, i) => {
                    return (
                      <div class="pl-1 fixeh-6 bg-gray-200 rounded flex items-center">
                        <div>{label}</div>
                        <button
                          class="w-5 h-6 flex justify-center items-center text-gray-500  hover:text-gray-800"
                          onclick={() => {
                            setShowLabels(removeIndex(showLabels(), i()));
                          }}
                        >
                          <Icon path={x} class="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>
        </div>
        <div class="flex">
          <label class="w-16">Show:</label>
          <RadioGroup
            value={showType()}
            onChange={(v) => setShowType(v.toLowerCase() as ShowType)}
          >
            {() => (
              <div class="flex space-x-2 items-center">
                <For each={showTypes}>
                  {(type) => (
                    <RadioGroupOption value={type}>
                      {({ isSelected: checked }) => (
                        <button
                          class={
                            "capitalize rounded px-1 " +
                            (checked()
                              ? "bg-gray-200 outline-1 outline outline-gray-300"
                              : "hover:bg-gray-100")
                          }
                        >
                          {type}
                        </button>
                      )}
                    </RadioGroupOption>
                  )}
                </For>
              </div>
            )}
          </RadioGroup>
        </div>
        <div class="flex space-x-2">
          <MyButton onclick={() => openBulkRenameDialog({ label: "label" })}>
            Export
          </MyButton>
        </div>
      </div>
      <div class="h-2" />
      <div class="select-none overflow-auto">
        [{renderDuration(totalDuration())}] total
        <ReportContext.Provider
          value={{
            total: totalDuration(),
            entriesInRange: entriesInRange,
            triggerRerender,
          }}
        >
          <Block subMap={labelTimeMap()} duration={totalDuration()} />
        </ReportContext.Provider>
      </div>
    </div>
  );
};

export default Report;
