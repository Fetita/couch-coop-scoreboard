// Historial y estadísticas por jugador, calculados a partir de todos los torneos.
import type { AppData, Tournament } from '../model/types';
import { isPlayed, rocketLeagueStandings } from './rlStandings';
import { raceState } from './tmRace';
import { trackmaniaStandings } from './tmTournament';

/** Quién va primero en la tabla del torneo (puede haber empate). Vacío si no se jugó nada. */
export function tournamentLeaders(t: Tournament): string[] {
  if (t.format.game === 'rocket-league') {
    if (!t.rlMatches.some(isPlayed)) return [];
    const rows = rocketLeagueStandings(t.playerIds, t.rlMatches, t.format.tiebreakers);
    return rows.filter((r) => r.position === 1).map((r) => r.playerId);
  }
  const rows = trackmaniaStandings(t);
  if (!rows.some((r) => r.races > 0)) return [];
  return rows.filter((r) => r.position === 1).map((r) => r.playerId);
}

export interface PlayerStats {
  tournaments: number;
  tournamentWins: number;
  rl: { matches: number; wins: number; goals: number; saves: number; topScorer: number; bestKeeper: number };
  tm: { races: number; wins: number; podiums: number; positionSum: number };
}

export function playerStats(data: AppData, playerId: string): PlayerStats {
  const s: PlayerStats = {
    tournaments: 0,
    tournamentWins: 0,
    rl: { matches: 0, wins: 0, goals: 0, saves: 0, topScorer: 0, bestKeeper: 0 },
    tm: { races: 0, wins: 0, podiums: 0, positionSum: 0 },
  };
  for (const t of data.tournaments) {
    const took = t.playerIds.includes(playerId) || t.rlMatches.some((m) => m.team1.includes(playerId) || m.team2.includes(playerId));
    if (!took) continue;
    s.tournaments++;
    if (t.status === 'finished' && tournamentLeaders(t).includes(playerId)) s.tournamentWins++;

    if (t.format.game === 'rocket-league') {
      const rows = rocketLeagueStandings(t.playerIds, t.rlMatches, t.format.tiebreakers);
      const me = rows.find((r) => r.playerId === playerId);
      if (me) {
        s.rl.matches += me.played;
        s.rl.wins += me.points;
        s.rl.goals += me.goals;
        s.rl.saves += me.saves;
        const maxGoals = Math.max(0, ...rows.map((r) => r.goals));
        const maxSaves = Math.max(0, ...rows.map((r) => r.saves));
        if (t.status === 'finished' && maxGoals > 0 && me.goals === maxGoals) s.rl.topScorer++;
        if (t.status === 'finished' && maxSaves > 0 && me.saves === maxSaves) s.rl.bestKeeper++;
      }
    } else {
      for (const race of t.tmRaces) {
        const state = raceState(race);
        const pos = state.finished ? state.positions.get(playerId) : undefined;
        if (pos === undefined) continue;
        s.tm.races++;
        s.tm.positionSum += pos;
        if (pos === 1) s.tm.wins++;
        if (pos <= 3) s.tm.podiums++;
      }
    }
  }
  return s;
}

export interface GeneralRow {
  playerId: string;
  position: number;
  /** Puntos acumulados: partidos ganados en Rocket League + puntos por puesto en Trackmania. */
  points: number;
  rlPoints: number;
  tmPoints: number;
  titles: number;
  tournaments: number;
}

/** Tabla general: suma lo de todos los torneos (en curso y terminados). */
export function generalStandings(data: AppData, game?: Tournament['game']): GeneralRow[] {
  const rows = new Map<string, GeneralRow>();
  const row = (id: string) => {
    if (!rows.has(id)) rows.set(id, { playerId: id, position: 0, points: 0, rlPoints: 0, tmPoints: 0, titles: 0, tournaments: 0 });
    return rows.get(id)!;
  };
  for (const t of data.tournaments) {
    if (game && t.game !== game) continue;
    const counted = new Set<string>();
    if (t.format.game === 'rocket-league') {
      for (const r of rocketLeagueStandings(t.playerIds, t.rlMatches, t.format.tiebreakers)) {
        if (r.played === 0 && !t.playerIds.includes(r.playerId)) continue;
        row(r.playerId).rlPoints += r.points;
        counted.add(r.playerId);
      }
    } else {
      for (const r of trackmaniaStandings(t)) {
        row(r.playerId).tmPoints += r.points;
        counted.add(r.playerId);
      }
    }
    for (const p of counted) row(p).tournaments++;
    if (t.status === 'finished') for (const p of tournamentLeaders(t)) row(p).titles++;
  }
  const list = [...rows.values()];
  for (const r of list) r.points = r.rlPoints + r.tmPoints;
  const cmp = (a: GeneralRow, b: GeneralRow) => b.points - a.points || b.titles - a.titles;
  list.sort(cmp);
  list.forEach((r, i) => {
    r.position = i > 0 && cmp(list[i - 1], r) === 0 ? list[i - 1].position : i + 1;
  });
  return list;
}
