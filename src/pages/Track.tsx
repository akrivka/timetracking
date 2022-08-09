import { createVirtualizer } from "@tanstack/solid-virtual";
import { useLocation } from "solid-app-router";
import { Icon } from "solid-heroicons";
import { chevronDown, chevronUp, x } from "solid-heroicons/solid";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show
} from "solid-js";
import { useUIState } from "../App";
import { InputBox } from "../components/InputBox";
import { useEntries } from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { useWindow } from "../context/WindowContext";
import { specToDate } from "../lib/date";
import { Entry, labelFrom } from "../lib/entries";
import { renderDuration, renderTime } from "../lib/format";
import { coarseLabel, leafLabel } from "../lib/labels";
import { actionRule, dateRule, emptyRule, parseString } from "../lib/parse";
import { minutesAfter, now } from "../lib/util";

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
        class="text-sm font-bold px-1"
        onkeydown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const result = parseString(dateRule, e.currentTarget?.innerText);
            if (result == "fail" || result == "prefix") {
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

  const [focusedIndex, setFocusedIndex] = useUIState<number | null>(
    "track",
    "focusedIndex"
  );

  const onkeydown = (e) => {
    if (e.key === "Escape") {
      setFocusedIndex(-1);
    }
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
    clearAndRefocus: true,
    class: "w-72 px-1 border rounded bg-gray-50",
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
            dispatch([
              "insert",
              {
                entry: {
                  before: !label || label == "" ? start.after : label,
                  time: now(),
                },
              },
            ]);
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
            {
              entry: middle,
              start: newStart,
              end,
              label: labelFrom(newStart, middle),
            },
          ]);
          break;
        case "reverseContinue":
          const middle2 = start;
          const newStart2 = entries[i + 1];
          dispatch([
            "deleteRelabel",
            {
              entry: middle2,
              start: newStart2,
              end,
              label: labelFrom(middle2, end),
            },
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

  let scrollRef;

  const virtualizer = createVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef,
    estimateSize: () => 100,
    scrollPaddingStart: 16,
    overscan: 5,
  });

  const [showSearch, setShowSearch] = useUIState<boolean>(
    "track",
    "showSearch"
  );
  const [searchText, setSearchText] = useUIState<string>("track", "searchText");

  const [currentJump, setCurrentJump] = useUIState<number>(
    "track",
    "currentJump"
  );

  const jumpIndices = () => {
    const search = searchText();
    if (!search) {
      return [];
    }
    const searchLower = search.toLowerCase();
    return entries.reduce((acc, start, i) => {
      const end = i > 0 && entries[i - 1];
      if (labelFrom(start, end).toLowerCase().includes(searchLower)) {
        acc.push(i);
      }
      return acc;
    }, [] as number[]);
  };

  const refocusIndex = (i) => {
    setFocusedIndex(-1);
    setFocusedIndex(i);
  };

  const scrollToIndex = (i, options?) => {
    let scrollingTimeout;
    scrollRef.addEventListener("scroll", function handler(e) {
      window.clearTimeout(scrollingTimeout);
      scrollingTimeout = setTimeout(() => {
        //console.log("finised scrolling");

        refocusIndex(i);
        document.removeEventListener("scroll", handler);
      }, 40);
    });
    refocusIndex(i);

    virtualizer.scrollToIndex(i - 1, { align: "start", ...options });
  };

  createEffect(async () => {
    const i = jumpIndices()[currentJump()];

    scrollToIndex(i);
  });

  const [focusSearchSignal, setFocusSearchSignal] = createSignal(null);
  const focusSearch = () => setFocusSearchSignal(!focusSearchSignal());

  const jumpDown = () => {
    setCurrentJump(Math.min(currentJump() + 1, jumpIndices().length - 1));
  };

  const jumpUp = () => {
    setCurrentJump(Math.max(currentJump() - 1, 0));
  };

  const closeSearch = () => {
    setSearchText("");
    setShowSearch(false);
  };

  onMount(() => {
    document.addEventListener("keydown", async (e) => {
      // if cmd/ctrl+enter pressed
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        scrollToIndex(0);
      } else if (e.key == "Enter") {
        // document.activeElement is not of type input
        if (document.activeElement.tagName != "INPUT" && focusedIndex() >= 0) {
          refocusIndex(focusedIndex());
        }
      }
      // if cmd/ctrl+f pressed
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSearch(true);
        setSearchText("");
        focusSearch();
      }
      // if ctrl+n pressed
      if (e.key === "n" && e.ctrlKey) {
        e.preventDefault();
        jumpDown();
      }
      // if ctrl+p pressed
      if (e.key === "p" && e.ctrlKey) {
        e.preventDefault();
        jumpUp();
      }
    });
  });

  const location = useLocation();
  onMount(() => {
    if (location.state) {
      //@ts-ignore
      const { entry } = location.state;
      if (entry) {
        const i = entries.findIndex((e) => e.id === entry.id);
        scrollToIndex(i, { smoothScroll: false });
      }
    }
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
      <Show when={showSearch()}>
        <div class="z-50 fixed -top-1 right-8 px-2 pb-1 rounded border shadow focus-within:bg-gray-50">
          <div class="h-2" />
          <div class="flex items-center space-x-">
            <div
              class="relative"
              onkeydown={(e) => e.key == "Escape" && closeSearch()}
            >
              <InputBox
                class="w-64 px-1 focus:bg-gray-50 focus:outline-none"
                prefixRule={emptyRule}
                universe={labels}
                focusSignal={focusSearchSignal}
                submit={async (_, label) => {
                  setSearchText(label.trim());
                }}
                placeholder="Search..."
                value={searchText()}
              />
              <Show when={searchText() !== ""}>
                <div class="absolute top-1 right-1 pointer-events-none text-xs text-gray-400">
                  {currentJump() + 1}/{jumpIndices().length}
                </div>
              </Show>
            </div>
            <button
              class="w-5 h-5 p-0.5 hover:bg-gray-100 rounded text-gray-500"
              onclick={jumpUp}
            >
              <Icon path={chevronUp} />
            </button>
            <button
              class="w-5 h-5 p-0.5 hover:bg-gray-100 rounded text-gray-500"
              onclick={jumpDown}
            >
              <Icon path={chevronDown} />
            </button>
            <button
              class="w-5 h-5 p-0.5 hover:bg-gray-100 rounded text-gray-500"
              onclick={closeSearch}
            >
              <Icon path={x} />
            </button>
          </div>
        </div>
      </Show>
      <div class="pl-8 pt-4">
        <div ref={scrollRef} class="h-screen w-full overflow-auto no-scrollbar">
          <EmptyBullet />
          <div
            class="w-full relative"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const i = virtualItem.index;
              const start = entries[i];
              const end = createMemo(() => (i > 0 ? entries[i - 1] : null));
              //console.log("rerendering", labelFrom(start, end));
              const conflict = createMemo(
                () =>
                  end() &&
                  start?.after &&
                  start?.after !== "" &&
                  end()?.before &&
                  end()?.before !== "" &&
                  start.after !== end()?.before
              );
              const label = createMemo(() => labelFrom(start, end()));

              const color = createMemo(() => getLabelInfo(label())[0].color);

              const duration = createMemo(
                () => (end()?.time?.getTime() || time()) - start?.time.getTime()
              );

              //console.log("(re)rendering", start?.after, end()?.before);

              return (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div class="flex text-sm" data-label={label()}>
                    <Line color={end() ? color() : "gray"} />
                    <div
                      class="ml-8 pl-1 flex flex-col justify-center cursor-pointer hover:bg-sky-50 w-56"
                      onClick={() => setFocusedIndex(i)}
                    >
                      <div class={conflict() ? "text-red-600" : ""}>
                        <div>{leafLabel(label())}</div>
                        <div class="text-xs text-gray-400 -translate-y-0.5">
                          {coarseLabel(label())}
                        </div>
                      </div>
                      <div>
                        {duration() >= 1000 && renderDuration(duration())}
                      </div>
                    </div>

                    <Show when={focusedIndex() === i}>
                      <div
                        class="flex items-center"
                        onkeydown={onkeydown}
                        onfocusout={(e) => {
                          if (focusedIndex() === i) {
                            setFocusedIndex(-1);
                          }
                        }}
                      >
                        {inputBox}
                      </div>
                    </Show>
                  </div>
                  <Bullet entry={start} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Track;
