import {
  Component,
  createResource,
  createSignal,
  Show,
  Switch,
  Match,
  createEffect,
  For,
  createMemo,
} from "solid-js";
import { Entry, makeEntry } from "../lib/entries";
import {
  addEntry,
  connectDB,
  getAllEntries,
  updateEntry,
} from "../lib/localDB";
import {
  renderTime,
  renderDuration,
  now,
  stringToColor,
  setDelay,
  delay,
} from "../lib/util";
import { Input } from "../components/basic";
import { useEntries } from "../lib/entries-context";

type BulletProps = {
  time: Date;
};

const Bullet: Component<BulletProps> = ({ time }) => {
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

type RangeProps = {
  length: number;
  label: () => string;
  editCallback: any;
  color: () => string;
};

const Range: Component<RangeProps> = ({
  length,
  label,
  color,
  editCallback,
  focusCallback,
  unfocusCallack,
  focused,
}) => {
  //  console.log("(Re)rendering! " + label());

  return (
    <div class="flex text-sm">
      <div class="w-4 flex justify-center">
        <div class="h-20 w-1" style={"background-color: " + color() + ";"} />
      </div>
      <div
        class="ml-8 pl-1 flex items-center cursor-pointer hover:bg-sky-50"
        onClick={focusCallback}
      >
        <div>
          <div class="w-48">{label || "TBD"}</div>
          <div>{renderDuration(length)}</div>
        </div>
      </div>
      <Show when={focused()}>
        <div class="flex items-center">
          <Input
            class="bg-sky-50"
            onEnter={editCallback}
            autofocus={true}
            onBlur={unfocusCallack}
          />
        </div>
      </Show>
    </div>
  );
};

const Track: Component = () => {
  const { entries, setEntries, update, syncState } = useEntries();

  const [focusedIndex, setFocusedIndex] = createSignal(null);

  return (
    <div>
      <div class="w-40 h-28 rounded-sm bg-sky-200 border border-sky-600 px-2 py-1 text-[0.6rem] absolute right-1 top-1 flex flex-col justify-between">
        <div class="uppercase font-semibold text-sky-800">sync state</div>
        <p class="whitespace-pre-wrap"> {syncState()}</p>
        <div>
          <input
            class="w-6"
            type="text"
            value={delay}
            onchange={(e) => setDelay(parseInt(e.target.value))}
          />
          ms simulated delay
        </div>
      </div>
      <Show when={entries}>
        <Show
          when={entries.length !== 0}
          fallback={
            <button
              onClick={() => {
                const newEntry = makeEntry();

                update({
                  mutate: () => addEntry(newEntry),
                  expect: () => setEntries([newEntry]),
                });
              }}
            >
              Create first entry
            </button>
          }
        >
          <div
            class="pl-8 pt-4"
            onkeydown={(e) => {
              // if arrow key up
              if (e.keyCode === 38) {
                setFocusedIndex(Math.max(-1, focusedIndex() - 1));
              }
              // if arrow key down
              if (e.keyCode === 40) {
                setFocusedIndex(
                  Math.min(entries.length - 1, focusedIndex() + 1)
                );
              }
            }}
          >
            <EmptyBullet />
            <Range
              length={now() - entries[0].time}
              label={() => "TBD"}
              color={() => "gray"}
              editCallback={async (newLabel: string) => {
                const newEntry = makeEntry();
                newEntry.before = newLabel;
                update({
                  mutate: () => addEntry(newEntry),
                  expect: () => setEntries([newEntry, ...entries]),
                });
              }}
              focused={() => focusedIndex() === -1}
              focusCallback={() => setFocusedIndex(-1)}
              unfocusCallack={() => setFocusedIndex(null)}
            />
            <For each={entries}>
              {(entry, i) => {
                if (i() === entries.length - 1) return;
                return (
                  <>
                    <Bullet time={entry.time} />
                    <Range
                      length={entry.time - entries[i() + 1].time}
                      label={() => entry.before}
                      color={() => stringToColor(entry.before || "")}
                      editCallback={(newLabel: string) => {
                        const newEntry = {
                          before: newLabel,
                          lastModified: now(),
                        };
                        update({
                          mutate: () => updateEntry(entry.id, newEntry),
                          expect: () => setEntries(i(), newEntry),
                        });
                      }}
                      focused={() => focusedIndex() === i()}
                      focusCallback={() => setFocusedIndex(i())}
                      unfocusCallack={() => setFocusedIndex(null)}
                    />
                  </>
                );
              }}
            </For>
            <Bullet time={entries[entries.length - 1].time} />
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default Track;
