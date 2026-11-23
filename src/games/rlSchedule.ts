// Rotación de partidos de Rocket League para cualquier cantidad de jugadores y tamaño de equipo.
//
// Objetivos, en orden de importancia:
// 1. Que todos jueguen (y descansen) lo más parejo posible.
// 2. Que cada pareja de compañeros se repita lo menos posible.
// 3. Que los cruces entre rivales se repitan lo menos posible.
// 4. Que nadie descanse dos partidos seguidos si se puede evitar.
//
// Se arma con un greedy aleatorizado: se prueban varias rotaciones con distintos
// desempates y se queda la de menor costo.

import { seededRandom } from '../model/random';

export interface MatchSlot {
  team1: string[];
  team2: string[];
  resting: string[];
}

const W_BALANCE = 1000;
const W_TEAMMATE = 100;
const W_RIVAL = 10;
const W_REST_STREAK = 30;

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const rec = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i <= items.length - (k - pick.length); i++) {
      pick.push(items[i]);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  return out;
}

/** Todas las formas de armar dos equipos de `teamSize` con los jugadores dados. */
export function candidateMatches(players: readonly string[], teamSize: number): MatchSlot[] {
  const out: MatchSlot[] = [];
  for (const playing of combinations(players, teamSize * 2)) {
    const [first, ...rest] = playing;
    // Fijar al primero en el equipo 1 evita contar cada partido dos veces.
    for (const mates of combinations(rest, teamSize - 1)) {
      const team1 = [first, ...mates];
      const team2 = playing.filter((p) => !team1.includes(p));
      out.push({ team1, team2, resting: players.filter((p) => !playing.includes(p)) });
    }
  }
  return out;
}

class Tally {
  played = new Map<string, number>();
  teammates = new Map<string, number>();
  rivals = new Map<string, number>();
  lastRested = new Set<string>();

  constructor(players: readonly string[]) {
    for (const p of players) this.played.set(p, 0);
  }

  clone(): Tally {
    const t = new Tally([]);
    t.played = new Map(this.played);
    t.teammates = new Map(this.teammates);
    t.rivals = new Map(this.rivals);
    t.lastRested = new Set(this.lastRested);
    return t;
  }

  add(m: MatchSlot) {
    for (const team of [m.team1, m.team2]) {
      for (const p of team) {
        // Un jugador que ya no está en el torneo no cuenta para el reparto.
        if (this.played.has(p)) this.played.set(p, this.played.get(p)! + 1);
      }
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) inc(this.teammates, pairKey(team[i], team[j]));
    }
    for (const a of m.team1) for (const b of m.team2) inc(this.rivals, pairKey(a, b));
    this.lastRested = new Set(m.resting);
  }

  /** Cuánto empeora la rotación si se juega este partido ahora. */
  cost(m: MatchSlot): number {
    const counts = [...this.played.entries()].map(([p, n]) =>
      m.team1.includes(p) || m.team2.includes(p) ? n + 1 : n,
    );
    const spread = Math.max(...counts) - Math.min(...counts);
    let cost = W_BALANCE * spread * spread;
    for (const team of [m.team1, m.team2]) {
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const n = this.teammates.get(pairKey(team[i], team[j])) ?? 0;
          cost += W_TEAMMATE * (2 * n + 1); // (n+1)² - n²
        }
    }
    for (const a of m.team1)
      for (const b of m.team2) {
        const n = this.rivals.get(pairKey(a, b)) ?? 0;
        cost += W_RIVAL * (2 * n + 1);
      }
    for (const p of m.resting) if (this.lastRested.has(p)) cost += W_REST_STREAK;
    return cost;
  }
}

function inc(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * Genera `count` partidos nuevos para estos jugadores, teniendo en cuenta los ya
 * jugados o armados (`history`), para que la rotación siga pareja.
 */
export function generateMatches(
  players: readonly string[],
  teamSize: number,
  count: number,
  history: readonly MatchSlot[] = [],
  seed = 1,
): MatchSlot[] {
  if (count <= 0 || players.length < teamSize * 2) return [];
  const candidates = candidateMatches(players, teamSize);
  const base = new Tally(players);
  for (const m of history) base.add(m);

  // Más intentos cuando el problema es chico; siempre al menos uno.
  const work = candidates.length * count;
  const attempts = Math.max(1, Math.min(60, Math.floor(400_000 / Math.max(work, 1))));
  const random = seededRandom(seed);

  let best: MatchSlot[] = [];
  let bestCost = Infinity;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const tally = base.clone();
    const schedule: MatchSlot[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      let pick: MatchSlot | null = null;
      let pickCost = Infinity;
      let ties = 0;
      for (const c of candidates) {
        const cost = tally.cost(c);
        if (cost < pickCost) {
          pick = c;
          pickCost = cost;
          ties = 1;
        } else if (cost === pickCost) {
          // Desempate aleatorio uniforme entre los candidatos igual de buenos.
          ties++;
          if (random() * ties < 1) pick = c;
        }
      }
      tally.add(pick!);
      schedule.push(pick!);
      total += pickCost;
    }
    if (total < bestCost) {
      best = schedule;
      bestCost = total;
    }
  }
  return best;
}
