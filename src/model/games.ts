import type { GameId } from './types';

export interface GameInfo {
  id: GameId;
  name: string;
  emoji: string;
  description: string;
  minPlayers: number;
}

export const GAMES: Record<GameId, GameInfo> = {
  'rocket-league': {
    id: 'rocket-league',
    name: 'Rocket League',
    emoji: '⚽',
    description: 'Partidos con equipos que rotan. Cada partido ganado suma 1 punto a cada ganador.',
    minPlayers: 2,
  },
  trackmania: {
    id: 'trackmania',
    name: 'Trackmania',
    emoji: '🏁',
    description: 'Time trial por eliminación en cada pista. Puntos por posición.',
    minPlayers: 2,
  },
};

export const GAME_LIST: GameInfo[] = Object.values(GAMES);
