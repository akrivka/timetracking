import {
  Accessor,
  Component,
  createEffect,
  createRenderEffect,
  createSignal,
  For,
} from "solid-js";
import { unwrap } from "solid-js/store";
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
import { minutesAfter, nthIndex, revit } from "../lib/util";

function coarseLabel(label: string, depth: number): string {
  const i = nthIndex(label, "/", depth);
  if (i == -1) return label;
  else return label.slice(0, i).trim();
}

const Calendar: Component = () => {
  const { entries } = useEntries();
  const { getLabelInfo } = useUser();
  const [week, setWeek] = createSignal(thisMonday());

  const startDay = week;
  const endDay = () => daysAfter(week(), 7);

  const [startTimeString, setStartTimeString] = createSignal("8:00");
  const [endTimeString, setEndTimeString] = createSignal("20:00");

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

  const entriesInWeek = () => {
    return entries
      .filter((entry) => entry.time > startDay() && entry.time < endDay())
      .reverse();
  };

  const coalescedEntries = () => {
    const es = entriesInWeek().map((entry) => ({
      ...entry,
      before: entry.before ? coarseLabel(entry.before, depth()) : null,
    }));
    const result: Partial<Entry>[] = [];
    for (let i = 0; i < es.length - 1; i++) {
      const entry = es[i];
      const nextEntry = es[i + 1];
      if (nextEntry.before === entry.before) {
        continue;
      } else {
        result.push(entry);
      }
    }
    es.length > 0 && result.push(es[es.length - 1]);
    return result;
  };

  type Interval = [Partial<Entry>, Partial<Entry>];
  type DayInfo = {
    hiddenBefore: string[];
    hiddenAfter: string[];
    dayIntervals: Interval[];
  };

  const dayIntervals = () => {
    const result: Interval[][] = [...Array(7)].map((_) => []);

    let a = null;
    let b: Partial<Entry> = { time: startDay() };

    let day = 0;

    for (const entry of [
      ...coalescedEntries(),
      { time: endDay(), before: null },
    ]) {
      a = b;
      b = entry;

      let nm = nextMidnight(a.time);
      while (nm < b.time) {
        let newB = { time: nm, before: b?.before, after: b?.before };
        result[day].push([a, newB]);
        day++;
        a = newB;
        nm = nextMidnight(nm);
      }
      result[day].push([a, b]);
    }
    return result;
  };

  const dayInfos = () => {
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
  };

  const timeTicks = () => {
    const ticks: DayTimeSpec[] = [];
    let time = startTime();
    while (isBeforeDayTime(time, endTime())) {
      ticks.push(time);
      time = minutesAfterDayTime(time, 60);
    }
    ticks.push(endTime());
    return ticks;
  };

  const maxDepth = () => {
    let max = 1;
    for (const entry of entriesInWeek()) {
      if (!entry.before) continue;
      const depth = (entry.before.match(/ \/ /g) || []).length + 1;
      if (depth > max) {
        max = depth;
      }
    }
    return max;
  };

  const depths = () => [...Array(maxDepth()).keys()].map((i) => i + 1);

  const [depth, setDepth] = createSignal(maxDepth());

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
                <div>
                  <label class="w-16">Start time:</label>
                  <MyTextInput
                    class="w-14"
                    value={startTimeString()}
                    onEnter={setStartTimeString}
                  />
                </div>
                <div>
                  <label class="w-16">End time:</label>
                  <MyTextInput
                    class="w-14"
                    value={endTimeString()}
                    onEnter={setEndTimeString}
                  />
                </div>
              </div>
              <div class="w-4" />
              <div class="flex items-center">
                <label class="w-14">Depth:</label>
                <div class="flex space-x-1">
                  <For each={depths()}>
                    {(dep) => {
                      return (
                        <button
                          class={
                            "w-6 h-6 rounded flex items-center justify-center " +
                            (dep === depth() ? "bg-gray-100 font-semibold" : "")
                          }
                          onClick={() => setDepth(dep)}
                        >
                          {dep}
                        </button>
                      );
                    }}
                  </For>
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

                        const [info, _] = end.before
                          ? getLabelInfo(end.before)
                          : [{ color: "white" }, null];

                        const label = () => labelFrom(start, end);

                        return (
                          <div
                            class="w-full text-[8px] text-white font-semibold"
                            style={`height: ${
                              height * 100
                            }%; background-color: ${info.color};`}
                            onclick={(e) => {}}
                          >
                            {label()}
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
