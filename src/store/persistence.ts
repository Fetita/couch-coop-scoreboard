import { initialMatches } from '../games/rlMatches';
import type { AppData, Tournament } from '../model/types';
import { legacyRaceState, type LegacyTrackmaniaEvent } from './legacyTmRace';

export const STORAGE_KEY = 'couch-coop/data';

export function emptyData(): AppData {
  return { schemaVersion: 4, players: [], tournaments: [], tmTracks: [] };
}

/**
 * Lleva datos guardados por versiones anteriores al esquema actual.
 * Cada versión nueva del esquema suma un paso acá.
 */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Los datos no tienen el formato esperado.');
  let data = raw as Omit<Partial<AppData>, 'schemaVersion'> & { schemaVersion?: number };
  if (data.schemaVersion === 1) {
    // v1 -> v2: los torneos de Rocket League pasan a tener partidos.
    const tournaments = ((data.tournaments ?? []) as Tournament[]).map((t) => {
      const withMatches: Tournament = { ...t, rlMatches: [], tmRaces: [] };
      return { ...withMatches, rlMatches: initialMatches(withMatches) };
    });
    data = { ...data, schemaVersion: 2, tournaments };
  }
  if (data.schemaVersion === 2) {
    // v2 -> v3: carreras de Trackmania y pistas guardadas.
    const tournaments = ((data.tournaments ?? []) as Tournament[]).map((t) => ({ ...t, tmRaces: t.tmRaces ?? [] }));
    data = { ...data, schemaVersion: 3, tournaments, tmTracks: data.tmTracks ?? [] };
  }
  if (data.schemaVersion === 3) {
    // v3 -> v4: Trackmania deja de guardar tiempos y colores elegidos a mano.
    // Cada carrera guarda solo el orden de salida y el orden de eliminación.
    type V3Race = Omit<Tournament['tmRaces'][number], 'eliminated'> & { events?: LegacyTrackmaniaEvent[]; eliminated?: string[] };
    type V3Tournament = Omit<Tournament, 'tmRaces'> & { tmRaces?: V3Race[]; carColors?: unknown };
    const tournaments = ((data.tournaments ?? []) as V3Tournament[]).map(({ carColors: _drop, ...t }) => ({
      ...t,
      tmRaces: (t.tmRaces ?? []).map(({ events, ...r }) => ({
        ...r,
        eliminated: r.eliminated ?? legacyRaceState({ order: r.order, events: events ?? [] }).eliminated,
      })),
    }));
    data = { ...data, schemaVersion: 4, tournaments: tournaments as Tournament[] };
  }
  if (data.schemaVersion !== 4) {
    throw new Error(`Versión de datos desconocida: ${String(data.schemaVersion)}`);
  }
  if (!Array.isArray(data.players) || !Array.isArray(data.tournaments) || !Array.isArray(data.tmTracks)) {
    throw new Error('Faltan jugadores o torneos en los datos.');
  }
  return data as AppData;
}

export function loadData(storage: Storage | undefined = globalThis.localStorage): AppData {
  if (!storage) return emptyData();
  const text = storage.getItem(STORAGE_KEY);
  if (!text) return emptyData();
  try {
    return migrate(JSON.parse(text));
  } catch (err) {
    // No perder lo que había: se guarda una copia aparte antes de arrancar de cero.
    storage.setItem(`${STORAGE_KEY}/corrupt-${Date.now()}`, text);
    console.error('No se pudieron leer los datos guardados', err);
    return emptyData();
  }
}

export function saveData(data: AppData, storage: Storage | undefined = globalThis.localStorage) {
  storage?.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Pide al navegador que no borre los datos para liberar espacio. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // No es crítico.
  }
}

export function exportBackup(data: AppData): string {
  return JSON.stringify({ app: 'couch-coop', exportedAt: new Date().toISOString(), data }, null, 2);
}

export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const wrapper = parsed as { app?: string; data?: unknown };
  if (wrapper?.app !== 'couch-coop' || !wrapper.data) {
    throw new Error('El archivo no es una copia de seguridad de Couch Co-op.');
  }
  return migrate(wrapper.data);
}
