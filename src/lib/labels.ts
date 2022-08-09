import { addRgbColors, rgbToHex, stringToRgbColor } from "./colors";
import { numberOfOccurrences } from "./util";

export function coarseLabel(label: string): string {
  const i = label.lastIndexOf("/");
  if (i == -1) return null;
  else return label.slice(0, i).trim();
}

export function leafLabel(label: string): string {
  const i = label.lastIndexOf("/");
  if (i == -1) return label;
  else return label.slice(i + 1).trim();
}

export function prefixAndRemainder(s: string): [string, string] {
  const n = s.indexOf("/");
  if (n < 0 || s[0] == "?") return [s, ""];
  return [s.slice(0, n).trim(), s.slice(n + 1).trim()];
}

export function getLabelAllChildren(label: Label, labels: Label[]): Label[] {
  return labels.filter((l) => l.startsWith(label || ""));
}

export function getLabelImmediateChildren(
  label: Label,
  labels: Label[]
): Label[] {
  return getLabelAllChildren(label, labels).filter(
    (l) =>
      numberOfOccurrences(l, "/") ===
      (label ? numberOfOccurrences(label, "/") + 1 : 0)
  );
}

function labelToRgbColor(label: Label) {
  if (label.includes("/")) {
    return addRgbColors(
      labelToRgbColor(coarseLabel(label)),
      labelToRgbColor(leafLabel(label)),
      0.6,
      0.4
    );
  } else return stringToRgbColor(label);
}

export function labelToColor(label: Label): string {
  console.log(labelToRgbColor(label));

  return rgbToHex(labelToRgbColor(label));
}
