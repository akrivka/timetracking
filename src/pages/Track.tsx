import { Component, createSignal, For, Show } from "solid-js";
import { InputBox } from "../components/InputBox";
import { Entry, useEntries } from "../context/EntriesContext";
import { useWindow } from "../context/WindowContext";
import { renderDuration, renderTime } from "../lib/format";
import { actionRule } from "../lib/parse";
import {
  now,
  stringToColor,
  minutesAfter,
  listPairsAndEnds,
} from "../lib/util";

const EmptyBullet = () => {
  return (
    <div class="flex justify-center items-center w-4 h-4">
      <div class="w-3 h-3 border-2 border-gray-600 rounded-sm" />
    </div>
  );
};

const Bullet: Component<{ time: Date }> = ({ time }) => {
  return (
    <div class="flex items-center">
      <div class="flex justify-center items-center w-4 h-4">
        <div class="w-3 h-3 bg-black rounded-full" />
      </div>
      <div class="w-2" />
      <div class="text-sm font-bold">{renderTime(time)}</div>
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
  const { entries, labels, addEntry, dispatch } = useEntries();

  const [focusedIndex, setFocusedIndex] = createSignal(null);
  const [newEntry, setNewEntry] = createSignal(null);

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
    universe: [...labels],
    focusSignal: focusedIndex,
    class: "bg-blue-50",
    submit: (action, label) => {
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
            insertWrapped({ before: label, time: now() });
          } else {
            dispatch(["relabel", { start, end, label }]);
          }
          break;
        case "first":
        case "default":
          insertWrapped({
            before: label,
            time: minutesAfter(start.time, action.minutes),
          });
          break;
        case "now":
          dispatch(["relabel", { start, end, label }]);
          break;
        case "last":
          console.log("start.after", start.after);

          insertWrapped({
            time: minutesAfter(end?.time || now(), -action.minutes),
            after: label,
            before: start.after,
          });

          if (!end) {
            insertWrapped(
              {
                before: label,
                time: now(),
              },
              false
            );
          }
          break;
        case "untilMinutesAgo":
          insertWrapped({
            before: label,
            time: minutesAfter(end?.time || now(), -action.minutes),
          });
          break;
        case "afterFirstMinutes":
          insertWrapped({
            after: label,
            time: minutesAfter(start.time, action.minutes),
          });
          break;
        case "until":
          insertWrapped({ before: label, time: action.time });
          break;
        case "after":
          insertWrapped({ after: label, time: action.time });
          break;
        case "continue":
          const middle = start;
          const newStart = entries[i + 1];
          dispatch(["delete", { entry: middle }]);
          dispatch(["relabel", { start: newStart, end, label: middle.before }]);
          break;
        case "continueFirst":
          break;
      }
    },
  });

  return (
    <Show
      when={entries.length > 0}
      fallback={
        <button onClick={() => addEntry(null)}>Create first entry</button>
      }
    >
      <div class="pl-8 pt-4" onkeydown={onkeydown}>
        <EmptyBullet />
        <For each={entries}>
          {(start, i) => {
            const end = i() > 0 ? entries[i() - 1] : null;
            const label = !end
              ? start.after || "TBD"
              : start.after === end?.before
              ? start.after
              : `?conflict-${start.after}-${end.before}`;

            const duration = () =>
              (end?.time?.getTime() || time()) - start?.time.getTime();
            console.log("rendering", start?.after, end?.before);

            return (
              <>
                <div class="flex text-sm">
                  <Line
                    color={end ? stringToColor(end?.before || "") : "gray"}
                  />
                  <div
                    class="ml-8 pl-1 flex flex-col justify-center cursor-pointer hover:bg-sky-50 w-56"
                    onClick={() => setFocusedIndex(i())}
                  >
                    <div>{label}</div>
                    <div>
                      {duration() >= 1000 && renderDuration(duration())}
                    </div>
                  </div>

                  <Show when={focusedIndex() === i()}>
                    <div
                      class="flex items-center"
                      onfocusout={() => setFocusedIndex(null)}
                    >
                      {inputBox}
                    </div>
                  </Show>
                </div>
                <Bullet time={start?.time} />
              </>
            );
          }}
        </For>
      </div>
    </Show>
  );
};

export default Track;
