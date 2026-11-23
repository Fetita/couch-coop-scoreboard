// Cambios sobre los partidos de Rocket League de un torneo. Funciones puras.
import { newId, hashString } from '../model/random';
import type { RocketLeagueFormat, RocketLeagueMatch, RocketLeagueStat, Tournament } from '../model/types';
import { generateMatches } from './rlSchedule';
import { isPlayed, resultError } from './rlStandings';

function rlFormat(t: Tournament): RocketLeagueFormat | null {
  return t.format.game === 'rocket-league' ? t.format : null;
}

export function targetMatches(f: RocketLeagueFormat): number {
  return f.rounds * f.matchesPerRound;
}

/** Numera las rondas según la posición del partido. */
function renumber(matches: RocketLeagueMatch[], f: RocketLeagueFormat): RocketLeagueMatch[] {
  const per = Math.max(1, f.matchesPerRound);
  return matches.map((m, i) => (m.round === Math.floor(i / per) + 1 ? m : { ...m, round: Math.floor(i / per) + 1 }));
}

function generate(t: Tournament, history: RocketLeagueMatch[], count: number): RocketLeagueMatch[] {
  const f = rlFormat(t)!;
  const seed = hashString(`${t.id}:${history.length}:${count}`);
  return generateMatches(t.playerIds, f.teamSize, count, history, seed).map((slot) => ({
    id: newId(),
    round: 0,
    ...slot,
    stats: {},
  }));
}

/** Arma desde cero todos los partidos del formato (al crear el torneo). */
export function initialMatches(t: Tournament): RocketLeagueMatch[] {
  const f = rlFormat(t);
  if (!f) return [];
  return renumber(generate(t, [], targetMatches(f)), f);
}

/**
 * Vuelve a armar los partidos sin jugar, manteniendo los jugados.
 * `count` es cuántos pendientes tiene que haber (por defecto, los mismos que antes).
 */
export function rebuildPending(t: Tournament, count?: number): Tournament {
  const f = rlFormat(t);
  if (!f) return t;
  const played = t.rlMatches.filter(isPlayed);
  const pending = count ?? t.rlMatches.length - played.length;
  const fresh = generate(t, played, Math.max(0, pending));
  return { ...t, rlMatches: renumber([...played, ...fresh], f) };
}

/**
 * Ajusta los partidos después de cambiar jugadores o formato.
 * - Si cambian los jugadores o el tamaño de equipo, los pendientes se rearman.
 * - Si solo cambia la cantidad (rondas o partidos por ronda), se agregan o quitan pendientes al final.
 */
export function syncAfterChange(before: Tournament, after: Tournament): Tournament {
  const f0 = rlFormat(before);
  const f1 = rlFormat(after);
  if (!f0 || !f1) return after;
  const delta = targetMatches(f1) - targetMatches(f0);
  const pendingBefore = after.rlMatches.filter((m) => !isPlayed(m)).length;
  const pending = Math.max(0, pendingBefore + delta);
  const playersChanged =
    before.playerIds.length !== after.playerIds.length || before.playerIds.some((p) => !after.playerIds.includes(p));
  if (playersChanged || f0.teamSize !== f1.teamSize) return rebuildPending(after, pending);
  if (delta > 0) {
    return { ...after, rlMatches: renumber([...after.rlMatches, ...generate(after, after.rlMatches, delta)], f1) };
  }
  if (delta < 0) {
    // Quitar pendientes desde el final.
    let toRemove = -delta;
    const kept = [...after.rlMatches]
      .reverse()
      .filter((m) => {
        if (toRemove > 0 && !isPlayed(m)) {
          toRemove--;
          return false;
        }
        return true;
      })
      .reverse();
    return { ...after, rlMatches: renumber(kept, f1) };
  }
  return { ...after, rlMatches: renumber(after.rlMatches, f1) };
}

function mapMatch(t: Tournament, matchId: string, fn: (m: RocketLeagueMatch) => RocketLeagueMatch): Tournament {
  return { ...t, rlMatches: t.rlMatches.map((m) => (m.id === matchId ? fn(m) : m)) };
}

/** Guarda el resultado. Sin empates: siempre hay un ganador. */
export function recordResult(
  t: Tournament,
  matchId: string,
  winner: 1 | 2,
  stats: Record<string, RocketLeagueStat>,
): Tournament {
  return mapMatch(t, matchId, (m) => {
    const clean: Record<string, RocketLeagueStat> = {};
    for (const p of [...m.team1, ...m.team2]) {
      const s = stats[p];
      if (s && (s.goals > 0 || s.saves > 0)) {
        clean[p] = { goals: Math.max(0, Math.floor(s.goals)), saves: Math.max(0, Math.floor(s.saves)) };
      }
    }
    const next = { ...m, winner, stats: clean, playedAt: m.playedAt ?? new Date().toISOString() };
    const error = resultError(next);
    if (error) throw new Error(error);
    return next;
  });
}

export function clearResult(t: Tournament, matchId: string): Tournament {
  return mapMatch(t, matchId, (m) => ({ ...m, winner: undefined, stats: {}, playedAt: undefined }));
}

/** Cambia los equipos de un partido a mano. */
export function setTeams(t: Tournament, matchId: string, team1: string[], team2: string[]): Tournament {
  if (team1.length === 0 || team2.length === 0) throw new Error('Cada equipo necesita al menos un jugador.');
  if (team1.some((p) => team2.includes(p))) throw new Error('Un jugador no puede estar en los dos equipos.');
  return mapMatch(t, matchId, (m) => {
    const playing = [...team1, ...team2];
    const stats = Object.fromEntries(Object.entries(m.stats).filter(([p]) => playing.includes(p)));
    return { ...m, team1, team2, resting: t.playerIds.filter((p) => !playing.includes(p)), stats };
  });
}

/** Agrega un partido más al final, armado para mantener la rotación pareja. */
export function addMatch(t: Tournament): Tournament {
  const f = rlFormat(t);
  if (!f) return t;
  return { ...t, rlMatches: renumber([...t.rlMatches, ...generate(t, t.rlMatches, 1)], f) };
}

export function removeMatch(t: Tournament, matchId: string): Tournament {
  const f = rlFormat(t);
  if (!f) return t;
  return { ...t, rlMatches: renumber(t.rlMatches.filter((m) => m.id !== matchId), f) };
}

/** El próximo partido sin jugar, si hay. */
export function nextMatch(t: Tournament): RocketLeagueMatch | undefined {
  return t.rlMatches.find((m) => !isPlayed(m));
}
