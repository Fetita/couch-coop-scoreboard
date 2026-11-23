import type { Player } from '../model/types';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

export function PlayerChip({ player, onClick, selected, color }: {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
  color?: string;
}) {
  const className = `chip${selected === undefined ? '' : selected ? ' chip-on' : ' chip-off'}`;
  const content = (
    <>
      <Avatar player={player} size={30} color={color} />
      {player.name}
      {selected && <span className="check"><Icon name="check" size={13} /></span>}
    </>
  );
  return onClick ? (
    <button type="button" className={className} onClick={onClick} aria-pressed={selected}>
      {content}
    </button>
  ) : (
    <span className={className}>{content}</span>
  );
}
