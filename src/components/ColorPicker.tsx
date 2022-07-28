import { createEffect, createSignal } from "solid-js";
import { hexToHsl, hslToHex } from "../lib/colors";

export const ColorPicker = ({ color, setColor }) => {
  const { h: _h, s: _s, l: _l } = hexToHsl(color());
  console.log(_h, _s, _l);
  console.log(hslToHex({ h: _h, s: _s, l: _l }));

  const [h, setH] = createSignal(_h);
  const [s, setS] = createSignal(_s);
  const [l, setL] = createSignal(_l);  

  createEffect(() => setColor(hslToHex({ h: h(), s: s(), l: l() })));

  const [sldrag, setSldrag] = createSignal(false);

  const width = 192,
    height = 128;

  return (
    <div class="w-48 border">
      <div class="w-48 h-32 relative">
        <div
          class="w-full h-full absolute"
          style={`background-color: ${hslToHex({ h: h(), s: 1, l: 0 })}`}
        />
        <div
          class="w-full h-full absolute"
          style={`background: linear-gradient(to right,#fff 0%,rgba(255,255,255,0) 100%);`}
        />
        <div
          class="w-full h-full absolute"
          style={`background: linear-gradient(to bottom,transparent 0%,#000 100%);`}
        />
        <div
          class="w-4 h-4 rounded-full border border-white drop-shadow cursor-pointer absolute"
          style={`left: ${s() * width}px; top: ${l() * height}px`}
          onmousedown={() => setSldrag(true)}
          onmouseup={() => setSldrag(false)}
          onmousemove={(e) => {
            if (sldrag() === true) {
              e.preventDefault();

              const { left, top } = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - left;
              const y = e.clientY - top;

              setS(x / width);
              setL(y / height);
            }
          }}
        />
      </div>
      <div>
        <div class="mx-2 rounded-full" style={`background-color: ${color()}`} />
        <div>
          <div></div>
        </div>
      </div>
    </div>
  );
};
