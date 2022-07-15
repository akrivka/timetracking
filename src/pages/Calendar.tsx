import { Component, createSignal } from "solid-js";
import { ColorPicker } from "../components/ColorPicker";

const Calendar: Component = () => {
  const [color, setColor] = createSignal("#123456");
  return (
    <div>
      <h1>Calendar</h1>
      <ColorPicker color={color} setColor={setColor} />
    </div>
  );
};

export default Calendar;
