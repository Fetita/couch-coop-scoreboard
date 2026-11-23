export const PLAYER_COLORS = [
  '#ff6b6b',
  '#4dabf7',
  '#51cf66',
  '#ffd43b',
  '#cc5de8',
  '#ff922b',
  '#22b8cf',
  '#f06595',
  '#94d82d',
  '#845ef7',
  '#adb5bd',
  '#20c997',
];

/** Primer color que no usa nadie; si están todos usados, el que menos se repite. */
export function pickColor(used: string[]): string {
  const counts = new Map(PLAYER_COLORS.map((c) => [c, 0]));
  for (const c of used) if (counts.has(c)) counts.set(c, counts.get(c)! + 1);
  let best = PLAYER_COLORS[0];
  for (const c of PLAYER_COLORS) if (counts.get(c)! < counts.get(best)!) best = c;
  return best;
}
