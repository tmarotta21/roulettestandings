const PASTELS = [
  "#f8d0d8",
  "#cbb6e8",
  "#f0b8b0",
  "#c5e0b4",
  "#b7d3f0",
  "#e4c4d8",
  "#c5d8ef",
  "#f3c9a8",
  "#b8d4d0",
  "#f5e08c",
  "#d8d4ee",
  "#efd3b0",
];

export function teamTint(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return PASTELS[hash % PASTELS.length];
}

export function pfScale(pf: number, min: number, max: number): string {
  if (max <= min) return "#e8f5e9";
  const t = Math.max(0, Math.min(1, (pf - min) / (max - min)));
  const r = Math.round(232 - t * 155);
  const g = Math.round(245 - t * 55);
  const b = Math.round(233 - t * 145);
  return `rgb(${r},${g},${b})`;
}
