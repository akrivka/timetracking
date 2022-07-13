import {
  Accessor,
  Component,
  createEffect,
  createSignal,
  For,
  Show,
} from "solid-js";
import { SyncState } from "../components/SyncState";
import { Input } from "../components/wrappers";
import { useEntries } from "../context/EntriesContext";
import { useWindow } from "../context/WindowContext";
import { renderDuration, renderTime } from "../lib/format";
import { now, stringToColor } from "../lib/util";

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
  length: Accessor<number>;
  label: () => string;
  editCallback: any;
  color: () => string;
  focusCallback: () => void;
  unfocusCallback: () => void;
  focused: Accessor<boolean>;
};

const Range: Component<RangeProps> = ({
  length,
  label,
  color,
  editCallback,
  focusCallback,
  unfocusCallback,
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
          <div>{renderDuration(length())}</div>
        </div>
      </div>
      <Show when={focused()}>
        <div class="flex items-center">
          <Input
            class="bg-sky-50"
            onEnter={editCallback}
            autofocus={true}
            onBlur={unfocusCallback}
          />
        </div>
      </Show>
    </div>
  );
};

const Track: Component = () => {
  const { entries, addEntry, updateEntry, syncState } = useEntries();

  const [focusedIndex, setFocusedIndex] = createSignal(null);

  const { time } = useWindow();

  return (
    <div>
      <SyncState syncState={syncState} />
      <Show
        when={entries.length !== 0}
        fallback={
          <button onClick={() => addEntry(null)}>Create first entry</button>
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
              setFocusedIndex(Math.min(entries.length - 1, focusedIndex() + 1));
            }
          }}
        >
          <EmptyBullet />
          <Range
            length={() => time() - entries[0].time.getTime()}
            label={() => "TBD"}
            color={() => "gray"}
            editCallback={(newLabel: string) => addEntry({ before: newLabel })}
            focused={() => focusedIndex() === -1}
            focusCallback={() => setFocusedIndex(-1)}
            unfocusCallback={() => setFocusedIndex(null)}
          />
          <For each={entries}>
            {(entry, i) => {
              if (i() === entries.length - 1) return;
              return (
                <>
                  <Bullet time={entry.time} />
                  <Range
                    length={() =>
                      entry.time.getTime() - entries[i() + 1].time.getTime()
                    }
                    label={() => entry.before}
                    color={() => stringToColor(entry.before || "")}
                    editCallback={(newLabel: string) =>
                      updateEntry(entry.id, { before: newLabel })
                    }
                    focused={() => focusedIndex() === i()}
                    focusCallback={() => setFocusedIndex(i())}
                    unfocusCallback={() => setFocusedIndex(null)}
                  />
                </>
              );
            }}
          </For>
          <Bullet time={entries[entries.length - 1].time} />
        </div>
      </Show>
    </div>
  );
};

export default Track;
