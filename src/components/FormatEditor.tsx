import {
  formatWarnings,
  proposeFormat,
  proposeMatchesPerRound,
  proposePointsScale,
  teamSizeFits,
  TIEBREAKER_LABELS,
} from '../model/format';
import type { RocketLeagueTiebreaker, TournamentFormat } from '../model/types';
import { Stepper } from './Stepper';

/** Editor del formato propuesto. Se usa al crear el torneo y durante el torneo. */
export function FormatEditor({ format, players, onChange }: {
  format: TournamentFormat;
  players: number;
  onChange: (f: TournamentFormat) => void;
}) {
  const warnings = formatWarnings(format, players);
  const proposal = proposeFormat(format.game, players);

  return (
    <div className="stack">
      {format.game === 'rocket-league' ? (
        <>
          <Field label="Tamaño de equipo">
            <div className="segmented">
              {([1, 2, 3] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  className={format.teamSize === size ? 'on' : ''}
                  disabled={!teamSizeFits(players, size)}
                  onClick={() =>
                    onChange({ ...format, teamSize: size, matchesPerRound: proposeMatchesPerRound(players, size) })
                  }
                >
                  {size}v{size}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Rondas">
            <Stepper label="rondas" value={format.rounds} min={1} onChange={(rounds) => onChange({ ...format, rounds })} />
          </Field>
          <Field
            label="Partidos por ronda"
            hint={`Propuesta: ${proposeMatchesPerRound(players, format.teamSize)}, así todos descansan parejo y cada pareja juega junta.`}
          >
            <Stepper
              label="partidos por ronda"
              value={format.matchesPerRound}
              min={1}
              onChange={(matchesPerRound) => onChange({ ...format, matchesPerRound })}
            />
          </Field>
          <Field label="Desempate en la tabla" hint="Si dos jugadores empatan en partidos ganados.">
            <TiebreakerEditor value={format.tiebreakers} onChange={(tiebreakers) => onChange({ ...format, tiebreakers })} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Pistas" hint="Se pueden sumar o quitar pistas mientras se juega.">
            <Stepper label="pistas" value={format.tracks} min={1} onChange={(tracks) => onChange({ ...format, tracks })} />
          </Field>
          <Field label="Puntos por posición" hint="El 1° suma tantos puntos como jugadores, y uno menos por puesto.">
            <div className="points-scale">
              {format.pointsScale.map((pts, i) => (
                <label key={i} className="points-cell">
                  <span>{i + 1}°</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={pts}
                    onChange={(e) => {
                      const next = [...format.pointsScale];
                      next[i] = Math.max(0, Number(e.target.value) || 0);
                      onChange({ ...format, pointsScale: next });
                    }}
                  />
                </label>
              ))}
            </div>
            {format.pointsScale.length !== players && (
              <button type="button" className="link" onClick={() => onChange({ ...format, pointsScale: proposePointsScale(players) })}>
                Ajustar la escala a {players} jugadores
              </button>
            )}
          </Field>
        </>
      )}
      {warnings.map((w) => (
        <p key={w} className="warning">{w}</p>
      ))}
      {JSON.stringify(proposal) !== JSON.stringify(format) && (
        <button type="button" className="link" onClick={() => onChange(proposal)}>
          Volver a la propuesta para {players} jugadores
        </button>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function TiebreakerEditor({ value, onChange }: {
  value: RocketLeagueTiebreaker[];
  onChange: (v: RocketLeagueTiebreaker[]) => void;
}) {
  const all = Object.keys(TIEBREAKER_LABELS) as RocketLeagueTiebreaker[];
  const unused = all.filter((t) => !value.includes(t));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div className="stack-sm">
      {value.map((t, i) => (
        <div key={t} className="tiebreak">
          <span>{i + 1}. {TIEBREAKER_LABELS[t]}</span>
          <span className="row-sm">
            <button type="button" className="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">↑</button>
            <button type="button" className="icon" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
            <button type="button" className="icon" onClick={() => onChange(value.filter((x) => x !== t))} aria-label="Quitar">✕</button>
          </span>
        </div>
      ))}
      {value.length === 0 && <p className="muted">Sin desempate: los empatados comparten puesto.</p>}
      {unused.map((t) => (
        <button key={t} type="button" className="link" onClick={() => onChange([...value, t])}>
          + {TIEBREAKER_LABELS[t]}
        </button>
      ))}
    </div>
  );
}
