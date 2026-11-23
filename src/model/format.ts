import type {
  GameId,
  RocketLeagueFormat,
  RocketLeagueTiebreaker,
  TournamentFormat,
  TrackmaniaFormat,
} from './types';

export const TIEBREAKER_LABELS: Record<RocketLeagueTiebreaker, string> = {
  goalDiff: 'Diferencia de gol',
  goalsFor: 'Goles propios',
};

export const DEFAULT_TIEBREAKERS: RocketLeagueTiebreaker[] = ['goalDiff', 'goalsFor'];

function choose2(n: number): number {
  return (n * (n - 1)) / 2;
}

/** Tamaño de equipo más grande que entra con esta cantidad de jugadores, prefiriendo 2v2. */
export function proposeTeamSize(players: number): 1 | 2 | 3 {
  if (players >= 4) return 2;
  return 1;
}

/** ¿Alcanzan los jugadores para armar dos equipos de este tamaño? */
export function teamSizeFits(players: number, teamSize: number): boolean {
  return players >= teamSize * 2;
}

/**
 * Cuántos partidos por ronda hacen falta para que:
 * - cada pareja posible juegue junta al menos una vez (o, en 1v1, cada cruce se juegue), y
 * - todos descansen la misma cantidad de veces.
 * Con 4 jugadores en 2v2 da 3; con 5 da 5.
 */
export function proposeMatchesPerRound(players: number, teamSize: number): number {
  if (!teamSizeFits(players, teamSize)) return 0;
  let matches: number;
  if (teamSize === 1) {
    // 1v1: cada cruce posible una vez.
    matches = choose2(players);
  } else {
    // Cada partido cubre C(t,2) parejas de compañeros por equipo, dos equipos.
    const pairsPerMatch = 2 * choose2(teamSize);
    matches = Math.ceil(choose2(players) / pairsPerMatch);
  }
  const resting = players - 2 * teamSize;
  if (resting > 0) {
    // Subir hasta que los descansos se repartan parejo (como mucho una vuelta más).
    for (let extra = 0; extra < players; extra++) {
      if (((matches + extra) * resting) % players === 0) return matches + extra;
    }
  }
  return Math.max(matches, 1);
}

/** Escala de puntos propuesta: el 1° suma tantos puntos como jugadores, y uno menos por puesto. */
export function proposePointsScale(players: number): number[] {
  return Array.from({ length: Math.max(players, 0) }, (_, i) => players - i);
}

export function proposeRocketLeagueFormat(players: number): RocketLeagueFormat {
  const teamSize = proposeTeamSize(players);
  return {
    game: 'rocket-league',
    teamSize,
    rounds: 1,
    matchesPerRound: proposeMatchesPerRound(players, teamSize),
    tiebreakers: [...DEFAULT_TIEBREAKERS],
  };
}

export function proposeTrackmaniaFormat(players: number): TrackmaniaFormat {
  return {
    game: 'trackmania',
    tracks: 3,
    pointsScale: proposePointsScale(players),
  };
}

export function proposeFormat(game: GameId, players: number): TournamentFormat {
  return game === 'rocket-league'
    ? proposeRocketLeagueFormat(players)
    : proposeTrackmaniaFormat(players);
}

/** Problemas del formato para esta cantidad de jugadores (vacío si está todo bien). */
export function formatWarnings(format: TournamentFormat, players: number): string[] {
  const warnings: string[] = [];
  if (players < 2) warnings.push('Hacen falta al menos 2 jugadores.');
  if (format.game === 'rocket-league') {
    if (!teamSizeFits(players, format.teamSize)) {
      warnings.push(
        `Para ${format.teamSize}v${format.teamSize} hacen falta al menos ${format.teamSize * 2} jugadores.`,
      );
    }
    if (format.rounds < 1) warnings.push('Tiene que haber al menos 1 ronda.');
    if (format.matchesPerRound < 1) warnings.push('Tiene que haber al menos 1 partido por ronda.');
  } else {
    if (format.tracks < 1) warnings.push('Tiene que haber al menos 1 pista.');
    if (format.pointsScale.length < players) {
      warnings.push('La escala de puntos tiene menos puestos que jugadores; los que sobran suman 0.');
    }
  }
  return warnings;
}

/** Texto corto para mostrar el formato en una tarjeta. */
export function describeFormat(format: TournamentFormat): string {
  if (format.game === 'rocket-league') {
    const total = format.rounds * format.matchesPerRound;
    const rounds = format.rounds === 1 ? '1 ronda' : `${format.rounds} rondas`;
    return `${format.teamSize}v${format.teamSize} · ${rounds} · ${total} partidos`;
  }
  const tracks = format.tracks === 1 ? '1 pista' : `${format.tracks} pistas`;
  return `${tracks} · puntos ${format.pointsScale.join('-')}`;
}
