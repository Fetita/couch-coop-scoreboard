// Carreras de Trackmania dentro de un torneo, pistas guardadas, tabla y récords.
import { newId } from '../model/random';
import type { AppData, Tournament, TrackmaniaRace, TrackmaniaTrack } from '../model/types';
import { racePoints, raceResult, raceState } from './tmRace';

/** Modos de auto propuestos; se puede escribir otro. */
export const CAR_MODES = ['Stadium', 'Snow', 'Rally', 'Desert'];

export function carModes(data: AppData): string[] {
  const used = data.tmTracks.map((t) => t.carMode);
  return [...new Set([...CAR_MODES, ...used])];
}

export function tracksForMode(data: AppData, carMode: string): TrackmaniaTrack[] {
  return data.tmTracks
    .filter((t) => t.carMode === carMode)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
}

function mapT(data: AppData, id: string, fn: (t: Tournament) => Tournament): AppData {
  return { ...data, tournaments: data.tournaments.map((t) => (t.id === id ? fn(t) : t)) };
}

function mapRace(data: AppData, tid: string, rid: string, fn: (r: TrackmaniaRace) => TrackmaniaRace): AppData {
  return mapT(data, tid, (t) => ({ ...t, tmRaces: t.tmRaces.map((r) => (r.id === rid ? fn(r) : r)) }));
}

/** Busca la pista por nombre dentro del modo, o la crea. */
export function ensureTrack(data: AppData, carMode: string, name: string): [AppData, TrackmaniaTrack] {
  const mode = carMode.trim();
  const trimmed = name.trim();
  if (!mode) throw new Error('Elegí el modo de auto.');
  if (!trimmed) throw new Error('La pista necesita un nombre.');
  const existing = data.tmTracks.find(
    (t) => t.carMode === mode && t.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
  );
  if (existing) return [data, existing];
  const track: TrackmaniaTrack = { id: newId(), name: trimmed, carMode: mode };
  return [{ ...data, tmTracks: [...data.tmTracks, track] }, track];
}

/**
 * Orden de salida de la próxima carrera: el resultado de la última carrera terminada
 * (el ganador sale primero, con el auto azul). En la primera carrera, el orden de
 * los jugadores del torneo (cómo están sentados). Los que no corrieron la anterior van al final.
 */
export function nextRaceOrder(t: Tournament): string[] {
  const last = [...t.tmRaces].reverse().find((r) => raceState(r).finished);
  if (!last) return [...t.playerIds];
  const result = raceResult(last).filter((p) => t.playerIds.includes(p));
  return [...result, ...t.playerIds.filter((p) => !result.includes(p))];
}

export function createRace(data: AppData, tournamentId: string, carMode: string, trackName: string): [AppData, TrackmaniaRace] {
  const t = data.tournaments.find((x) => x.id === tournamentId);
  if (!t) throw new Error('No existe el torneo.');
  if (t.playerIds.length < 2) throw new Error('Hacen falta al menos 2 jugadores.');
  const [withTrack, track] = ensureTrack(data, carMode, trackName);
  const race: TrackmaniaRace = {
    id: newId(),
    carMode: track.carMode,
    trackId: track.id,
    order: nextRaceOrder(t),
    eliminated: [],
    createdAt: new Date().toISOString(),
  };
  return [mapT(withTrack, tournamentId, (x) => ({ ...x, tmRaces: [...x.tmRaces, race] })), race];
}

/** Cambia el orden de salida (y con eso los colores). Solo antes de que haya eliminados. */
export function setRaceOrder(data: AppData, tid: string, rid: string, order: string[]): AppData {
  return mapRace(data, tid, rid, (r) => {
    if (r.eliminated.length > 0) throw new Error('El orden solo se cambia antes de que quede alguien eliminado.');
    return { ...r, order };
  });
}

/** Intercambia dos lugares del orden de salida. */
export function swapRaceOrder(data: AppData, tid: string, rid: string, a: string, b: string): AppData {
  const race = data.tournaments.find((t) => t.id === tid)?.tmRaces.find((r) => r.id === rid);
  if (!race) return data;
  const order = race.order.map((p) => (p === a ? b : p === b ? a : p));
  return setRaceOrder(data, tid, rid, order);
}

/** Marca a un jugador como eliminado (el próximo puesto desde abajo). */
export function eliminate(data: AppData, tid: string, rid: string, playerId: string): AppData {
  return mapRace(data, tid, rid, (r) => {
    if (!r.order.includes(playerId) || r.eliminated.includes(playerId)) return r;
    if (raceState(r).finished) throw new Error('La carrera ya terminó.');
    return { ...r, eliminated: [...r.eliminated, playerId] };
  });
}

/** Vuelve a poner en carrera a un eliminado (por si se tocó mal). */
export function undoElimination(data: AppData, tid: string, rid: string, playerId: string): AppData {
  return mapRace(data, tid, rid, (r) => ({ ...r, eliminated: r.eliminated.filter((p) => p !== playerId) }));
}

export function deleteRace(data: AppData, tid: string, rid: string): AppData {
  return mapT(data, tid, (t) => ({ ...t, tmRaces: t.tmRaces.filter((r) => r.id !== rid) }));
}

export interface TrackmaniaRow {
  playerId: string;
  position: number;
  points: number;
  races: number;
  wins: number;
  podiums: number;
}

/** Tabla del torneo: suma los puntos de las carreras terminadas, opcionalmente de un solo modo. */
export function trackmaniaStandings(t: Tournament, carMode?: string): TrackmaniaRow[] {
  const scale = t.format.game === 'trackmania' ? t.format.pointsScale : [];
  const rows = new Map<string, TrackmaniaRow>();
  const row = (id: string) => {
    if (!rows.has(id)) rows.set(id, { playerId: id, position: 0, points: 0, races: 0, wins: 0, podiums: 0 });
    return rows.get(id)!;
  };
  for (const id of t.playerIds) row(id);
  for (const race of t.tmRaces) {
    if (carMode && race.carMode !== carMode) continue;
    const state = raceState(race);
    if (!state.finished) continue;
    const pts = racePoints(race, scale);
    for (const [p, pos] of state.positions) {
      const r = row(p);
      r.races++;
      r.points += pts.get(p) ?? 0;
      if (pos === 1) r.wins++;
      if (pos <= 3) r.podiums++;
    }
  }
  const list = [...rows.values()].filter((r) => t.playerIds.includes(r.playerId) || r.races > 0);
  const cmp = (a: TrackmaniaRow, b: TrackmaniaRow) => b.points - a.points || b.wins - a.wins;
  list.sort(cmp);
  list.forEach((r, i) => {
    r.position = i > 0 && cmp(list[i - 1], r) === 0 ? list[i - 1].position : i + 1;
  });
  return list;
}
