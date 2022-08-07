/* @refresh reload */
import axios from "axios";
import {
  Dialog,
  DialogOverlay,
  DialogPanel,
  RadioGroup,
  RadioGroupOption,
  Transition
} from "solid-headless";
import { Icon } from "solid-heroicons";
import { x } from "solid-heroicons/solid";
import {
  Component,
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  Show,
  useContext
} from "solid-js";
import { useUIState } from "../App";
import { InputBox } from "../components/InputBox";
import { openLabelEdit } from "../components/LabelEdit";
import { MyButton } from "../components/MyButton";
import { MyTextInput } from "../components/MyTextInput";
import { SpinnerIcon } from "../components/SpinnerIcon";
import {
  entriesIterator,
  entriesIteratorWithEnds,
  getDistinctLabels,
  Label,
  labelFrom,
  useEntries
} from "../context/EntriesContext";
import { useUser, WrappedInfo } from "../context/UserContext";
import { MS_IN_DAYS, MS_IN_WEEKS } from "../lib/constants";
import { msBetween, specToDate } from "../lib/date";
import {
  renderDuration,
  renderPercentage,
  renderTime,
  renderTimeFull
} from "../lib/format";
import {
  coarseLabel,
  getLabelImmediateChildren,
  leafLabel
} from "../lib/labels";
import { DateRange, dateRangeRule, emptyRule, parseString } from "../lib/parse";
import { it, listPairs, now, removeIndex, revit } from "../lib/util";

type ShowType = "total" | "weekly" | "daily" | "percent";
const showTypes = ["total", "weekly", "daily", "percent"];

type ReportProps = {
  labelTimeMap: Map<Label, number>;
  totalDuration: number;
  showType?: ShowType;
  showColors?: boolean;
  getLabelInfo?: (label: Label) => WrappedInfo;
  oncontextmenu?: (e: MouseEvent, label: Label) => void;
};

function renderReportDuration(time: number, total: number, display: ShowType) {
  switch (display) {
    case "total":
      return renderDuration(time);
    case "daily":
      return `${renderDuration((time * MS_IN_DAYS) / total)}/d`;
    case "weekly":
      return `${renderDuration((time * MS_IN_WEEKS) / total)}/w`;
    case "percent":
      return renderPercentage(time / total);
  }
}

const Block: Component<{
  label: Label;
}> = (props) => {
  const report = useReport();
  const { getLabelInfo, oncontextmenu } = report;

  const [info, setInfo] = getLabelInfo(props.label);

  const childrenLabels = createMemo(() =>
    getLabelImmediateChildren(props.label, [...report.labelTimeMap.keys()])
  );

  const isLeaf = createMemo(() => childrenLabels().length === 0);

  return (
    <>
      <div
        class={
          "flex items-center space-x-1 h-6 " +
          (!isLeaf() ? "cursor-pointer" : "")
        }
        onclick={() => setInfo({ expanded: !info.expanded })}
        oncontextmenu={(e) => oncontextmenu(e, props.label)}
      >
        <Show when={report.showColors}>
          <div class="w-1 h-5" style={{ "background-color": info.color }} />
        </Show>
        <span>
          [
          {renderReportDuration(
            report.labelTimeMap.get(props.label),
            report.totalDuration,
            report.showType || "total"
          )}
          ]
        </span>
        <span>
          {leafLabel(props.label)} {!isLeaf() ? "[+]" : ""}
        </span>
      </div>
      <Show when={info?.expanded}>
        <div class="pl-8">
          <For each={childrenLabels()}>
            {(label) => <Block label={label} />}
          </For>
        </div>
      </Show>
    </>
  );
};

const ReportContext = createContext<ReportProps>();
const useReport = () => useContext(ReportContext);

export const Report: Component<ReportProps> = (props) => {
  const topLabels = createMemo(() =>
    getLabelImmediateChildren(null, [...props.labelTimeMap.keys()])
  );

  return (
    <div class="select-none overflow-auto">
      [{renderDuration(props.totalDuration)}] total
      <ReportContext.Provider value={props}>
        <div class="pl-8">
          <For each={topLabels()}>{(label) => <Block label={label} />}</For>
        </div>
      </ReportContext.Provider>
    </div>
  );
};

export type ReportExport = {
  labelTimeMap: Map<Label, number>;
  startDate: Date;
  endDate: Date;
};

export function serializeReportExport(report: ReportExport): string {
  return JSON.stringify({
    ...report,
    labelTimeMap: [...report.labelTimeMap.entries()],
  });
}

export function deserializeReportExport(json: string): ReportExport {
  const { labelTimeMap, startDate, endDate } = JSON.parse(json);
  return {
    labelTimeMap: new Map(labelTimeMap),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };
}

function randomLinkID(): string {
  return Math.random().toString(36).substring(2, 8);
}

const Export: Component<ReportExport> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [ok, setOk] = createSignal();
  createEffect(async () => {
    if (isOpen()) {
      const id = randomLinkID();
      // send to server using axios
      const response = await axios.post(
        "/api/export",
        "id=" +
          encodeURIComponent(id) +
          "&serialized=" +
          encodeURIComponent(serializeReportExport(props))
      );
      console.log(response.data);
      setOk("ok");
    }
  });
  return (
    <>
      <div class="flex space-x-2">
        <MyButton onclick={() => setIsOpen(true)}>Export</MyButton>
      </div>
      <Transition appear show={isOpen()}>
        <Dialog
          isOpen={isOpen()}
          onClose={() => setIsOpen(false)}
          class="fixed inset-0 z-10 overflow-y-auto"
        >
          <div class="min-h-screen flex items-center justify-center">
            <DialogOverlay class="fixed inset-0 bg-gray-800 opacity-25" />
            <DialogPanel class="inline-block w-96 bg-white px-4 py-3 rounded-lg border shadow z-20">
              <Show
                when={ok() === "ok"}
                fallback={
                  <div class="flex items-center justify-center">
                    <SpinnerIcon />
                  </div>
                }
              >
                <div class="space-y-1">copy link</div>
              </Show>
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export const defaultReportState = {
  rangeString: "today",
  showType: "total",
  showLabels: [],
  showColors: false,
};

const ReportPage: Component = () => {
  const { entries } = useEntries();
  const { getLabelInfo } = useUser();

  const [rangeString, setRangeString] = useUIState<string>(
    "report",
    "rangeString"
  );
  const [showType, setShowType] = useUIState<ShowType>("report", "showType");
  const [showLabels, setShowLabels] = useUIState<string[]>(
    "report",
    "showLabels"
  );
  const [showColors, setShowColors] = useUIState<boolean>(
    "report",
    "showColors"
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

  const startDate = createMemo(() =>
    specToDate(dateRange()?.start, now(), "closest")
  );
  const endDate = createMemo(() =>
    specToDate(dateRange()?.end, now(), "closest")
  );

  const shift = (dir: 1 | -1) => {
    const dur = totalDuration();
    const newStart = new Date(startDate().getTime() + dir * dur);
    const newEnd = new Date(endDate().getTime() + dir * dur);
    setRangeString(`${renderTimeFull(newStart)} to ${renderTimeFull(newEnd)}`);
  };

  const totalDuration = createMemo(() => msBetween(startDate(), endDate()));

  const entriesInRange = createMemo(() => {
    return [
      ...entriesIterator(entries, { start: startDate(), end: endDate() }),
    ];
  });

  const labelsInRange = createMemo(() => getDistinctLabels(entriesInRange()));

  const labelTimeMap = createMemo(() => {
    const m: Map<Label, number> = new Map();

    for (const [start, end] of listPairs(
      revit([
        ...entriesIteratorWithEnds(entries, {
          start: startDate(),
          end: endDate(),
        }),
      ])
    )) {
      let label = labelFrom(start, end);

      if (
        showLabels().length === 0 ||
        showLabels().some((l) => label.startsWith(l) || l.startsWith(label))
      ) {
        const time = msBetween(start.time, end.time);
        while (label) {
          m.set(label, (m.get(label) ?? 0) + time);
          label = coarseLabel(label);
        }
      }
    }

    return new Map([...m].sort((a, b) => b[1] - a[1]));
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
              universe={labelsInRange()}
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
        <div class="flex">
          <label class="w-16">Colors:</label>
          <input
            type="checkbox"
            checked={showColors()}
            onchange={(e) => setShowColors(e.currentTarget.checked)}
          />
        </div>
        <Export
          labelTimeMap={labelTimeMap()}
          startDate={startDate()}
          endDate={endDate()}
        />
      </div>
      <div class="h-2" />

      <Report
        labelTimeMap={labelTimeMap()}
        totalDuration={totalDuration()}
        showType={showType()}
        showColors={showColors()}
        getLabelInfo={getLabelInfo}
        oncontextmenu={(e, label) => {
          e.preventDefault();

          for (const [end, start] of listPairs(it(entriesInRange()))) {
            if (labelFrom(start, end).startsWith(label)) {
              openLabelEdit({
                coord: [e.clientX, e.clientY],
                label: label,
                entry: start,
              });
              break;
            }
          }
        }}
      />
    </div>
  );
};

export default ReportPage;
