// Modelo de datos compartido por todos los juegos.
// Ver "Couch Co-op: reglas y modelo de datos" para el detalle de las reglas.

export type GameId = 'rocket-league' | 'trackmania';

export interface Player {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  /** Un jugador archivado no aparece al armar torneos nuevos, pero sigue en el historial. */
  archived?: boolean;
}

/** Criterios de desempate de la tabla de Rocket League, en orden. */
export type RocketLeagueTiebreaker = 'goalDiff' | 'goalsFor';

export interface RocketLeagueFormat {
  game: 'rocket-league';
  /** Jugadores por equipo: 1v1, 2v2 o 3v3. */
  teamSize: 1 | 2 | 3;
  rounds: number;
  matchesPerRound: number;
  tiebreakers: RocketLeagueTiebreaker[];
}

export interface TrackmaniaFormat {
  game: 'trackmania';
  /** Cantidad de pistas (carreras) propuestas para el torneo. */
  tracks: number;
  /** Puntos por posición: índice 0 = 1° puesto. */
  pointsScale: number[];
}

export type TournamentFormat = RocketLeagueFormat | TrackmaniaFormat;

/** Goles y saves de un jugador en un partido. */
export interface RocketLeagueStat {
  goals: number;
  saves: number;
}

export interface RocketLeagueMatch {
  id: string;
  /** Ronda a la que pertenece (empieza en 1). */
  round: number;
  team1: string[];
  team2: string[];
  resting: string[];
  /** Sin empates: siempre gana un equipo (overtime con gol de oro). Vacío = sin jugar. */
  winner?: 1 | 2;
  /** Opcional: estadísticas por jugador. */
  stats: Record<string, RocketLeagueStat>;
  playedAt?: string;
}

export type TournamentStatus = 'active' | 'finished';

export interface Tournament {
  id: string;
  name: string;
  game: GameId;
  createdAt: string;
  finishedAt?: string;
  status: TournamentStatus;
  /** Jugadores en el orden sorteado al empezar. */
  playerIds: string[];
  format: TournamentFormat;
  /** Solo Rocket League: partidos jugados y por jugar, en orden. */
  rlMatches: RocketLeagueMatch[];
}

export interface AppData {
  schemaVersion: 2;
  players: Player[];
  tournaments: Tournament[];
}
