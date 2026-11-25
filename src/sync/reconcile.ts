import type { SyncRole } from './status';

/** Lo que hay guardado en la nube. */
export interface RemoteDoc {
  json: string;
  updatedAt?: number;
  by?: string;
}

export type ReconcileAction = 'apply' | 'push' | 'none';

/**
 * Qué hacer cuando llegan datos de la nube (o cambia quién está anotando).
 * - El que anota sube lo suyo si la nube está vacía o si tiene cambios sin subir
 *   (por ejemplo, anotó sin internet). Si no, toma lo de la nube.
 * - Los demás siempre toman lo de la nube.
 */
export function reconcile(role: SyncRole, remote: RemoteDoc | null, localJson: string, pending: boolean): ReconcileAction {
  if (role === 'local') return 'none';
  if (role === 'editor') {
    if (!remote || pending) return 'push';
    return remote.json === localJson ? 'none' : 'apply';
  }
  if (!remote) return 'none';
  return remote.json === localJson ? 'none' : 'apply';
}
