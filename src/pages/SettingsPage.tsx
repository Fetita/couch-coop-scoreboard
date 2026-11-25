import { useRef, useState } from 'react';
import { exportBackup, parseBackup } from '../store/persistence';
import { getData, replaceAll, useData } from '../store/store';
import { cloudEnabled, signIn, signOut, uploadLocal } from '../sync';
import { useSyncStatus } from '../sync/status';
import { Icon, type IconName } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

export function SettingsPage() {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const download = () => {
    const blob = new Blob([exportBackup(getData())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `couch-coop-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ ok: true, text: 'Copia descargada.' });
  };

  const restore = async (file: File) => {
    try {
      const restored = parseBackup(await file.text());
      const summary = `${restored.players.length} jugadores y ${restored.tournaments.length} torneos`;
      if (window.confirm(`Esto reemplaza todo lo que hay en este teléfono por la copia (${summary}). ¿Seguir?`)) {
        replaceAll(restored);
        setMessage({ ok: true, text: `Copia restaurada: ${summary}.` });
      }
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    }
  };

  return (
    <div className="page">
      <PageHeader title="Ajustes" />

      {cloudEnabled && <CloudSection />}

      <section className="stack-sm">
        <div className="section-title"><h2>Tus datos</h2></div>
        <p className="muted small" style={{ padding: '0 4px' }}>
          {cloudEnabled ? 'En este teléfono hay' : 'Todo se guarda solo en este teléfono:'} {data.players.length} jugadores, {data.tournaments.length} torneos y {data.tmTracks.length} pistas.
        </p>
        <div className="settings-list">
          <Item icon="download" title="Descargar copia de seguridad" hint="Un archivo para guardar o pasar a otro teléfono" onClick={download} />
          <Item icon="upload" title="Restaurar una copia" hint="Reemplaza los datos de este teléfono" onClick={() => fileRef.current?.click()} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void restore(file);
            e.target.value = '';
          }}
        />
        {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}
      </section>

      <section className="stack-sm">
        <div className="section-title"><h2>Instalar en el teléfono</h2></div>
        <div className="settings-list">
          <Item icon="phone" title="Android (Chrome)" hint={'Menú ⋮ → "Instalar app"'} />
          <Item icon="phone" title="iPhone (Safari)" hint={'Compartir → "Agregar a inicio"'} />
        </div>
        <p className="hint" style={{ padding: '0 4px' }}>Instalada funciona sin internet y se actualiza sola.</p>
      </section>

      <p className="hint center">Couch Co-op v{__APP_VERSION__}</p>
    </div>
  );
}

function Item({ icon, title, hint, onClick }: { icon: IconName; title: string; hint: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="si-icon"><Icon name={icon} size={20} /></span>
      <span className="grow"><strong>{title}</strong><span className="hint">{hint}</span></span>
      {onClick && <Icon name="chevron" size={18} className="muted" />}
    </>
  );
  return onClick ? (
    <button type="button" className="settings-item" onClick={onClick}>{content}</button>
  ) : (
    <div className="settings-item">{content}</div>
  );
}

/** Compartir los datos: los demás miran en vivo y solo el que anota puede cambiar. */
function CloudSection() {
  const status = useSyncStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const updated = status.remoteUpdatedAt ? new Date(status.remoteUpdatedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : null;

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      setPassword('');
      setMessage({ ok: true, text: 'Listo: desde este teléfono se anota para todos.' });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="stack-sm">
      <div className="section-title"><h2>Datos compartidos</h2></div>
      <div className="settings-list">
        <div className="settings-item">
          <span className="si-icon"><Icon name="cloud" size={20} /></span>
          <span className="grow">
            <strong>{status.role === 'editor' ? 'Anotás vos' : 'Mirando en vivo'}</strong>
            <span className="hint">
              {status.role === 'editor' ? `Con ${status.email}. Los demás ven lo que cargás.` : 'Ves lo mismo que el que anota, al instante.'}
              {updated && ` Última actualización: ${updated}`}
            </span>
          </span>
          <span className={`cloud-dot${status.online ? ' on' : ''}`} title={status.online ? 'Conectado' : 'Sin conexión'} />
        </div>
      </div>
      {status.error && <p className="error">{status.error}</p>}
      {status.role === 'editor' ? (
        <div className="row">
          <button type="button" className="btn btn-sm grow" onClick={() => {
            if (window.confirm('Esto reemplaza lo que hay en la nube por los datos de este teléfono. ¿Seguir?')) {
              void uploadLocal().then(() => setMessage({ ok: true, text: 'Subiendo los datos de este teléfono.' }), (err: Error) => setMessage({ ok: false, text: err.message }));
            }
          }}>
            <Icon name="upload" size={16} />Subir lo de este teléfono
          </button>
          <button type="button" className="btn btn-sm grow" onClick={() => void signOut().then(() => setMessage(null))}>Salir</button>
        </div>
      ) : (
        <form className="card stack-sm" onSubmit={login}>
          <strong>¿Sos el que anota?</strong>
          <span className="hint">Entrá con la cuenta que creaste en Firebase. Los demás no necesitan hacer nada.</span>
          <input type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <input type="password" autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Contraseña" />
          <button type="submit" className="btn btn-primary" disabled={busy || !email || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
      )}
      {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}
    </section>
  );
}
