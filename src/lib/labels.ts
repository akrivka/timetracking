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
