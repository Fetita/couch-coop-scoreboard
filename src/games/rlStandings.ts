import type { RocketLeagueMatch, RocketLeagueTiebreaker } from '../model/types';

export interface RocketLeagueRow {
  playerId: string;
  position: number;
  points: number;
  played: number;
  winRate: number;
  goalsFor: number;
  goalDiff: number;
  goals: number;
  saves: number;
}

export function isPlayed(m: RocketLeagueMatch): boolean {
  return m.winner === 1 || m.winner === 2;
}

export function teamGoals(m: RocketLeagueMatch, team: 1 | 2): number {
  const players = team === 1 ? m.team1 : m.team2;
  return players.reduce((sum, p) => sum + (m.stats[p]?.goals ?? 0), 0);
}

/** ¿Se cargaron goles en este partido? */
export function hasStats(m: RocketLeagueMatch): boolean {
  return Object.values(m.stats).some((s) => s.goals > 0 || s.saves > 0);
}

/** Ganador según los goles cargados: 'tie' si empatan, null si no se cargaron goles. */
export function goalsWinner(m: RocketLeagueMatch): 1 | 2 | 'tie' | null {
  const g1 = teamGoals(m, 1);
  const g2 = teamGoals(m, 2);
  if (g1 === 0 && g2 === 0) return null;
  if (g1 === g2) return 'tie';
  return g1 > g2 ? 1 : 2;
}

/** Por qué no se puede guardar este resultado, o null si está bien. */
export function resultError(m: RocketLeagueMatch): string | null {
  const byGoals = goalsWinner(m);
  if (byGoals === 'tie') return 'Están empatados en goles. No hay empates: sumá el gol de oro del overtime.';
  if (!isPlayed(m)) return 'Elegí el equipo ganador.';
  if (byGoals !== null && byGoals !== m.winner) return 'El ganador tiene que ser el equipo con más goles.';
  return null;
}

function compare(a: RocketLeagueRow, b: RocketLeagueRow, tiebreakers: RocketLeagueTiebreaker[]): number {
  if (a.points !== b.points) return b.points - a.points;
  for (const t of tiebreakers) {
    if (a[t] !== b[t]) return b[t] - a[t];
  }
  return 0;
}

/** Tabla del torneo. Los empatados en todos los criterios comparten posición. */
export function rocketLeagueStandings(
  playerIds: readonly string[],
  matches: readonly RocketLeagueMatch[],
  tiebreakers: RocketLeagueTiebreaker[],
): RocketLeagueRow[] {
  const rows = new Map<string, RocketLeagueRow>();
  const row = (id: string) => {
    if (!rows.has(id)) {
      rows.set(id, { playerId: id, position: 0, points: 0, played: 0, winRate: 0, goalsFor: 0, goalDiff: 0, goals: 0, saves: 0 });
    }
    return rows.get(id)!;
  };
  for (const id of playerIds) row(id);

  for (const m of matches) {
    if (!isPlayed(m)) continue;
    const g1 = teamGoals(m, 1);
    const g2 = teamGoals(m, 2);
    for (const [team, own, other, won] of [
      [m.team1, g1, g2, m.winner === 1],
      [m.team2, g2, g1, m.winner === 2],
    ] as const) {
      for (const p of team) {
        const r = row(p);
        r.played++;
        if (won) r.points++;
        r.goalDiff += own - other;
        const s = m.stats[p];
        r.goalsFor += s?.goals ?? 0;
        r.goals += s?.goals ?? 0;
        r.saves += s?.saves ?? 0;
      }
    }
  }

  // Los que ya no están en el torneo solo aparecen si jugaron algo.
  const list = [...rows.values()].filter((r) => playerIds.includes(r.playerId) || r.played > 0);
  for (const r of list) r.winRate = r.played ? r.points / r.played : 0;
  list.sort((a, b) => compare(a, b, tiebreakers));
  list.forEach((r, i) => {
    r.position = i > 0 && compare(list[i - 1], r, tiebreakers) === 0 ? list[i - 1].position : i + 1;
  });
  return list;
}

export interface Award {
  playerIds: string[];
  value: number;
}

/** Goleador o mejor arquero: el máximo, con empates compartidos. Null si nadie sumó. */
export function award(rows: readonly RocketLeagueRow[], field: 'goals' | 'saves'): Award | null {
  const max = Math.max(0, ...rows.map((r) => r[field]));
  if (max === 0) return null;
  return { playerIds: rows.filter((r) => r[field] === max).map((r) => r.playerId), value: max };
}
