// Punto de entrada de la sincronización. Firebase se carga aparte (import dinámico)
// para que la app abra rápido aunque no haya internet.
import { cloudConfig } from './config';

export const cloudEnabled = cloudConfig !== null;

const cloud = cloudConfig ? import('./cloud') : null;

export function startSync() {
  if (!cloud || !cloudConfig) return;
  const config = cloudConfig;
  void cloud.then((m) => m.startCloud(config)).catch((err) => console.error('No se pudo iniciar la nube', err));
}

async function mod() {
  if (!cloud) throw new Error('La nube no está configurada.');
  return cloud;
}

export async function signIn(email: string, password: string) {
  return (await mod()).signIn(email, password);
}

export async function signOut() {
  return (await mod()).signOutCloud();
}

export async function uploadLocal() {
  return (await mod()).uploadLocal();
}
