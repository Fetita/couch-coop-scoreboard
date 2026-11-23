import { useRef, useState } from 'react';
import { exportBackup, parseBackup } from '../store/persistence';
import { getData, replaceAll } from '../store/store';

export function SettingsPage() {
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
  };

  const restore = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const summary = `${data.players.length} jugadores y ${data.tournaments.length} torneos`;
      if (window.confirm(`Esto reemplaza todo lo que hay en este teléfono por la copia (${summary}). ¿Seguir?`)) {
        replaceAll(data);
        setMessage({ ok: true, text: `Copia restaurada: ${summary}.` });
      }
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Ajustes</h1>
      </header>
      <section className="card stack">
        <h2>Copia de seguridad</h2>
        <p className="muted">
          Todo se guarda solo en este teléfono. Bajá una copia de vez en cuando, o para pasar los datos a otro teléfono.
        </p>
        <button type="button" className="btn btn-block" onClick={download}>Descargar copia</button>
        <button type="button" className="btn btn-block" onClick={() => fileRef.current?.click()}>Restaurar copia</button>
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
      <section className="card stack">
        <h2>Instalar en el teléfono</h2>
        <p className="muted">
          En Chrome (Android): menú ⋮ → "Instalar app". En Safari (iPhone): Compartir → "Agregar a inicio". Después funciona sin internet.
        </p>
      </section>
      <p className="muted center">Couch Co-op v{__APP_VERSION__}</p>
    </div>
  );
}
