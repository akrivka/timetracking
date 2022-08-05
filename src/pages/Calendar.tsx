import * as R from "remeda";
import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { unwrap } from "solid-js/store";
import { useUIState } from "../App";
import { ColorPicker } from "../components/ColorPicker";
import { MyTextInput } from "../components/MyTextInput";
import {
  entriesIterator,
  Entry,
  labelFrom,
  useEntries,
} from "../context/EntriesContext";
import { useUser } from "../context/UserContext";
import { stringToColor } from "../lib/colors";
import {
  daysAfter,
  msBetween,
  nextMidnight,
  nextWeek,
  prevWeek,
  thisMonday,
} from "../lib/date";
import { renderDay, renderTime, twoDigits } from "../lib/format";
import {
  isBeforeDayTime,
  dateToDayTimeSpec,
  DayTimeSpec,
  parseString,
  timeRule,
  dayTimeSpecToMinutes,
  minutesAfterDayTime,
} from "../lib/parse";
import { listPairs, it, minutesAfter, nthIndex, revit } from "../lib/util";
import { coarseLabel } from "../lib/labels";

export const defaultCalendarState = {
  week: thisMonday(),
  startTimeString: "8:00",
  endTimeString: "20:00",
};

const Calendar: Component = () => {
  const { entries } = useEntries();
  const { getLabelInfo } = useUser();

  const [week, setWeek] = useUIState<Date>("calendar", "week");
  const [startTimeString, setStartTimeString] = useUIState<string>(
    "calendar",
    "startTimeString"
  );
  const [endTimeString, setEndTimeString] = useUIState<string>(
    "calendar",
    "endTimeString"
  );

  const startDay = () => week();
  const endDay = () => daysAfter(week(), 7);

  const [startTime, setStartTime] = createSignal<DayTimeSpec>();
  const [endTime, setEndTime] = createSignal<DayTimeSpec>();

  createRenderEffect(() => {
    const m = parseString(timeRule, startTimeString());
    if (m == "fail" || m == "prefix") {
      console.log("Error parsing start time", m);
    } else {
      setStartTime(m[0]);
    }
  });
  createRenderEffect(() => {
    const m = parseString(timeRule, endTimeString());
    if (m == "fail" || m == "prefix") {
      console.log("Error parsing end time", m);
    } else {
      setEndTime(m[0]);
    }
  });

  const msInADay = () =>
    (dayTimeSpecToMinutes(endTime()) - dayTimeSpecToMinutes(startTime())) *
    60 *
    1000;

  const entriesInWeek = createMemo(() => {
    const es = [...entries];
    const start = es.find((entry) => entry.time < startDay());
    const end = R.reverse(es).find((entry) => entry.time > endDay());
    return [
      { ...start, time: startDay() },
      ...es
        .filter((entry) => entry.time > startDay() && entry.time < endDay())
        .reverse(),
      { ...end, time: endDay() },
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
  type DayInfo = {
    hiddenBefore: string[];
    hiddenAfter: string[];
    dayIntervals: Interval[];
  };

  const dayIntervals = createMemo(() => {
    const result: Interval[][] = [...Array(7)].map((_) => []);
    let day = 0;

    for (const [start, end] of intervalsInWeek()) {
      let a = start;
      let b = end;
      let nm = nextMidnight(start.time);
      while (nm < end.time && day < 7) {
        let newB = { time: nm, before: end.before, after: end.before };
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
    return dayIntervals().map((intervals) => {
      const hiddenBefore = [];
      const hiddenAfter = [];
      const visibleIntervals = [];

      for (const [start, end] of intervals) {
        if (
          isBeforeDayTime(dateToDayTimeSpec(end.time), startTime()) != false
        ) {
          end.before && hiddenBefore.push(end.before);
        } else if (
          isBeforeDayTime(dateToDayTimeSpec(start.time), startTime()) == true
        ) {
          end.before && hiddenBefore.push(end.before);
          const newStart = new Date(start.time.getTime());
          newStart.setHours(startTime().hours);
          newStart.setMinutes(startTime().minutes);
          newStart.setSeconds(0);
          newStart.setMilliseconds(0);
          visibleIntervals.push([{ time: newStart }, end]);
        } else if (
          isBeforeDayTime(endTime(), dateToDayTimeSpec(start.time)) != false
        ) {
          start.before && hiddenAfter.push(start.before);
        } else if (
          isBeforeDayTime(endTime(), dateToDayTimeSpec(end.time)) == true
        ) {
          start.before && hiddenAfter.push(start.before);
          const newEnd = new Date(end.time.getTime());
          newEnd.setHours(endTime().hours);
          newEnd.setMinutes(endTime().minutes);
          newEnd.setSeconds(0);
          newEnd.setMilliseconds(0);
          visibleIntervals.push([start, { time: newEnd }]);
        } else {
          visibleIntervals.push([start, end]);
        }
      }
      return { hiddenBefore, hiddenAfter, visibleIntervals };
    });
  });

  const timeTicks = createMemo(() => {
    const ticks: DayTimeSpec[] = [];
    let time = startTime();
    while (isBeforeDayTime(time, endTime())) {
      ticks.push(time);
      time = minutesAfterDayTime(time, 60);
    }
    ticks.push(endTime());
    return ticks;
  });

  onMount(() => {
    document.addEventListener("keydown", (e) => {
      // if cmd/ctrl+left
      if (e.key === "ArrowLeft") {
        setWeek(prevWeek);
      }
      // if cmd/ctrl+right
      if (e.key === "ArrowRight") {
        setWeek(nextWeek);
      }
    });
  });

  return (
    <div class="mt-4">
      <div class="flex justify-center">
        <div class="mx-16 w-full h-screen">
          <div class="flex justify-between">
            <div class="flex font-bold">
              <button
                class="hover:bg-gray-50 px-2 py-0.5"
                onClick={() => setWeek(prevWeek)}
              >
                {"<"}
              </button>
              <div class="w-1"></div>
              <button
                class="hover:bg-gray-50 px-2 py-0.5"
                onClick={() => setWeek(nextWeek)}
              >
                {">"}
              </button>
            </div>
            <div class="flex">
              <div class="flex space-x-2">
                <div class="space-x-1">
                  <label class="w-16">Start time:</label>
                  <MyTextInput
                    class="w-14 text-center"
                    value={startTimeString()}
                    onEnter={setStartTimeString}
                  />
                </div>
                <div class="space-x-1">
                  <label class="w-16">End time:</label>
                  <MyTextInput
                    class="w-14 text-center"
                    value={endTimeString()}
                    onEnter={setEndTimeString}
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="h-[90%] border rounded-sm inline-flex w-full">
            <div class="flex flex-col grow w-48">
              <div class="h-10" />
              <div class="h-4" />
              <div class="relative h-full">
                <For each={timeTicks()}>
                  {(mark) => {
                    const top =
                      ((dayTimeSpecToMinutes(mark) -
                        dayTimeSpecToMinutes(startTime())) *
                        60 *
                        1000) /
                      msInADay();
                    return (
                      <div
                        class="text-[8px] flex items-center text-gray-400 absolute h-4 -translate-y-2 w-full justify-end pr-0.5"
                        style={`top: ${top * 100}%`}
                      >
                        {twoDigits(mark.hours) + ":" + twoDigits(mark.minutes)}
                      </div>
                    );
                  }}
                </For>
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
                            onclick={(e) => {}}
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
