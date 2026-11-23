import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ColorPicker } from '../components/ColorPicker';
import { playerStats } from '../games/stats';
import type { Player } from '../model/types';
import { addPlayer, isPlayerUsed, removePlayer, updatePlayer } from '../store/actions';
import { update, useData } from '../store/store';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

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
      <PageHeader title="Jugadores" subtitle={`${active.length} en el grupo`} />
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (run((d) => addPlayer(d, name)[0])) setName('');
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del jugador nuevo" aria-label="Nombre del jugador" />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}><Icon name="plus" size={18} />Agregar</button>
      </form>
      {error && <p className="error">{error}</p>}

      {active.length === 0 ? (
        <div className="hero-empty">
          <div className="hero-icon"><Icon name="users" size={30} /></div>
          <strong>Todavía no hay jugadores</strong>
          <span>Agregalos acá o directamente al crear un torneo.</span>
        </div>
      ) : (
        <ul className="list">
          {active.map((p) => (
            <PlayerRow key={p.id} player={p} used={isPlayerUsed(data, p.id)} summary={summary(data, p.id)} run={run} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="stack-sm">
          <button type="button" className="link" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ocultar' : 'Ver'} archivados ({archived.length})
          </button>
          {showArchived && (
            <ul className="list">
              {archived.map((p) => (
                <li key={p.id} className="player-card" style={{ opacity: 0.7 }}>
                  <Avatar player={p} size={40} />
                  <Link to={`/jugador/${p.id}`} className="grow"><strong>{p.name}</strong><span className="hint">Archivado</span></Link>
                  <button type="button" className="btn btn-sm" onClick={() => run((d) => updatePlayer(d, p.id, { archived: false }))}>
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

function summary(data: ReturnType<typeof useData>, id: string): string {
  const s = playerStats(data, id);
  if (s.tournaments === 0) return 'Sin torneos todavía';
  const parts = [`${s.tournaments} ${s.tournaments === 1 ? 'torneo' : 'torneos'}`];
  if (s.tournamentWins) parts.push(`${s.tournamentWins} 🏆`);
  return parts.join(' · ');
}

function PlayerRow({ player, used, summary, run }: {
  player: Player;
  used: boolean;
  summary: string;
  run: (fn: Parameters<typeof update>[0]) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);

  if (!editing) {
    return (
      <li className="player-card">
        <Link to={`/jugador/${player.id}`} className="row grow">
          <Avatar player={player} size={44} />
          <span className="grow">
            <strong>{player.name}</strong>
            <span className="hint">{summary}</span>
          </span>
        </Link>
        <button type="button" className="icon-btn" aria-label={`Editar a ${player.name}`} onClick={() => { setName(player.name); setEditing(true); }}>
          <Icon name="edit" size={18} />
        </button>
      </li>
    );
  }

  return (
    <li className="card">
      <div className="row">
        <Avatar player={{ ...player, name: name || player.name }} size={44} />
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Nombre" />
      </div>
      <div className="field">
        <span className="field-label">Color</span>
        <ColorPicker label="Color" value={player.color} onChange={(c) => run((d) => updatePlayer(d, player.id, { color: c }))} />
      </div>
      <div className="row">
        <button
          type="button"
          className="icon-btn"
          aria-label={used ? 'Archivar' : 'Borrar'}
          onClick={() => {
            const msg = used
              ? `${player.name} ya jugó torneos: se archiva y queda en el historial. ¿Seguir?`
              : `¿Borrar a ${player.name}?`;
            if (window.confirm(msg)) run((d) => removePlayer(d, player.id));
          }}
        >
          <Icon name="trash" size={18} />
        </button>
        <button type="button" className="btn grow" onClick={() => setEditing(false)}>Cancelar</button>
        <button
          type="button"
          className="btn btn-primary grow"
          onClick={() => { if (run((d) => updatePlayer(d, player.id, { name }))) setEditing(false); }}
        >
          Guardar
        </button>
      </div>
    </li>
  );
}
