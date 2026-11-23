// Funciones puras que transforman los datos. El store solo las aplica y guarda.
import { pickColor } from '../model/colors';
import { proposeFormat } from '../model/format';
import { newId, shuffle } from '../model/random';
import type { AppData, GameId, Player, Tournament, TournamentFormat } from '../model/types';

export function addPlayer(data: AppData, name: string, color?: string): [AppData, Player] {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('El jugador necesita un nombre.');
  const taken = data.players.some(
    (p) => !p.archived && p.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
  );
  if (taken) throw new Error(`Ya hay un jugador llamado ${trimmed}.`);
  const player: Player = {
    id: newId(),
    name: trimmed,
    color: color ?? pickColor(data.players.filter((p) => !p.archived).map((p) => p.color)),
    createdAt: new Date().toISOString(),
  };
  return [{ ...data, players: [...data.players, player] }, player];
}

export function updatePlayer(data: AppData, id: string, patch: Partial<Omit<Player, 'id'>>): AppData {
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error('El jugador necesita un nombre.');
    const taken = data.players.some(
      (p) => p.id !== id && !p.archived && p.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );
    if (taken) throw new Error(`Ya hay un jugador llamado ${trimmed}.`);
    patch = { ...patch, name: trimmed };
  }
  return { ...data, players: data.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function isPlayerUsed(data: AppData, id: string): boolean {
  return data.tournaments.some((t) => t.playerIds.includes(id));
}

/** Borra al jugador si nunca jugó; si ya jugó, lo archiva para no romper el historial. */
export function removePlayer(data: AppData, id: string): AppData {
  if (isPlayerUsed(data, id)) return updatePlayer(data, id, { archived: true });
  return { ...data, players: data.players.filter((p) => p.id !== id) };
}

export function defaultTournamentName(game: GameId, date = new Date()): string {
  const name = game === 'rocket-league' ? 'Rocket League' : 'Trackmania';
  const day = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });
  return `${name} ${day}`;
}

export interface NewTournament {
  game: GameId;
  name?: string;
  playerIds: string[];
  format?: TournamentFormat;
}

export function createTournament(
  data: AppData,
  input: NewTournament,
  random: () => number = Math.random,
): [AppData, Tournament] {
  if (input.playerIds.length < 2) throw new Error('Hacen falta al menos 2 jugadores.');
  const tournament: Tournament = {
    id: newId(),
    name: input.name?.trim() || defaultTournamentName(input.game),
    game: input.game,
    createdAt: new Date().toISOString(),
    status: 'active',
    playerIds: shuffle(input.playerIds, random),
    format: input.format ?? proposeFormat(input.game, input.playerIds.length),
  };
  return [{ ...data, tournaments: [tournament, ...data.tournaments] }, tournament];
}

export function updateTournament(
  data: AppData,
  id: string,
  patch: Partial<Omit<Tournament, 'id' | 'game'>>,
): AppData {
  return {
    ...data,
    tournaments: data.tournaments.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  };
}

export function setTournamentPlayers(data: AppData, id: string, playerIds: string[]): AppData {
  const t = data.tournaments.find((x) => x.id === id);
  if (!t) return data;
  if (playerIds.length < 2) throw new Error('Hacen falta al menos 2 jugadores.');
  // Se respeta el orden sorteado de los que siguen; los nuevos van al final.
  const kept = t.playerIds.filter((p) => playerIds.includes(p));
  const added = playerIds.filter((p) => !t.playerIds.includes(p));
  return updateTournament(data, id, { playerIds: [...kept, ...added] });
}

export function reshufflePlayers(data: AppData, id: string, random: () => number = Math.random) {
  const t = data.tournaments.find((x) => x.id === id);
  if (!t) return data;
  return updateTournament(data, id, { playerIds: shuffle(t.playerIds, random) });
}

export function finishTournament(data: AppData, id: string): AppData {
  return updateTournament(data, id, { status: 'finished', finishedAt: new Date().toISOString() });
}

export function reopenTournament(data: AppData, id: string): AppData {
  return updateTournament(data, id, { status: 'active', finishedAt: undefined });
}

export function deleteTournament(data: AppData, id: string): AppData {
  return { ...data, tournaments: data.tournaments.filter((t) => t.id !== id) };
}
