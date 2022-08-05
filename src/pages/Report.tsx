/* @refresh reload */
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  RadioGroup,
  RadioGroupOption,
} from "solid-headless";
import {
  Accessor,
  Component,
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  Show,
  useContext,
} from "solid-js";
import { useUIState } from "../App";
import { MyButton } from "../components/MyButton";
import { MyTextInput } from "../components/MyTextInput";
import {
  entriesIterator,
  entriesIteratorWithEnds,
  Label,
  labelFrom,
  useEntries,
} from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { msBetween, specToDate } from "../lib/date";
import { renderDuration, renderTime, renderTimeFull } from "../lib/format";
import { coarseLabel, leafLabel, prefixAndRemainder } from "../lib/labels";
import { DateRange, dateRangeRule, parseString } from "../lib/parse";
import { usePopper } from "../lib/solid-ext";
import { listPairs, now, revit } from "../lib/util";

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
  const { dispatch } = useEntries();

  const { triggerRerender, total } = useReport();

  const [isEdit, _] = useUIState<boolean>("report", "isEdit");
  const [showType, __] = useUIState<ShowType>("report", "showType");

  const [info, setInfo] = props.label
    ? getLabelInfo(props.label)
    : [null, null];

  const topLabels = () =>
    [...props.subMap.keys()]
      .filter((k) => k.includes("/") === false)
      .sort((a, b) => props.subMap.get(b) - props.subMap.get(a));

  // generate maps of reduced sublabels
  const mapOfMaps = () => {
    const m = new Map<string, Map<string, number>>();
    for (const topLabel of topLabels()) {
      m.set(topLabel, new Map());
    }
    for (const label of props.subMap.keys()) {
      const [topLabel, rest] = prefixAndRemainder(label);
      if (rest !== "") {
        m.get(topLabel).set(rest, props.subMap.get(label));
      }
    }
    return m;
  };
  const isLeaf = () => mapOfMaps().size == 0;

  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const [popper, setPopper] = createSignal<HTMLElement>();
  usePopper(anchor, popper, { placement: "top" });

  return (
    <>
      <Show when={props.label}>
        <div class="flex">
          <div
            class={!isLeaf() ? "cursor-pointer" : ""}
            onclick={() => setInfo({ expanded: !info.expanded })}
          >
            [{renderReportDuration(props.duration, total, showType())}]{" "}
            {leafLabel(props.label)} {!isLeaf() ? "[+]" : ""}
          </div>
          <Show when={isEdit()}>
            <div class="w-2" />
            <input
              class="w-6 h-6"
              type="color"
              value={info.color}
              onchange={(e) => setInfo({ color: e.currentTarget.value })}
            />
            <div class="w-3" />
            <Popover class="relative" defaultOpen={false}>
              {({ isOpen, setState }) => {
                const [newName, setNewName] = createSignal("");
                const [moveChildren, setMoveChildren] = createSignal(true);

                const onSubmit = () => {
                  dispatch([
                    "bulkRename",
                    {
                      from: props.label,
                      to: newName(),
                      moveChildren: moveChildren(),
                    },
                  ]);
                  setState(false);
                  triggerRerender();
                };
                return (
                  <>
                    <PopoverButton ref={setAnchor} class="text-gray-400">
                      [rename]
                    </PopoverButton>
                    <Show when={isOpen()}>
                      <PopoverPanel ref={setPopper} unmount={false}>
                        <div class="w-96 border-2 rounded px-4 py-3 bg-white z-50 space-y-1">
                          <div class="flex">
                            <label class="w-28">Label:</label>
                            {props.label}
                          </div>
                          <div class="flex">
                            <label class="w-28">Rename to:</label>
                            <MyTextInput
                              oninput={(e) => setNewName(e.currentTarget.value)}
                              onEnter={onSubmit}
                            />
                          </div>
                          <div class="flex">
                            <label class="w-28">Move children:</label>
                            <input
                              type="checkbox"
                              checked
                              onchange={(e) =>
                                setMoveChildren(e.currentTarget.checked)
                              }
                            />
                          </div>
                          <MyButton onclick={onSubmit}>Done</MyButton>
                        </div>
                      </PopoverPanel>
                    </Show>
                  </>
                );
              }}
            </Popover>
          </Show>
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
  triggerRerender?: () => void;
  total?: number;
}>({});
const useReport = () => useContext(ReportContext);

export const defaultReportState = {
  rangeString: "today",
  showType: "total",
  isEdit: false,
};

const Report: Component = () => {
  const { entries, syncState } = useEntries();

  const [rangeString, setRangeString] = useUIState<string>(
    "report",
    "rangeString"
  );
  const [showType, setShowType] = useUIState<ShowType>("report", "showType");
  const [isEdit, setIsEdit] = useUIState<boolean>("report", "isEdit");

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
    <div class="space-y-2 ml-4 mt-4">
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
      <div class="flex">
        <label class="w-16">Labels:</label>
        <MyTextInput class="" />
      </div>
      <div class="flex">
        <label class="w-16">Edit:</label>
        <input
          class=""
          type="checkbox"
          checked={isEdit()}
          onchange={(e) => setIsEdit(e.currentTarget.checked)}
        />
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
        <MyButton onclick={() => null}>Generate</MyButton>
        <MyButton onclick={() => null}>Export</MyButton>
      </div>
      <div class="h-2" />
      <div class="select-none">
        [{renderDuration(totalDuration())}] total
        <ReportContext.Provider
          value={{
            triggerRerender,
            total: totalDuration(),
          }}
        >
          <Block subMap={labelTimeMap()} duration={totalDuration()} />
        </ReportContext.Provider>
      </div>
    </div>
  );
};

export default Report;
