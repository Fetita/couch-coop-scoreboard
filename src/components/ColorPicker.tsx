import { PLAYER_COLORS } from '../model/colors';

/** Paleta rápida más un selector libre para cualquier color. */
export function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  const custom = !PLAYER_COLORS.includes(value.toLowerCase());
  return (
    <div className="colors" role="group" aria-label={label}>
      {PLAYER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch${c === value.toLowerCase() ? ' on' : ''}`}
          style={{ background: c }}
          aria-label={`Color ${c}`}
          aria-pressed={c === value.toLowerCase()}
          onClick={() => onChange(c)}
        />
      ))}
      <label className={`swatch swatch-custom${custom ? ' on' : ''}`} style={custom ? { background: value } : undefined} title="Otro color">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Elegir otro color" />
        {!custom && <span aria-hidden>+</span>}
      </label>
    </div>
  );
}
