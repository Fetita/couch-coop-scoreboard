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

/** Aplica un cambio, lo guarda en el teléfono y avisa a la UI. */
export function update(fn: (current: AppData) => AppData) {
  const next = fn(data);
  if (next === data) return;
  data = next;
  saveData(data);
  emit();
}

export function replaceAll(next: AppData) {
  update(() => next);
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
