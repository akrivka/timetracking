import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { InputBox } from "../components/InputBox";
import { Entry, entryEquals, useEntries } from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { useWindow } from "../context/WindowContext";
import { stringToColor } from "../lib/colors";
import { specToDate } from "../lib/date";
import { renderDuration, renderTime } from "../lib/format";
import { actionRule, dateRule, parseString } from "../lib/parse";
import { now, minutesAfter, listPairsAndEnds, wait } from "../lib/util";

const EmptyBullet = () => {
  return (
    <div class="flex justify-center items-center w-4 h-4">
      <div class="w-3 h-3 border-2 border-gray-600 rounded-sm" />
    </div>
  );
};

const Bullet: Component<{ entry: Entry }> = (props) => {
  const { dispatch } = useEntries();

  return (
    <div class="flex items-center">
      <div class="flex justify-center items-center w-4 h-4">
        <div class="w-3 h-3 bg-black rounded-full" />
      </div>
      <div class="w-2" />
      <div
        contenteditable={true}
        class="text-sm font-bold"
        onkeydown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const result = parseString(dateRule, e.currentTarget?.innerText);
            if (
              result == "fail" ||
              result == "prefix" ||
              result[2].length > 0
            ) {
              console.log("Error parsing date", result);
            } else {
              dispatch([
                "adjustTime",
                {
                  entry: props.entry,
                  time: specToDate(result[0], props.entry.time, "closest"),
                },
              ]);
            }
          }
        }}
      >
        {renderTime(props.entry.time)}
      </div>
      {/* <div class="text-sm text-gray-400">{props.entry.id}</div> */}
    </div>
  );
};

const Line: Component<{ color: string }> = ({ color }) => {
  return (
    <div class="w-4 flex justify-center">
      <div class="h-20 w-1" style={`background-color: ${color};`} />
    </div>
  );
};

const Track: Component = () => {
  const { time } = useWindow();
  const { entries, labels, dispatch } = useEntries();
  const { getLabelInfo } = useUser();

  const [focusedIndex, setFocusedIndex] = createSignal(null);

  const onkeydown = (e) => {
    if (e.key === "ArrowUp") {
      setFocusedIndex(Math.max(0, focusedIndex() - 1));
    }
    if (e.key === "ArrowDown") {
      setFocusedIndex(Math.min(entries.length - 1, focusedIndex() + 1));
    }
  };

  const inputBox = InputBox({
    prefixRule: actionRule,
    universe: labels,
    focusSignal: focusedIndex,
    class: "bg-blue-50",
    submit: async (action, label) => {
      // start, end
      const i = focusedIndex();
      const start = entries[i];
      const end = i > 0 && entries[i - 1];

      const insertWrapped = (entry: Partial<Entry>, rewire = true) => {
        dispatch(["insert", { start, end, entry, rewire }]);
      };

      switch (action?.kind) {
        case "raw":
        case undefined:
        case null:
          if (!end) {
            dispatch(["insert", { entry: { before: label, time: now() } }]);
          } else {
            dispatch(["relabel", { start, end, label }]);
          }
          break;
        case "now":
          if (!end) {
            dispatch(["relabel", { start, end, label }]);
          }
          break;
        case "continue":
          const middle = start;
          const newStart = entries[i + 1];
          dispatch([
            "deleteRelabel",
            { entry: middle, start: newStart, end, label: middle.before },
          ]);
          break;
        case "first":
          insertWrapped({
            before: label,
            time: minutesAfter(start.time, action.minutes),
          });
          break;
        case "default":
          dispatch([
            "insert",
            {
              start,
              entry: {
                before: label,
                after: end?.before,
                time: minutesAfter(start.time, action.minutes),
              },
            },
          ]);
          break;
        case "last":
          dispatch([
            "insert",
            {
              end,
              entry: {
                time: minutesAfter(end?.time || now(), -action.minutes),
                after: label,
                before: start.after,
              },
            },
          ]);

          if (!end) {
            dispatch(["insert", { entry: { before: label, time: now() } }]);
          }
          break;
        case "untilMinutesAgo":
          dispatch([
            "insert",
            {
              entry: {
                before: label,
                time: minutesAfter(end?.time || now(), -action.minutes),
              },
            },
          ]);
          break;
        case "afterFirstMinutes":
          dispatch([
            "insert",
            {
              end,
              entry: {
                before: start.after,
                after: label,
                time: minutesAfter(start.time, action.minutes),
              },
            },
          ]);
          break;
        case "until":
          dispatch([
            "insert",
            {
              start,
              entry: {
                after: start.after,
                before: label,
                time: specToDate(action.time, start.time, "next"),
              },
            },
          ]);
          break;
        case "after":
          dispatch([
            "insert",
            {
              end,
              entry: {
                after: label,
                before: end?.before || start.after,
                time: specToDate(action.time, end?.time || now(), "previous"),
              },
            },
          ]);
          break;
        case "continueFirst":
          dispatch([
            "adjustTime",
            { entry: start, time: minutesAfter(start.time, action.minutes) },
          ]);
          break;
      }
      setFocusedIndex(i);
    },
  });

  return (
    <Show
      when={entries.length > 0}
      fallback={
        <button onClick={() => dispatch(["append", {}])}>
          Create first entry
        </button>
      }
    >
      <div class="pl-8 pt-4" onkeydown={onkeydown}>
        <EmptyBullet />
        <For each={entries}>
          {(start, i) => {
            const end = createMemo(() => (i() > 0 ? entries[i() - 1] : null));
            const conflict = createMemo(
              () =>
                end() &&
                start.after !== "" &&
                end()?.before !== "" &&
                start.after !== end()?.before
            );
            const label = createMemo(() =>
              !end()
                ? start.after || "TBD"
                : !conflict()
                ? end().before
                : `?conflict-${start.after}-${end()?.before}`
            );

            const color = createMemo(() => getLabelInfo(label())[0].color);

            const duration = createMemo(
              () => (end()?.time?.getTime() || time()) - start?.time.getTime()
            );

            //console.log("(re)rendering", start?.after, end()?.before);

            return (
              <>
                <div class="flex text-sm">
                  <Line color={end() ? color() : "gray"} />
                  <div
                    class="ml-8 pl-1 flex flex-col justify-center cursor-pointer hover:bg-sky-50 w-56"
                    onClick={() => setFocusedIndex(i())}
                  >
                    <div class={conflict() ? "text-red-600" : ""}>
                      {label()}
                    </div>
                    <div>
                      {duration() >= 1000 && renderDuration(duration())}
                    </div>
                  </div>

                  <Show when={focusedIndex() === i()}>
                    <div class="flex items-center">{inputBox}</div>
                  </Show>
                </div>
                <Bullet entry={start} />
              </>
            );
          }}
        </For>
      </div>
    </Show>
  );
};

export default Track;
