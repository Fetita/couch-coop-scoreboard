import { Link } from 'react-router-dom';
import type { Player } from '../model/types';
import { PlayerName } from './Avatar';

export interface RankColumn<R> {
  label: string;
  title?: string;
  value: (row: R) => React.ReactNode;
  strong?: boolean;
}

/** Tabla de posiciones con los tres primeros destacados. */
export function RankTable<R extends { playerId: string; position: number }>({ rows, columns, players, colorOf, link }: {
  rows: R[];
  columns: RankColumn<R>[];
  players: Map<string, Player>;
  colorOf?: (p?: Player) => string | undefined;
  link?: boolean;
}) {
  return (
    <table className="standings">
      <thead>
        <tr>
          <th>#</th>
          <th className="left">Jugador</th>
          {columns.map((c) => <th key={c.label} title={c.title}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const p = players.get(r.playerId);
          const name = <PlayerName player={p} size={26} color={colorOf?.(p)} bold={r.position === 1} />;
          return (
            <tr key={r.playerId} className={r.position <= 3 ? `p${r.position}` : undefined}>
              <td><span className="pos">{r.position}</span></td>
              <td className="left">{link ? <Link to={`/jugador/${r.playerId}`}>{name}</Link> : name}</td>
              {columns.map((c) => (
                <td key={c.label} className={c.strong ? 'pts' : undefined}>{c.value(r)}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
