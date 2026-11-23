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

/**
 * Color del auto de un jugador en un torneo de Trackmania. En el juego los colores
 * salen al azar, así que se eligen al arrancar cada torneo; si falta, se usa el del jugador.
 */
export function carColor(
  tournament: { carColors?: Record<string, string> } | undefined,
  player: { id: string; color: string } | undefined,
): string {
  if (!player) return '#666';
  return tournament?.carColors?.[player.id] ?? player.color;
}

export function hasCarColor(tournament: { carColors?: Record<string, string> }, playerId: string): boolean {
  return Boolean(tournament.carColors?.[playerId]);
}
