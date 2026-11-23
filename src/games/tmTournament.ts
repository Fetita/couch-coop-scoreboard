// Carreras de Trackmania dentro de un torneo, pistas guardadas, tabla y récords.
import { newId } from '../model/random';
import type { AppData, Tournament, TrackmaniaEvent, TrackmaniaRace, TrackmaniaTrack } from '../model/types';
import { racePoints, raceState } from './tmRace';

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

/** Nueva carrera. El orden de salida rota en cada carrera para que no arranque siempre el mismo. */
export function createRace(data: AppData, tournamentId: string, carMode: string, trackName: string): [AppData, TrackmaniaRace] {
  const t = data.tournaments.find((x) => x.id === tournamentId);
  if (!t) throw new Error('No existe el torneo.');
  if (t.playerIds.length < 2) throw new Error('Hacen falta al menos 2 jugadores.');
  const [withTrack, track] = ensureTrack(data, carMode, trackName);
  const shift = t.tmRaces.length % t.playerIds.length;
  const race: TrackmaniaRace = {
    id: newId(),
    carMode: track.carMode,
    trackId: track.id,
    order: [...t.playerIds.slice(shift), ...t.playerIds.slice(0, shift)],
    events: [],
    createdAt: new Date().toISOString(),
  };
  return [mapT(withTrack, tournamentId, (x) => ({ ...x, tmRaces: [...x.tmRaces, race] })), race];
}

export function setRaceOrder(data: AppData, tid: string, rid: string, order: string[]): AppData {
  return mapRace(data, tid, rid, (r) => {
    if (r.events.length > 0) throw new Error('El orden solo se cambia antes del primer intento.');
    return { ...r, order };
  });
}

export function addRun(data: AppData, tid: string, rid: string, playerId: string, timeMs: number | null, outOfFuel: boolean): AppData {
  return mapRace(data, tid, rid, (r) => ({ ...r, events: [...r.events, { id: newId(), type: 'run', playerId, timeMs, outOfFuel }] }));
}

export function eliminateManually(data: AppData, tid: string, rid: string, playerId: string): AppData {
  return mapRace(data, tid, rid, (r) => ({ ...r, events: [...r.events, { id: newId(), type: 'eliminate', playerId }] }));
}

export function updateEvent(data: AppData, tid: string, rid: string, eventId: string, patch: Partial<Extract<TrackmaniaEvent, { type: 'run' }>>): AppData {
  return mapRace(data, tid, rid, (r) => ({
    ...r,
    events: r.events.map((e) => (e.id === eventId && e.type === 'run' ? { ...e, ...patch, id: e.id, type: 'run' } : e)),
  }));
}

export function deleteEvent(data: AppData, tid: string, rid: string, eventId: string): AppData {
  return mapRace(data, tid, rid, (r) => ({ ...r, events: r.events.filter((e) => e.id !== eventId) }));
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

export interface TrackRecord {
  playerId: string;
  timeMs: number;
  tournamentId: string;
  date: string;
}

/** Mejor tiempo histórico de cada jugador en una pista, del más rápido al más lento. */
export function trackRecords(data: AppData, trackId: string): TrackRecord[] {
  const best = new Map<string, TrackRecord>();
  for (const t of data.tournaments) {
    for (const race of t.tmRaces) {
      if (race.trackId !== trackId) continue;
      for (const e of race.events) {
        if (e.type !== 'run' || e.timeMs === null) continue;
        const prev = best.get(e.playerId);
        if (!prev || e.timeMs < prev.timeMs) {
          best.set(e.playerId, { playerId: e.playerId, timeMs: e.timeMs, tournamentId: t.id, date: race.createdAt });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => a.timeMs - b.timeMs);
}
