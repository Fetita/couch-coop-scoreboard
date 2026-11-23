import { useState } from 'react';
import { addPlayer } from '../store/actions';
import { update, useData } from '../store/store';
import { PlayerChip } from './PlayerChip';

/** Elegir jugadores de la lista guardada o crear uno nuevo en el momento. */
export function PlayerPicker({ selected, onChange }: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const data = useData();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Se muestran los activos y también los archivados que ya están elegidos.
  const players = data.players.filter((p) => !p.archived || selected.includes(p.id));

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let created = '';
      update((d) => {
        const [next, player] = addPlayer(d, name);
        created = player.id;
        return next;
      });
      onChange([...selected, created]);
      setName('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="stack">
      {players.length > 0 ? (
        <div className="chips">
          {players.map((p) => (
            <PlayerChip key={p.id} player={p} selected={selected.includes(p.id)} onClick={() => toggle(p.id)} />
          ))}
        </div>
      ) : (
        <p className="muted">Todavía no hay jugadores guardados. Agregá el primero.</p>
      )}
      <form className="row" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jugador nuevo" aria-label="Nombre del jugador nuevo" />
        <button type="submit" className="btn" disabled={!name.trim()}>Agregar</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
