// Carrera de Trackmania: time trial por eliminación.
//
// 1. Primera vuelta: cada jugador corre una vez, en el orden de salida.
// 2. Después corre siempre el que tiene el peor mejor-tiempo entre los que siguen.
// 3. Si en un intento se queda sin nafta y sigue siendo el peor, queda eliminado.
//    Si superó el tiempo de alguien, sigue en carrera y le toca al nuevo peor.
// 4. Gana el último que queda. Las posiciones van al revés de la eliminación.
//
// El estado se calcula siempre a partir de los eventos guardados, así corregir
// un intento recalcula todo.

import type { TrackmaniaEvent, TrackmaniaRace } from '../model/types';

export interface RaceState {
  /** Mejor tiempo de cada jugador (null = todavía sin tiempo). */
  best: Map<string, number | null>;
  /** Jugadores en carrera, del mejor al peor tiempo. */
  standing: string[];
  /** Eliminados en orden (el primero es el último puesto). */
  eliminated: string[];
  /** ¿Sigue la primera vuelta? */
  firstLap: boolean;
  /** A quién le toca correr ahora, o null si terminó. */
  next: string | null;
  finished: boolean;
  winner: string | null;
  /** Posición final o provisoria de cada jugador (1 = primero). */
  positions: Map<string, number>;
  /** Cantidad de intentos de cada jugador. */
  attempts: Map<string, number>;
}

/** Ordena del mejor al peor; sin tiempo va al final; empate: el que lo marcó antes va primero. */
function rank(players: string[], best: Map<string, number | null>, setAt: Map<string, number>): string[] {
  return [...players].sort((a, b) => {
    const ta = best.get(a) ?? Infinity;
    const tb = best.get(b) ?? Infinity;
    if (ta !== tb) return ta - tb;
    return (setAt.get(a) ?? Infinity) - (setAt.get(b) ?? Infinity);
  });
}

export function raceState(race: Pick<TrackmaniaRace, 'order' | 'events'>): RaceState {
  const best = new Map<string, number | null>(race.order.map((p) => [p, null]));
  const setAt = new Map<string, number>();
  const attempts = new Map<string, number>(race.order.map((p) => [p, 0]));
  const eliminated: string[] = [];
  const inRace = () => race.order.filter((p) => !eliminated.includes(p));
  const ranFirstLap = new Set<string>();

  race.events.forEach((e: TrackmaniaEvent, i) => {
    if (!best.has(e.playerId) || eliminated.includes(e.playerId)) return;
    if (e.type === 'eliminate') {
      eliminated.push(e.playerId);
      return;
    }
    attempts.set(e.playerId, attempts.get(e.playerId)! + 1);
    const prev = best.get(e.playerId) ?? null;
    if (e.timeMs !== null && (prev === null || e.timeMs < prev)) {
      best.set(e.playerId, e.timeMs);
      setAt.set(e.playerId, i);
    }
    const isFirstLapRun = !ranFirstLap.has(e.playerId);
    ranFirstLap.add(e.playerId);
    if (e.outOfFuel && !isFirstLapRun) {
      const ranked = rank(inRace(), best, setAt);
      if (ranked.length > 1 && ranked[ranked.length - 1] === e.playerId) eliminated.push(e.playerId);
    }
  });

  const remaining = inRace();
  const standing = rank(remaining, best, setAt);
  const firstLap = remaining.some((p) => !ranFirstLap.has(p));
  const finished = !firstLap && remaining.length <= 1;
  let next: string | null = null;
  if (!finished) {
    next = firstLap ? race.order.find((p) => remaining.includes(p) && !ranFirstLap.has(p))! : standing[standing.length - 1];
  }

  const positions = new Map<string, number>();
  standing.forEach((p, i) => positions.set(p, i + 1));
  eliminated.forEach((p, i) => positions.set(p, race.order.length - i));

  return {
    best,
    standing,
    eliminated,
    firstLap,
    next,
    finished,
    winner: finished ? standing[0] ?? null : null,
    positions,
    attempts,
  };
}

/** Puntos de la carrera según la escala (solo si terminó). */
export function racePoints(race: TrackmaniaRace, scale: number[]): Map<string, number> {
  const state = raceState(race);
  const points = new Map<string, number>();
  if (!state.finished) return points;
  for (const [p, pos] of state.positions) points.set(p, scale[pos - 1] ?? 0);
  return points;
}

/** 83456 -> "1:23.456" */
export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  const ss = String(seconds).padStart(minutes > 0 ? 2 : 1, '0');
  return `${minutes > 0 ? `${minutes}:` : ''}${ss}.${String(millis).padStart(3, '0')}`;
}

/** Diferencia con un tiempo de referencia: "+0.123". */
export function formatGap(ms: number | null | undefined, ref: number | null | undefined): string {
  if (ms === null || ms === undefined || ref === null || ref === undefined) return '';
  const d = ms - ref;
  if (d === 0) return '';
  return `+${formatTime(d)}`;
}

/**
 * Convierte los dígitos tipeados en un tiempo, de derecha a izquierda:
 * "52345" -> 52.345 s, "123456" -> 1:23.456. Devuelve null si no es válido.
 */
export function digitsToMs(digits: string): number | null {
  const clean = digits.replace(/\D/g, '');
  if (!clean) return null;
  const padded = clean.padStart(6, '0');
  const ms = Number(padded.slice(-3));
  const s = Number(padded.slice(-5, -3));
  const m = Number(padded.slice(0, -5));
  if (s >= 60) return null;
  return m * 60000 + s * 1000 + ms;
}

export function msToDigits(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${m > 0 ? m : ''}${m > 0 ? String(s).padStart(2, '0') : s}${String(millis).padStart(3, '0')}`;
}
