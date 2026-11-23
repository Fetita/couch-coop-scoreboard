import { initialMatches } from '../games/rlMatches';
import type { AppData, Tournament } from '../model/types';

export const STORAGE_KEY = 'couch-coop/data';

export function emptyData(): AppData {
  return { schemaVersion: 2, players: [], tournaments: [] };
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
      const withMatches: Tournament = { ...t, rlMatches: [] };
      return { ...withMatches, rlMatches: initialMatches(withMatches) };
    });
    data = { ...data, schemaVersion: 2, tournaments };
  }
  if (data.schemaVersion !== 2) {
    throw new Error(`Versión de datos desconocida: ${String(data.schemaVersion)}`);
  }
  if (!Array.isArray(data.players) || !Array.isArray(data.tournaments)) {
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
