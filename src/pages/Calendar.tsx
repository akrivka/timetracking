import { Component, createSignal, For } from "solid-js";
import { ColorPicker } from "../components/ColorPicker";
import { useEntries } from "../context/EntriesContext";
import { daysAfter, nextWeek, prevWeek, thisMonday } from "../lib/date";
import { renderDay } from "../lib/format";

const Calendar: Component = () => {
  const { entries } = useEntries();
  const [week, setWeek] = createSignal(thisMonday());
  const [color, setColor] = createSignal("#123456");

  return (
    <div>
      <div class="flex justify-center">
        <div class="mx-16 w-full h-screen">
          <div class="font-bold flex">
            <button class="hover:bg-gray-50 px-2 py-0.5" onClick={() => setWeek(prevWeek)}>{"<"}</button>
            <div class="w-1"></div>
            <button class="hover:bg-gray-50 px-2 py-0.5" onClick={() => setWeek(nextWeek)}>{">"}</button>
          </div>
          <div class="h-5/6 border rounded-sm inline-flex w-full">
            <For each={[0, 1, 2, 3, 4, 5, 6]}>
              {(i) => (
                <div class="grow">
                  <p class="flex justify-center items-center font-bold h-10">{renderDay(daysAfter(week(), i))}</p>
                  <div class="bg-gray-500 h-full"></div>
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
