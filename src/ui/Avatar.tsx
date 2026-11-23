import type { Player } from '../model/types';

/** Texto oscuro sobre colores claros y claro sobre oscuros. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#10131c' : '#ffffff';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const text = parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2);
  return text.toUpperCase();
}

/** Círculo con las iniciales del jugador en su color. */
export function Avatar({ player, size = 36, color }: { player?: Player; size?: number; color?: string }) {
  const bg = color ?? player?.color ?? '#555';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: bg, color: textOn(bg), fontSize: size * 0.4 }}
      aria-hidden
    >
      {player ? initials(player.name) : '?'}
    </span>
  );
}

/** Avatar + nombre en una línea. */
export function PlayerName({ player, size = 28, color, bold }: { player?: Player; size?: number; color?: string; bold?: boolean }) {
  return (
    <span className={`player-name${bold ? ' bold' : ''}`}>
      <Avatar player={player} size={size} color={color} />
      <span className="player-name-text">{player?.name ?? '?'}</span>
    </span>
  );
}
