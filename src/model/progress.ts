import { isPlayed } from '../games/rlStandings';
import { raceState } from '../games/tmRace';
import type { Tournament } from './types';

/** Avance del torneo: cuánto se jugó sobre lo planeado. */
export function tournamentProgress(t: Tournament): { done: number; total: number; label: string } {
  if (t.format.game === 'rocket-league') {
    const done = t.rlMatches.filter(isPlayed).length;
    const total = t.rlMatches.length;
    return { done, total, label: `${done} de ${total} partidos` };
  }
  const done = t.tmRaces.filter((r) => raceState(r).finished).length;
  const total = Math.max(t.format.tracks, t.tmRaces.length);
  return { done, total, label: `${done} de ${total} pistas` };
}
