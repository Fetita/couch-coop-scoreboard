import { carSlot } from '../games/tmRace';
import type { Player } from '../model/types';
import { PlayerName } from '../ui/Avatar';

/** Orden de salida de una carrera con el color de auto que le toca a cada lugar. */
export function StartOrder({ order, players, out = [], selected, onTap }: {
  order: string[];
  players: Map<string, Player>;
  /** Jugadores eliminados: se muestran apagados. */
  out?: string[];
  selected?: string | null;
  onTap?: (playerId: string) => void;
}) {
  return (
    <ol className="start-order">
      {order.map((id, i) => {
        const slot = carSlot(i);
        const content = (
          <>
            <span className="car-swatch" style={{ background: slot.hex }} />
            <span className="slot-name">{slot.name}</span>
            <PlayerName player={players.get(id)} size={26} color={slot.hex} />
          </>
        );
        const cls = `start-slot${out.includes(id) ? ' out' : ''}${selected === id ? ' on' : ''}`;
        return (
          <li key={id}>
            {onTap ? (
              <button type="button" className={cls} onClick={() => onTap(id)}>{content}</button>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
