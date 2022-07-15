import { create } from "domain";
import { createEffect, createSignal } from "solid-js";

type HslColor = {
  h: number;
  s: number;
  l: number;
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

// source: https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
function hslToRgb({ h, s, l }: HslColor): RgbColor {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  (r /= 255), (g /= 255), (b /= 255);
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hexToRgb(hex: string): RgbColor {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(rgb: RgbColor): string {
  const r = Math.round(rgb.r);
  const g = Math.round(rgb.g);
  const b = Math.round(rgb.b);
  return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}

function hexToHsl(hex: string): HslColor {
  return rgbToHsl(hexToRgb(hex));
}

function hslToHex(hsl: HslColor): string {
  return rgbToHex(hslToRgb(hsl));
}

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
