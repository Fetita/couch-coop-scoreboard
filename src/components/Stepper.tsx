export function Stepper({ value, onChange, min = 0, max = 99, label, compact }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`stepper${compact ? ' compact' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Menos ${label}`}>
        −
      </button>
      <span className="stepper-value">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Más ${label}`}>
        +
      </button>
    </div>
  );
}
