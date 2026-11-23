import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ColorPicker } from '../components/ColorPicker';
import { carColor } from '../model/colors';
import type { Player } from '../model/types';
import { addPlayer, isPlayerUsed, removePlayer, updatePlayer } from '../store/actions';
import { update, useData } from '../store/store';

export function PlayersPage() {
  const data = useData();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const active = data.players.filter((p) => !p.archived);
  const archived = data.players.filter((p) => p.archived);

  const run = (fn: Parameters<typeof update>[0]) => {
    try {
      update(fn);
      setError(null);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Jugadores</h1>
      </header>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (run((d) => addPlayer(d, name)[0])) setName('');
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" aria-label="Nombre del jugador" />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Agregar</button>
      </form>
      {error && <p className="error">{error}</p>}

      {active.length === 0 ? (
        <p className="muted">Todavía no hay jugadores.</p>
      ) : (
        <ul className="cards">
          {active.map((p) => (
            <PlayerRow key={p.id} player={p} used={isPlayerUsed(data, p.id)} run={run} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section>
          <button type="button" className="link" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ocultar' : 'Ver'} archivados ({archived.length})
          </button>
          {showArchived && (
            <ul className="cards">
              {archived.map((p) => (
                <li key={p.id} className="card player-row">
                  <span className="dot" style={{ background: p.color }} />
                  <Link to={`/jugador/${p.id}`} className="grow muted">{p.name}</Link>
                  <button type="button" className="link" onClick={() => run((d) => updatePlayer(d, p.id, { archived: false }))}>
                    Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function PlayerRow({ player, used, run }: {
  player: Player;
  used: boolean;
  run: (fn: Parameters<typeof update>[0]) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);

  if (!editing) {
    return (
      <li className="card player-row">
        <Link to={`/jugador/${player.id}`} className="name-cell grow">
          <span className="dot dot-lg" style={{ background: player.color }} />
          {player.name}
        </Link>
        <button type="button" className="link" onClick={() => { setName(player.name); setEditing(true); }}>Editar</button>
      </li>
    );
  }

  return (
    <li className="card stack">
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Nombre" />
      <div className="field">
        <span className="field-label">Color</span>
        <ColorPicker label="Color" value={player.color} onChange={(c) => run((d) => updatePlayer(d, player.id, { color: c }))} />
      </div>
      <div className="field">
        <span className="field-label">Color del auto en Trackmania</span>
        <ColorPicker label="Color del auto" value={carColor(player)} onChange={(c) => run((d) => updatePlayer(d, player.id, { carColor: c }))} />
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            const msg = used
              ? `${player.name} ya jugó torneos: se archiva y queda en el historial. ¿Seguir?`
              : `¿Borrar a ${player.name}?`;
            if (window.confirm(msg)) run((d) => removePlayer(d, player.id));
          }}
        >
          {used ? 'Archivar' : 'Borrar'}
        </button>
        <span className="grow" />
        <button type="button" className="btn" onClick={() => setEditing(false)}>Cancelar</button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { if (run((d) => updatePlayer(d, player.id, { name }))) setEditing(false); }}
        >
          Guardar
        </button>
      </div>
    </li>
  );
}
