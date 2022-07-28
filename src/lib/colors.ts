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

function stringToRgbColor(_str: string | undefined): RgbColor {
  const str = _str || "";
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colorArr = [];
  for (var i = 0; i < 3; i++) {
    colorArr.push((hash >> (i * 8)) & 0xff);
  }
  const [r, g, b] = colorArr;
  return { r, g, b };
}

export function stringToColor(str: string | undefined): string {
  return rgbToHex(stringToRgbColor(str));
}

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

function pad(s: string): string {
  if (s.length == 1) return "0" + s;
  return s;
}

function rgbToHex(rgb: RgbColor): string {
  const r = Math.round(rgb.r);
  const g = Math.round(rgb.g);
  const b = Math.round(rgb.b);
  return `#${pad(r.toString(16))}${pad(g.toString(16))}${pad(b.toString(16))}`;
}

export function hexToHsl(hex: string): HslColor {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: HslColor): string {
  return rgbToHex(hslToRgb(hsl));
}
