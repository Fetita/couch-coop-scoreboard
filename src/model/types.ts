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
}

export interface AppData {
  schemaVersion: 1;
  players: Player[];
  tournaments: Tournament[];
}
