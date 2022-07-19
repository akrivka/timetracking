import { Accessor, Component, createEffect, createSignal, For } from "solid-js";
import { unwrap } from "solid-js/store";
import { ColorPicker } from "../components/ColorPicker";
import { entriesIterator, Entry, useEntries } from "../context/EntriesContext";
import {
  daysAfter,
  msBetween,
  nextWeek,
  prevWeek,
  thisMonday,
} from "../lib/date";
import { renderDay } from "../lib/format";
import { revit, stringToColor } from "../lib/util";

const Calendar: Component = () => {
  const { entries } = useEntries();
  const [week, setWeek] = createSignal(thisMonday());

  const startDay = week;
  const endDay = () => daysAfter(week(), 7);

  const intervals: Accessor<[Partial<Entry>, Partial<Entry>][][]> = () => {
    const result: [Partial<Entry>, Partial<Entry>][][] = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ];

    let a = null;
    let b = { time: startDay() };

    let day = -1;
    let curDay = startDay();

    for (const entry of revit(entries)) {
      if (entry.time > startDay() && (!a || a.time < endDay())) {
        a = b;
        b = entry;
        if (a.time <= curDay && b.time >= curDay) {
          day >= 0 && result[day].push([a, { time: curDay }]);
          day++;
          day < 7 && result[day].push([{ time: curDay }, entry]);
          curDay = daysAfter(curDay, 1);
        } else {
          result[day].push([a, b]);
        }
      }
    }
    return result;
  };

  createEffect(() => console.log(intervals()));

  return (
    <div>
      <div class="flex justify-center">
        <div class="mx-16 w-full h-screen">
          <div class="font-bold flex">
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
          <div class="h-5/6 border rounded-sm inline-flex w-full">
            <For each={intervals()}>
              {(dayIntervals, d) => (
                <div class="grow">
                  <p class="flex justify-center items-center font-bold h-10">
                    {renderDay(daysAfter(week(), d()))}
                  </p>
                  <div class="h-[calc(100%-40px)]">
                    <For each={dayIntervals}>
                      {([start, end], i) => {
                        const height =
                          msBetween(start.time, end.time) /
                          (24 * 60 * 60 * 1000);
                        const color = stringToColor(start.after || "");
                        return (
                          <div
                            class="w-full"
                            style={`height: ${
                              height * 100
                            }%; background-color: ${color};`}
                            onclick={(e) => {
                              
                            }}
                          >
                            {start.after}
                          </div>
                        );
                      }}
                    </For>
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
