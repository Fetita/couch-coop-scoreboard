import type { Player } from '../model/types';
import { Avatar } from './Avatar';

/** Podio de los tres primeros. Recibe [primero, segundo, tercero]. */
export function Podium({ spots, players, colorOf }: {
  spots: { playerId: string; value: string }[];
  players: Map<string, Player>;
  colorOf?: (p?: Player) => string | undefined;
}) {
  if (spots.length === 0) return null;
  const order = [spots[1], spots[0], spots[2]];
  const cls = ['second', 'first', 'third'];
  const num = [2, 1, 3];
  return (
    <div className="podium">
      {order.map((s, i) => (
        <div key={i} className={`podium-spot ${cls[i]}`}>
          {s && (
            <>
              <Avatar player={players.get(s.playerId)} size={i === 1 ? 54 : 44} color={colorOf?.(players.get(s.playerId))} />
              <span className="name">{players.get(s.playerId)?.name ?? '?'}</span>
              <span className="value">{s.value}</span>
            </>
          )}
          <div className="podium-block">{s ? num[i] : ''}</div>
        </div>
      ))}
    </div>
  );
}
