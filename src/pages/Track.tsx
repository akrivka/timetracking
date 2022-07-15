import { Component, createSignal, For, Show } from "solid-js";
import { InputBox } from "../components/InputBox";
import { useEntries } from "../context/EntriesContext";
import { useWindow } from "../context/WindowContext";
import { renderDuration, renderTime } from "../lib/format";
import { actionRule } from "../lib/parse";
import { now, stringToColor, minutesAfter } from "../lib/util";

const Bullet: Component<{ time: Date }> = ({ time }) => {
  if (!time) {
    return <EmptyBullet />;
  } else
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

const EmptyBullet: Component = () => {
  return (
    <div class="flex justify-center items-center w-4 h-4">
      <div class="w-3 h-3 border-2 border-gray-600 rounded-sm" />
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
  const { entries, labels, addEntry, dispatch, syncState } = useEntries();

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
    submit: (action, label) => {
      // start, end
      const i = focusedIndex();
      const start = entries[i];
      const end = i > 0 && entries[i - 1];

      // if first entry
      if (!end) {
        switch (action?.kind) {
          case "raw":
          case undefined:
          case null:
            dispatch([
              "insert",
              { start, entry: { before: label, time: now() } },
            ]);
            break;
          case "first":
          case "default":
            dispatch([
              "insert",
              {
                start,
                entry: {
                  before: label,
                  time: minutesAfter(start.time, action.minutes),
                },
              },
            ]);
            break;
          case "last":
            //dispatch
            break;
          case "untilMinutesAgo":
            break;
          case "afterFirstMinutes":
            break;
          case "until":
            break;
          case "after":
            break;
          case "continue":
            dispatch(["delete", { entry: start }]);
            dispatch([
              "relabel",
              { start: entries[i + 1], end, label: start.before },
            ]);
            break;
          case "continueFirst":
            break;
        }
      } else if (focusedIndex() > 0) {
      }
      // if any other entry
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
        <For each={[null, ...entries]}>
          {(curEntry, i) => {
            // get next entry
            const nextEntry = entries[i()];

            return (
              <>
                <Bullet time={curEntry?.time} />
                <div class="flex text-sm">
                  <Line
                    color={
                      curEntry ? stringToColor(curEntry?.before || "") : "gray"
                    }
                  />
                  <div
                    class="ml-8 pl-1 flex flex-col justify-center cursor-pointer hover:bg-sky-50 w-56"
                    onClick={() => setFocusedIndex(i())}
                  >
                    <div>{curEntry?.before || "TBD"}</div>
                    <div>
                      {renderDuration(
                        (curEntry?.time.getTime() || time()) -
                          nextEntry?.time.getTime()
                      )}
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
              </>
            );
          }}
        </For>
      </div>
    </Show>
  );
};

export default Track;
