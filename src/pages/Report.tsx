/* @refresh reload */
import {
  Popover,
  PopoverButton,
  PopoverPanel
} from "solid-headless";
import {
  Accessor,
  Component,
  createContext, createMemo,
  createSignal,
  For,
  Show,
  useContext
} from "solid-js";
import { MyButton } from "../components/Button";
import { entriesIterator, Label, useEntries } from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { daysAfter, msBetween } from "../lib/date";
import { renderDuration } from "../lib/format";
import { usePopper } from "../lib/solid-ext";
import { listPairs, revit } from "../lib/util";

const Block: Component<{
  subMap: Map<string, number>;
  label: Label;
  duration: number;
  editable: boolean;
}> = (props) => {
  const { label, duration, editable } = props;
  const { isEdit, edited } = useEdit();
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
          [{renderDuration(duration)}] {label} {!isLeaf ? "[+]" : ""}
        </div>
        <Show when={editable && isEdit()}>
          <input
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
                edited();
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

const EditContext = createContext<{ isEdit?: Accessor<boolean>; edited?: () => void }>(
  {}
);
const useEdit = () => useContext(EditContext);

const Report: Component = () => {
  const { entries, syncState } = useEntries();
  const { initialized } = syncState.local;
  const [startDate, setStart] = createSignal(daysAfter(new Date(), -1));
  const [endDate, setEnd] = createSignal(new Date());
  const [isEdit, setIsEdit] = createSignal(false);
  const [editSignal, setEditSignal] = createSignal(false);
  const edited = () => setEditSignal(!editSignal());

  const totalDuration = () => msBetween(startDate(), endDate());

  const labelTimeMap = createMemo(() => {
    editSignal();
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
          onchange={(e) => setIsEdit(e.currentTarget.checked)}
        />
      </div>
      <div class="flex">
        <label class="w-24">Show</label>
        <input class="" type="radio" />
      </div>
      <div class="flex">
        <MyButton onclick={() => null}>Generate4</MyButton>
        <MyButton onclick={() => null}>Export</MyButton>
      </div>
      <div class="select-none">
        <Show when={initialized()}>
          <EditContext.Provider value={{ isEdit, edited }}>
            <Block
              subMap={labelTimeMap()}
              label="total"
              duration={totalDuration()}
              editable={false}
            />
          </EditContext.Provider>
        </Show>
      </div>
    </div>
  );
};

export default Report;
