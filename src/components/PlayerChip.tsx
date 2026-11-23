import type { Player } from '../model/types';

export function PlayerChip({ player, onClick, selected }: {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
}) {
  const className = `chip${selected === undefined ? '' : selected ? ' chip-on' : ' chip-off'}`;
  const content = (
    <>
      <span className="dot" style={{ background: player.color }} />
      {player.name}
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
