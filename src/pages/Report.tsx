/* @refresh reload */
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  RadioGroup,
  RadioGroupLabel,
  RadioGroupOption,
} from "solid-headless";
import {
  Accessor,
  Component,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  useContext,
} from "solid-js";
import { MyButton } from "../components/MyButton";
import { MyTextInput } from "../components/MyTextInput";
import { entriesIterator, Label, useEntries } from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { daysAfter, msBetween } from "../lib/date";
import { renderDuration } from "../lib/format";
import { usePopper } from "../lib/solid-ext";
import { listPairs, revit } from "../lib/util";

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
  label: Label;
  duration: number;
  editable: boolean;
}> = (props) => {
  const { label, duration, editable } = props;
  const { isEdit, triggerRerender, showType, total } = useReport();
  const { getLabelInfo } = useUser();
  const { dispatch } = useEntries();

  const [info, setInfo] = getLabelInfo(label);

  const topLabels = () =>
    [...props.subMap.keys()].filter((k) => k.includes("/") === false);

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
      <div class="flex">
        <div
          class={!isLeaf ? "cursor-pointer" : ""}
          onclick={() => setInfo({ expanded: !info.expanded })}
        >
          [{renderReportDuration(duration, total, showType())}] {label}{" "}
          {!isLeaf() ? "[+]" : ""}
        </div>
        <Show when={editable && isEdit()}>
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
                  { from: label, to: newName(), moveChildren: moveChildren() },
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
                      <div class="w-96 border-2 rounded px-4 py-3 bg-white z-50">
                        <div>Label: {label}</div>
                        <div class="flex">
                          Rename to:{" "}
                          <input
                            type="text"
                            oninput={(e) => setNewName(e.currentTarget.value)}
                            onkeydown={(e) => e.key == "Enter" && onSubmit()}
                          />
                        </div>
                        <div>
                          Move children:{" "}
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
      <Show when={info.expanded}>
        <div class="pl-8 flex flex-col">
          <For each={topLabels()}>
            {(topLabel) => (
              <Block
                subMap={mapOfMaps().get(topLabel)}
                label={topLabel}
                duration={props.subMap.get(topLabel)}
                editable={true}
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

type ShowType = "total" | "weekly" | "daily" | "percent";

const ReportContext = createContext<{
  isEdit?: Accessor<boolean>;
  triggerRerender?: () => void;
  showType?: Accessor<ShowType>;
  total?: number;
}>({});
const useReport = () => useContext(ReportContext);

const Report: Component = () => {
  const { entries, syncState } = useEntries();
  const { initialized } = syncState.local;
  const [startDate, setStart] = createSignal(daysAfter(new Date(), -3));
  const [endDate, setEnd] = createSignal(new Date());
  const [isEdit, setIsEdit] = createSignal(false);
  const [rerenderSignal, setRerenderSignal] = createSignal(false);
  const triggerRerender = () => setRerenderSignal(!rerenderSignal());

  const totalDuration = () => msBetween(startDate(), endDate());

  const labelTimeMap = createMemo(() => {
    rerenderSignal();
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
  });

  const showTypes = ["total", "weekly", "daily", "percent"];

  const [showType, setShowType] = createSignal<ShowType>("total");

  return (
    <div class="space-y-2 ml-4">
      <div class="flex">
        <label class="w-16">Start:</label>
        <MyTextInput class="" />
      </div>
      <div class="flex">
        <label class="w-16">End:</label>
        <MyTextInput class="" />
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
                          "capitalize rounded px-1 py-0.5 " +
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
        <Show when={initialized()}>
          <ReportContext.Provider
            value={{
              isEdit,
              triggerRerender,
              showType,
              total: totalDuration(),
            }}
          >
            <Block
              subMap={labelTimeMap()}
              label="total"
              duration={totalDuration()}
              editable={false}
            />
          </ReportContext.Provider>
        </Show>
      </div>
    </div>
  );
};

export default Report;
