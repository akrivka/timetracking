import * as R from "remeda";
import { Icon } from "solid-heroicons";
import {
  chevronDown,
  chevronLeft,
  chevronRight,
  chevronUp,
} from "solid-heroicons/solid";
import {
  Component,
  createMemo,
  createSignal,
  For,
  Index,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { useUIState } from "../App";
import { openLabelEdit } from "../components/LabelEdit";
import { useEntries } from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { MS_IN_HOURS } from "../lib/constants";
import {
  daysAfter,
  hoursBetween,
  msBetween,
  nextMidnight,
  nextWeek,
  prevWeek,
} from "../lib/date";
import { Entry, labelFrom } from "../lib/entries";
import { renderDay } from "../lib/format";
import { coarseLabel } from "../lib/labels";
import { it, listPairs, now } from "../lib/util";

const UpDownInput = (props) => {
  return (
    <div class="w-4 flex flex-col h-8">
      <Show
        when={props.value > props.boundaries[0]}
        fallback={<div class="h-1/2" />}
      >
        <button
          tabindex="-1"
          class="h-1/2 hover:bg-gray-100"
          onclick={() => props.setValue(props.value - 1)}
        >
          <Icon
            class="w-4 h-3 flex justify-center items-center rounded"
            path={chevronUp}
          />
        </button>
      </Show>
      <Show
        when={props.value < props.boundaries[1]}
        fallback={<div class="h-1/2" />}
      >
        <button
          tabindex="-1"
          class="h-1/2 hover:bg-gray-100"
          onclick={() => props.setValue(props.value + 1)}
        >
          <Icon
            class="w-4 h-3 flex justify-center items-center rounded"
            path={chevronDown}
          />
        </button>
      </Show>
    </div>
  );
};

const Calendar: Component = () => {
  const { entries } = useEntries();
  const { getLabelInfo } = useUser();

  const [week, setWeek] = useUIState<Date>("calendar", "week");

  const startDay = () => week();
  const endDay = () => daysAfter(week(), 7);

  const [startHours, setStartHours] = createSignal<number>(0);
  const [endHours, setEndHours] = createSignal<number>(24);

  const msInADay = () => (endHours() - startHours()) * MS_IN_HOURS;

  const entriesInWeek = createMemo(() => {
    const es = [...entries];
    const start = es.find((entry) => entry.time < startDay());
    const end = R.reverse(es).find((entry) => entry.time > endDay());
    return [
      { ...start, time: startDay() },
      ...es
        .filter((entry) => entry.time > startDay() && entry.time < endDay())
        .reverse(),
      { ...end, time: endDay() < now() ? endDay() : now() },
    ];
  });

  // helper function
  const getVisibleLabel = (label: string | null) => {
    if (!label) return null;
    let visibleLabel = label;
    let coarser = label;
    while ((coarser = coarseLabel(coarser))) {
      const [info, _] = getLabelInfo(coarser);
      if (!info.expanded) visibleLabel = coarser;
    }
    return visibleLabel;
  };

  const intervalsInWeek = createMemo(() => {
    return [...listPairs(it(entriesInWeek()))].reduce((acc, [start, end]) => {
      if (acc.length == 0)
        return [[{ ...start, after: labelFrom(start, end) }, end]];

      const visibleLabel = getVisibleLabel(labelFrom(start, end));
      const prevVisibleLabel = getVisibleLabel(acc[acc.length - 1][0].after);

      if (prevVisibleLabel == visibleLabel) {
        acc[acc.length - 1][1] = end;
        return acc;
      } else {
        return [...acc, [{ ...start, after: labelFrom(start, end) }, end]];
      }
    }, []);
  });

  type Interval = [Partial<Entry>, Partial<Entry>];

  const dayIntervals = createMemo(() => {
    const result: Interval[][] = [...Array(7)].map((_) => []);
    let day = 0;

    for (const [start, end] of intervalsInWeek()) {
      let a = start;
      let b = end;
      let nm = nextMidnight(start.time);
      while (nm < end.time && day < 7) {
        let newB = {
          time: nm,
          before: end.before,
          after: end.before,
          id: start.id,
        };
        result[day].push([a, newB]);
        day++;
        a = newB;
        nm = nextMidnight(nm);
      }
      day < 7 && result[day].push([a, b]);
    }

    return result;
  });

  const dayInfos = createMemo(() => {
    return dayIntervals().map((intervals, i) => {
      const hiddenBefore = [];
      const hiddenAfter = [];
      const visibleIntervals = [];

      const day = daysAfter(startDay(), i);

      const newStart = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        startHours(),
        0
      );
      const newEnd = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        endHours(),
        0
      );

      for (let [start, end] of intervals) {
        if (end.time > now()) {
          end = { ...end, time: now() };
        }
        if (
          hoursBetween(start.time, day) <= startHours() &&
          hoursBetween(end.time, day) >= endHours()
        ) {
          const label = labelFrom(start, end);
          hoursBetween(start.time, day) < startHours() &&
            hiddenBefore.push(label);
          hoursBetween(end.time, day) > endHours() && hiddenAfter.push(label);
          visibleIntervals.push([
            { ...start, time: newStart },
            { ...end, time: newEnd },
          ]);
        } else if (hoursBetween(end.time, day) <= startHours()) {
          end.before && hiddenBefore.push(end.before);
        } else if (hoursBetween(start.time, day) < startHours()) {
          end.before && hiddenBefore.push(end.before);

          visibleIntervals.push([{ ...start, time: newStart }, end]);
        } else if (endHours() <= hoursBetween(start.time, day)) {
          hiddenAfter.push(
            labelFrom(
              { after: getVisibleLabel(start?.after) },
              { before: getVisibleLabel(end?.before) }
            )
          );
        } else if (endHours() < hoursBetween(end.time, day)) {
          hiddenAfter.push(
            labelFrom(
              { after: getVisibleLabel(start?.after) },
              { before: getVisibleLabel(end?.before) }
            )
          );

          visibleIntervals.push([start, { ...end, time: newEnd }]);
        } else {
          visibleIntervals.push([start, end]);
        }
      }

      return { hiddenBefore, hiddenAfter, visibleIntervals };
    });
  });

  const timeTicks = createMemo(() => {
    const ticks: number[] = [];
    for (let h = startHours(); h <= endHours(); h++) {
      ticks.push(h);
    }
    return ticks;
  });

  const onkeydown = (e) => {
    // if not focus on an input
    if (!(e.target instanceof HTMLInputElement)) {
      // if cmd/ctrl+left
      if (e.key === "ArrowLeft") {
        setWeek(prevWeek);
      }
      // if cmd/ctrl+right
      if (e.key === "ArrowRight") {
        setWeek(nextWeek);
      }
      if (e.key === "ArrowUp" && e.shiftKey) {
        endHours() > startHours() && setEndHours(endHours() - 1);
      } else if (e.key === "ArrowDown" && e.shiftKey) {
        endHours() < 24 && setEndHours(endHours() + 1);
      } else if (e.key === "ArrowUp") {
        startHours() > 0 && setStartHours(startHours() - 1);
      } else if (e.key === "ArrowDown") {
        startHours() < endHours() && setStartHours(startHours() + 1);
      }
    }
  };
  onMount(() => {
    document.addEventListener("keydown", onkeydown);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", onkeydown);
  });

  return (
    <div class="mt-4">
      <div class="flex justify-center">
        <div class="mx-16 w-full h-screen">
          <div class="flex justify-between h-8">
            <div class="flex font-bold">
              <button
                tabindex="-1"
                class="hover:bg-gray-50 px-2 py-0.5"
                onClick={() => setWeek(prevWeek)}
              >
                <Icon class="w-4 h-4" path={chevronLeft}></Icon>
              </button>
              <div class="w-1"></div>
              <button
                tabindex="-1"
                class="hover:bg-gray-50 px-2 py-0.5"
                onClick={() => setWeek(nextWeek)}
              >
                <Icon class="w-4 h-4" path={chevronRight}></Icon>
              </button>
            </div>
          </div>
          <div class="h-[90%] border rounded-sm inline-flex w-full">
            <div class="flex flex-col grow w-48">
              <div class="h-10" />
              <div class="h-4" />
              <div class="relative h-full">
                <div class="flex flex-col h-full justify-between">
                  <div class="-translate-x-5 -translate-y-2">
                    <UpDownInput
                      value={startHours()}
                      setValue={setStartHours}
                      boundaries={[0, endHours()]}
                    />
                  </div>
                  <div class="-translate-x-5 translate-y-2">
                    <UpDownInput
                      value={endHours()}
                      setValue={setEndHours}
                      boundaries={[startHours(), 24]}
                    />
                  </div>
                </div>
                <Index each={timeTicks()}>
                  {(h) => {
                    const top = () =>
                      (h() - startHours()) / (endHours() - startHours());
                    return (
                      <div
                        class="text-[8px] flex items-center text-gray-400 absolute h-4 -translate-y-2 w-full justify-end pr-0.5"
                        style={`top: ${top() * 100}%`}
                      >
                        {`${h()}:00`}
                      </div>
                    );
                  }}
                </Index>
              </div>
              <div class="h-4" />
            </div>
            <For each={dayInfos()}>
              {({ hiddenBefore, hiddenAfter, visibleIntervals }, d) => (
                <div class="flex flex-col grow w-full">
                  <p class="flex justify-center items-center font-bold h-10">
                    {renderDay(daysAfter(week(), d()))}
                  </p>
                  <div class="h-4 text-gray-400 text-[8px]">
                    {hiddenBefore.join(", ")}
                  </div>
                  <div class="h-full border">
                    <For each={visibleIntervals}>
                      {([start, end], i) => {
                        const height =
                          msBetween(start.time, end.time) / msInADay();

                        const visibleLabel = () =>
                          labelFrom(
                            { after: getVisibleLabel(start?.after) },
                            { before: getVisibleLabel(end?.before) }
                          );
                        const [info, setInfo] = visibleLabel()
                          ? getLabelInfo(visibleLabel())
                          : [{ color: "white" }, null];

                        const [rightHover, setRightHover] = createSignal(false);
                        const [leftHover, setLeftHover] = createSignal(false);
                        return (
                          <div
                            class="w-full text-[10px] text-white font-semibold relative"
                            style={`height: ${
                              height * 100
                            }%; background-color: ${info.color};`}
                            oncontextmenu={(e) => {
                              e.preventDefault();
                              openLabelEdit({
                                coord: [e.clientX, e.clientY],
                                label: visibleLabel(),
                                entry: start,
                              });
                            }}
                          >
                            <span class="absolute left-0.5 -top-0.5">
                              <Switch>
                                <Match when={rightHover()}>
                                  {() => {
                                    let next = start.after;

                                    while (true) {
                                      const nextnext = coarseLabel(next);
                                      if (nextnext == visibleLabel()) break;
                                      else next = nextnext;
                                    }
                                    return next + "";
                                  }}
                                </Match>
                                <Match when={leftHover()}>
                                  {coarseLabel(visibleLabel())} / ...
                                </Match>
                                <Match
                                  when={
                                    start?.after &&
                                    start.after != visibleLabel()
                                  }
                                >
                                  {visibleLabel()} / ...
                                </Match>
                                <Match when={true}>{visibleLabel()}</Match>
                              </Switch>
                            </span>
                            <Show when={coarseLabel(visibleLabel())}>
                              <div
                                class="w-1/4 h-full left-0 top-0 absolute hover:bg-gray-800 opacity-20 cursor-pointer"
                                onmouseenter={() => setLeftHover(true)}
                                onmouseleave={() => setLeftHover(false)}
                                onClick={() => {
                                  const [_, setInfo2] = getLabelInfo(
                                    coarseLabel(visibleLabel())
                                  );
                                  setInfo2({ expanded: false });
                                }}
                              />
                            </Show>
                            <Show
                              when={
                                start?.after && start.after != visibleLabel()
                              }
                            >
                              <div
                                class="w-1/4 h-full right-0 top-0 absolute hover:bg-gray-800 opacity-20 cursor-pointer"
                                onmouseenter={() => setRightHover(true)}
                                onmouseleave={() => setRightHover(false)}
                                onClick={() => setInfo({ expanded: true })}
                              />
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                  <div class="h-4 text-gray-400 text-[8px]">
                    {hiddenAfter.join(", ")}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
