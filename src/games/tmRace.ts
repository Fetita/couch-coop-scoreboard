// Carrera de Trackmania: lo que cuenta es el orden en que van quedando eliminados.
//
// - El orden de salida define el color del auto: el 1° es azul, el 2° rojo,
//   el 3° verde, el 4° violeta y el 5° rosa (siempre igual en cada carrera).
// - En la primera carrera el orden sale de cómo están sentados.
// - Desde la segunda, el orden es el resultado de la carrera anterior:
//   el que ganó sale primero (azul), el segundo rojo, y así.
// - Durante la carrera se toca a cada jugador cuando queda eliminado.
//   Cuando queda uno solo, ganó. Las posiciones van al revés de la eliminación.

import type { TrackmaniaRace } from '../model/types';

export interface CarSlot {
  name: string;
  hex: string;
}

/** Colores de los autos por orden de salida. */
export const CAR_SLOTS: CarSlot[] = [
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Rosa', hex: '#ec4899' },
];

/** Color del auto según el lugar en el orden de salida (empieza en 0). Con más de 5 vuelve a empezar. */
export function carSlot(index: number): CarSlot {
  return CAR_SLOTS[((index % CAR_SLOTS.length) + CAR_SLOTS.length) % CAR_SLOTS.length];
}

export interface RaceState {
  /** Siguen en carrera, en el orden de salida. */
  remaining: string[];
  /** Eliminados en orden (el primero es el último puesto). */
  eliminated: string[];
  finished: boolean;
  winner: string | null;
  /** Posición de cada jugador ya definida (1 = primero). */
  positions: Map<string, number>;
}

export function raceState(race: Pick<TrackmaniaRace, 'order' | 'eliminated'>): RaceState {
  const eliminated = race.eliminated.filter((p, i) => race.order.includes(p) && race.eliminated.indexOf(p) === i);
  const remaining = race.order.filter((p) => !eliminated.includes(p));
  const finished = race.order.length >= 2 && remaining.length <= 1;
  const positions = new Map<string, number>();
  eliminated.forEach((p, i) => positions.set(p, race.order.length - i));
  const winner = finished ? remaining[0] ?? null : null;
  if (winner) positions.set(winner, 1);
  return { remaining, eliminated, finished, winner, positions };
}

/** Resultado final, del primero al último. Vacío si la carrera no terminó. */
export function raceResult(race: Pick<TrackmaniaRace, 'order' | 'eliminated'>): string[] {
  const s = raceState(race);
  if (!s.finished) return [];
  return [...s.positions.entries()].sort((a, b) => a[1] - b[1]).map(([p]) => p);
}

/** Puntos de la carrera según la escala (solo si terminó). */
export function racePoints(race: TrackmaniaRace, scale: number[]): Map<string, number> {
  const state = raceState(race);
  const points = new Map<string, number>();
  if (!state.finished) return points;
  for (const [p, pos] of state.positions) points.set(p, scale[pos - 1] ?? 0);
  return points;
}
