import { useSyncExternalStore } from 'react';

export type SyncRole = 'local' | 'viewer' | 'editor';

export interface SyncStatus {
  /** local = sin nube; viewer = mira lo que carga otro; editor = el que anota. */
  role: SyncRole;
  /** ¿Hay conexión con la nube ahora? */
  online: boolean;
  /** Hay cambios de este teléfono que todavía no se subieron. */
  pending: boolean;
  email: string | null;
  /** Cuándo se actualizaron por última vez los datos en la nube (ms). */
  remoteUpdatedAt: number | null;
  error: string | null;
}

let status: SyncStatus = { role: 'local', online: false, pending: false, email: null, remoteUpdatedAt: null, error: null };
const listeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function setSyncStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, getSyncStatus);
}
