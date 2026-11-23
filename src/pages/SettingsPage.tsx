import { useRef, useState } from 'react';
import { exportBackup, parseBackup } from '../store/persistence';
import { getData, replaceAll, useData } from '../store/store';
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

      <section className="stack-sm">
        <div className="section-title"><h2>Tus datos</h2></div>
        <p className="muted small" style={{ padding: '0 4px' }}>
          Todo se guarda solo en este teléfono: {data.players.length} jugadores, {data.tournaments.length} torneos y {data.tmTracks.length} pistas.
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
