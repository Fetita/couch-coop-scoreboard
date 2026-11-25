import { useSyncExternalStore } from 'react';
import type { AppData } from '../model/types';
import { loadData, saveData, STORAGE_KEY } from './persistence';

let data: AppData = loadData();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getData(): AppData {
  return data;
}

/**
 * Ganchos de la sincronización: `canEdit` dice si este teléfono puede cambiar datos
 * (si no, devuelve el motivo) y `onLocalChange` sube cada cambio a la nube.
 */
interface SyncHooks {
  canEdit: () => string | null;
  onLocalChange: (data: AppData) => void;
}
let hooks: SyncHooks | null = null;

export function setSyncHooks(next: SyncHooks | null) {
  hooks = next;
}

/** Se lanza cuando un teléfono que solo mira intenta cambiar algo. */
export class ReadOnlyError extends Error {}

const blockedListeners = new Set<(msg: string) => void>();
export function onBlocked(fn: (msg: string) => void) {
  blockedListeners.add(fn);
  return () => blockedListeners.delete(fn);
}

/** Aplica un cambio, lo guarda en el teléfono (y en la nube si corresponde) y avisa a la UI. */
export function update(fn: (current: AppData) => AppData) {
  const blocked = hooks?.canEdit() ?? null;
  if (blocked) {
    for (const l of blockedListeners) l(blocked);
    throw new ReadOnlyError(blocked);
  }
  const next = fn(data);
  if (next === data) return;
  data = next;
  saveData(data);
  hooks?.onLocalChange(data);
  emit();
}

export function replaceAll(next: AppData) {
  update(() => next);
}

/** Datos que llegaron de la nube: se guardan en el teléfono sin volver a subirlos. */
export function applyRemote(next: AppData) {
  data = next;
  saveData(data);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Si la app está abierta en dos pestañas, mantenerlas sincronizadas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      data = loadData();
      emit();
    }
  });
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData, getData);
}
