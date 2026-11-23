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

/** Si los goles cargados contradicen al ganador elegido, devuelve el aviso. */
export function winnerWarning(m: RocketLeagueMatch): string | null {
  if (!isPlayed(m)) return null;
  const own = teamGoals(m, m.winner!);
  const other = teamGoals(m, m.winner === 1 ? 2 : 1);
  if (own < other) return 'El ganador tiene menos goles cargados que el rival.';
  if (own === other && own > 0) return 'Los goles están empatados: falta el gol de oro.';
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
