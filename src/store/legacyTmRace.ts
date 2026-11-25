// Motor de carreras viejo (con tiempos), solo para migrar datos del esquema v3.
// Las carreras guardadas así pasan a guardar solo el orden de eliminación.

/** Formato de las carreras hasta el esquema v3: se guardaban los tiempos de cada intento. */
export type LegacyTrackmaniaEvent =
  | { id: string; type: 'run'; playerId: string; timeMs: number | null; outOfFuel: boolean }
  | { id: string; type: 'eliminate'; playerId: string };

interface LegacyRace {
  order: string[];
  events: LegacyTrackmaniaEvent[];
}

interface RaceState {
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
  /** Jugadores en carrera que ya se quedaron sin nafta. */
  noFuel: Set<string>;
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

export function legacyRaceState(race: LegacyRace): RaceState {
  const best = new Map<string, number | null>(race.order.map((p) => [p, null]));
  const setAt = new Map<string, number>();
  const attempts = new Map<string, number>(race.order.map((p) => [p, 0]));
  const eliminated: string[] = [];
  const inRace = () => race.order.filter((p) => !eliminated.includes(p));
  const ranFirstLap = new Set<string>();
  const noFuel = new Set<string>();

  race.events.forEach((e: LegacyTrackmaniaEvent, i) => {
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
    // La nafta no vuelve: una vez sin nafta, todos sus intentos siguientes son sin nafta.
    if (!isFirstLapRun && (e.outOfFuel || noFuel.has(e.playerId))) {
      noFuel.add(e.playerId);
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
    noFuel: new Set([...noFuel].filter((p) => !eliminated.includes(p))),
  };
}

