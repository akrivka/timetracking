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
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch
} from "solid-js";
import { useUIState } from "../App";
import { InputBox } from "../components/InputBox";
import { openLabelEdit } from "../components/LabelEdit";
import { MyButton } from "../components/MyButton";
import { MyTextInput } from "../components/MyTextInput";
import Report, { ShowType } from "../components/ReportComp";
import { SpinnerIcon } from "../components/SpinnerIcon";
import { useEntries } from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { msBetween, specToDate } from "../lib/date";
import {
  Label,
  entriesIterator,
  entriesIteratorWithEnds,
  getDistinctLabels,
  labelFrom
} from "../lib/entries";
import { renderTime, renderTimeFull } from "../lib/format";
import { coarseLabel } from "../lib/labels";
import { DateRange, dateRangeRule, emptyRule, parseString } from "../lib/parse";
import { listPairs, now, removeIndex, revit, wait } from "../lib/util";

const showTypes = ["total", "weekly", "daily", "percent"];

export type ReportExport = {
  labelTimeMap: Map<Label, number>;
  totalDuration: number;
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
  const { labelTimeMap, totalDuration, startDate, endDate } = JSON.parse(json);
  return {
    labelTimeMap: new Map(labelTimeMap),
    totalDuration: totalDuration,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };
}

function randomLinkID(): string {
  return Math.random().toString(36).substring(2, 8);
}

function baseURL(): string {
  const url = window.location;
  return url.protocol + "//" + url.host;
}

const Export: Component<ReportExport> = (props) => {
  const { credentials } = useUser();

  const [isOpen, setIsOpen] = createSignal(false);
  const [ok, setOk] = createSignal();
  const [id, setId] = createSignal();

  createEffect(async () => {
    if (isOpen()) {
      const id = randomLinkID();
      // send to server using axios
      const response = await axios.post(
        "/api/export",
        "id=" +
          encodeURIComponent(id) +
          "&username=" +
          encodeURIComponent(credentials.username) +
          "&serialized=" +
          encodeURIComponent(serializeReportExport(props))
      );
      if (response.data === "ok") {
        setOk("ok");
        setId(id);
      } else {
        setOk("error");
      }
    }
  });

  const link = createMemo(() => `${baseURL()}/r/${id()}`);

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
            <DialogPanel class="inline-block w-96 h-32 bg-white px-4 py-3 rounded-lg border shadow z-20">
              <Switch>
                <Match when={!ok()}>
                  <div class="flex items-center justify-center">
                    <SpinnerIcon />
                  </div>
                </Match>
                <Match when={ok() === "error"}>error</Match>
                <Match when={ok() === "ok"}>
                  <div class="flex flex-col h-full justify-between space-y-1">
                    <div class="flex h-16 items-center justify-center">
                      <input
                        class="w-72 border px-2 py-0.5 rounded focus:outline-none text-center"
                        readonly
                        ref={async (e) => {
                          await wait(100);
                          e.select();
                        }}
                        value={link()}
                      />
                    </div>
                    <div class="flex justify-end space-x-1">
                      <MyButton
                        onclick={() => navigator.clipboard.writeText(link())}
                      >
                        Copy
                      </MyButton>
                      <MyButton onclick={() => setIsOpen(false)}>
                        Close
                      </MyButton>
                    </div>
                  </div>
                </Match>
              </Switch>
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
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
    dateRange()?.start
      ? specToDate(dateRange()?.start, now(), "closest")
      : entries[entries.length - 1].time
  );

  const endDate = createMemo(() =>
    dateRange()?.end ? specToDate(dateRange()?.end, now(), "closest") : now()
  );

  const shift = (dir: 1 | -1) => {
    const dur = msBetween(startDate(), endDate());
    const newStart = new Date(startDate().getTime() + dir * dur);
    const newEnd = new Date(endDate().getTime() + dir * dur);
    setRangeString(`${renderTimeFull(newStart)} to ${renderTimeFull(newEnd)}`);
  };

  const isFiltered = createMemo(() => showLabels().length > 0);

  const [totalDuration, setTotalDuration] = createSignal(0);

  const entriesInRange = createMemo(() => {
    return [
      ...entriesIterator(entries, { start: startDate(), end: endDate() }),
    ];
  });

  const labelsInRange = createMemo(() => getDistinctLabels(entriesInRange()));

  const labelTimeMap = createMemo(() => {
    const m: Map<Label, number> = new Map();
    let dur = 0;

    const _now = now();

    for (const [start, end] of listPairs(
      revit([
        ...entriesIteratorWithEnds(entries, {
          start: startDate() < now() ? startDate() : now(),
          end: endDate() < _now ? endDate() : _now,
        }),
      ])
    )) {
      if (end.time.getTime() === _now.getTime()) continue;

      const baseLabel = labelFrom(start, end);
      const prefix = showLabels().find((l) => baseLabel.startsWith(l));

      if (!isFiltered() || prefix) {
        const time = msBetween(start.time, end.time);
        let label = !isFiltered()
          ? baseLabel
          : baseLabel
              .slice((prefix ?? "").length)
              .trim()
              .slice(1);

        dur += time;
        while (label) {
          m.set(label, (m.get(label) ?? 0) + time);
          label = coarseLabel(label);
        }
      }
    }
    setTotalDuration(dur);

    return new Map([...m].sort((a, b) => b[1] - a[1]));
  });

  const onkeydown = (e) => {
    if (!(e.target instanceof HTMLInputElement)) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        dateRangeInputEl.focus();
      } else if (e.key === "ArrowLeft") {
        shift(-1);
      } else if (e.key === "ArrowRight") {
        shift(1);
      }
    }
  };
  let dateRangeInputEl: HTMLInputElement | undefined;
  onMount(() => {
    document.addEventListener("keydown", onkeydown);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", onkeydown);
  });

  return (
    <div class="pl-4 pt-4 h-screen overflow-auto">
      <div class="space-y-4 min-h-[16rem]">
        <div class="flex">
          <label class="w-16">Range:</label>
          <div class="w-96">
            <div class="flex">
              <MyTextInput
                ref={dateRangeInputEl}
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
                  tabindex={-1}
                >
                  {"«"}
                </button>
                <button
                  class="w-4 h-4 flex items-center justify-center border-l hover:bg-gray-50"
                  onclick={() => shift(1)}
                  tabindex={-1}
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
              universe={labelsInRange().filter(
                (l1) => !showLabels().some((l2) => l1.startsWith(l2))
              )}
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
              <div class="flex flex-wrap w-1/2">
                <For each={showLabels()}>
                  {(label, i) => {
                    return (
                      <div class="pl-1 mx-1 my-0.5 h-6 bg-gray-200 rounded flex items-center">
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
                          tabindex={-1}
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
          totalDuration={totalDuration()}
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
        oncontextmenu={
          !isFiltered() &&
          ((e, label) => {
            e.preventDefault();

            for (const [end, start] of listPairs(
              entriesIterator(entries, { end: endDate() })
            )) {
              if (labelFrom(start, end).startsWith(label)) {
                openLabelEdit({
                  coord: [e.clientX, e.clientY],
                  label: label,
                  entry: end,
                });
                break;
              }
            }
          })
        }
      />
    </div>
  );
};

export default ReportPage;
