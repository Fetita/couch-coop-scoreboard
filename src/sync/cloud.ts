// Sincronización con Firebase Realtime Database (plan gratis "Spark").
// Todos leen los mismos datos en vivo; solo la cuenta del que anota puede escribir.
// El teléfono sigue guardando todo en local, así la app funciona sin internet.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, onValue, ref, serverTimestamp, set, type DatabaseReference } from 'firebase/database';
import type { AppData } from '../model/types';
import { migrate, STORAGE_KEY } from '../store/persistence';
import { applyRemote, getData, setSyncHooks } from '../store/store';
import { useEmulator, type CloudConfig } from './config';
import { reconcile, type RemoteDoc } from './reconcile';
import { getSyncStatus, setSyncStatus } from './status';

const PENDING_KEY = 'couch-coop/sync-pending';
const BACKUP_KEY = `${STORAGE_KEY}/antes-de-sincronizar`;
const DATA_PATH = 'couchCoop/data';

let auth: Auth;
let dataRef: DatabaseReference;
let remote: RemoteDoc | null | undefined; // undefined = todavía no llegó nada
let pushSeq = 0;

const isPending = () => localStorage.getItem(PENDING_KEY) === '1';
const setPending = (v: boolean) => {
  if (v) localStorage.setItem(PENDING_KEY, '1');
  else localStorage.removeItem(PENDING_KEY);
  setSyncStatus({ pending: v });
};

/** La primera vez que la nube pisa los datos de este teléfono, se guarda una copia aparte. */
function backupOnce(local: AppData) {
  if (localStorage.getItem(BACKUP_KEY)) return;
  if (local.players.length === 0 && local.tournaments.length === 0) return;
  localStorage.setItem(BACKUP_KEY, JSON.stringify(local));
}

function push(data: AppData) {
  const seq = ++pushSeq;
  setPending(true);
  set(dataRef, { json: JSON.stringify(data), updatedAt: serverTimestamp(), by: getSyncStatus().email ?? '' })
    .then(() => {
      if (seq === pushSeq) setPending(false);
      setSyncStatus({ error: null });
    })
    .catch((err: Error) => {
      setSyncStatus({
        error: /permission/i.test(err.message)
          ? 'La nube no dejó guardar: revisá que las reglas tengan tu email.'
          : `No se pudo subir: ${err.message}`,
      });
    });
}

function sync() {
  if (remote === undefined) return;
  const { role } = getSyncStatus();
  const local = getData();
  const action = reconcile(role, remote, JSON.stringify(local), isPending());
  if (action === 'push') push(local);
  if (action === 'apply' && remote) {
    try {
      const next = migrate(JSON.parse(remote.json));
      backupOnce(local);
      applyRemote(next);
      setSyncStatus({ error: null });
    } catch (err) {
      setSyncStatus({ error: `Los datos de la nube no se pudieron leer: ${(err as Error).message}` });
    }
  }
}

export function startCloud(config: CloudConfig) {
  const app = initializeApp(config);
  const db = getDatabase(app);
  auth = getAuth(app);
  if (useEmulator) {
    connectDatabaseEmulator(db, '127.0.0.1', 9000);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  dataRef = ref(db, DATA_PATH);
  setSyncStatus({ role: 'viewer', pending: isPending() });

  setSyncHooks({
    canEdit: () =>
      getSyncStatus().role === 'viewer' ? 'Solo el que anota puede cambiar datos. Si sos vos, entrá en Ajustes.' : null,
    onLocalChange: (data) => {
      if (getSyncStatus().role === 'editor') push(data);
    },
  });

  onAuthStateChanged(auth, (user) => {
    setSyncStatus({ role: user ? 'editor' : 'viewer', email: user?.email ?? null });
    sync();
  });

  onValue(ref(db, '.info/connected'), (snap) => setSyncStatus({ online: snap.val() === true }));

  onValue(
    dataRef,
    (snap) => {
      remote = (snap.val() as RemoteDoc | null) ?? null;
      setSyncStatus({ remoteUpdatedAt: remote?.updatedAt ?? null });
      sync();
    },
    (err) => setSyncStatus({ error: `No se pudo leer la nube: ${err.message}` }),
  );
}

export async function signIn(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) {
      throw new Error('Email o contraseña incorrectos.');
    }
    if (/network/.test(code)) throw new Error('Sin conexión. Probá de nuevo con internet.');
    throw new Error(`No se pudo entrar (${code || (err as Error).message}).`);
  }
}

export async function signOutCloud() {
  await signOut(auth);
}

/** El que anota fuerza a que la nube quede igual que este teléfono. */
export function uploadLocal() {
  if (getSyncStatus().role !== 'editor') throw new Error('Primero entrá como el que anota.');
  push(getData());
}
