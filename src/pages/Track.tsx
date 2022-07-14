import { Component, createSignal, For, Show } from "solid-js";
import { InputBox } from "../components/InputBox";
import { useEntries } from "../context/EntriesContext";
import { useWindow } from "../context/WindowContext";
import { renderDuration, renderTime } from "../lib/format";
import { actionRule } from "../lib/parse";
import { stringToColor } from "../lib/util";

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
  const { entries, labels, addEntry, updateEntry, syncState } = useEntries();

  const [focusedIndex, setFocusedIndex] = createSignal(null);
  const onkeydown = (e) => {
    if (e.key === "ArrowUp") {
      setFocusedIndex(Math.max(0, focusedIndex() - 1));
    }
    if (e.key === "ArrowDown") {
      setFocusedIndex(Math.min(entries.length - 1, focusedIndex() + 1));
    }
  };

  const { time } = useWindow();

  const inputBox = InputBox({
    prefixRule: actionRule,
    universe: labels,
    focusSignal: focusedIndex,
    class: "bg-blue-50",
    submit: (x, s) => {
      console.log(x, s);
    },
  });

  return (
    <div>
      <Show
        when={entries.length > 0}
        fallback={
          <button onClick={() => addEntry(null)}>Create first entry</button>
        }
      >
        <div class="pl-8 pt-4" onkeydown={onkeydown}>
          <EmptyBullet />
          <For each={entries}>
            {(curEntry, i) => {
              const prevEntry = i() > 0 ? entries[i() - 1] : null;
              return (
                <>
                  <div class="flex text-sm">
                    <Line
                      color={
                        prevEntry
                          ? stringToColor(prevEntry?.before || "")
                          : "gray"
                      }
                    />
                    <div
                      class="ml-8 pl-1 flex flex-col justify-center cursor-pointer hover:bg-sky-50 w-56"
                      onClick={() => setFocusedIndex(i())}
                    >
                      <div>{prevEntry?.before || "TBD"}</div>
                      <div>
                        {renderDuration(
                          (prevEntry?.time.getTime() || time()) -
                            curEntry.time.getTime()
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
                  <Bullet time={curEntry.time} />
                </>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default Track;
