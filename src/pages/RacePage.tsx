import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { digitsToMs, formatGap, formatTime, msToDigits, racePoints, raceState } from '../games/tmRace';
import { addRun, deleteEvent, deleteRace, eliminateManually, setRaceOrder, trackRecords, updateEvent } from '../games/tmTournament';
import { shuffle } from '../model/random';
import type { Player, TrackmaniaEvent } from '../model/types';
import { update, useData } from '../store/store';

export function RacePage() {
  const { id, raceId } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const tournament = data.tournaments.find((t) => t.id === id);
  const race = tournament?.tmRaces.find((r) => r.id === raceId);
  const players = new Map(data.players.map((p) => [p.id, p]));
  const [digits, setDigits] = useState('');
  const [outOfFuel, setOutOfFuel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tournament || !race) {
    return (
      <div className="page">
        <Link to={tournament ? `/torneo/${tournament.id}` : '/'} className="back">‹ Volver</Link>
        <p className="muted">Esta carrera no existe.</p>
      </div>
    );
  }

  const tid = tournament.id;
  const track = data.tmTracks.find((t) => t.id === race.trackId);
  const state = raceState(race);
  const scale = tournament.format.game === 'trackmania' ? tournament.format.pointsScale : [];
  const points = racePoints(race, scale);
  const record = trackRecords(data, race.trackId)[0];
  const name = (pid: string | null | undefined) => (pid ? players.get(pid)?.name ?? '?' : '?');
  const leaderTime = state.best.get(state.standing[0]) ?? null;
  const preview = digitsToMs(digits);

  const run = (fn: Parameters<typeof update>[0]) => {
    try {
      update(fn);
      setError(null);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const save = (timeMs: number | null) => {
    if (!state.next) return;
    if (run((d) => addRun(d, tid, race.id, state.next!, timeMs, !state.firstLap && outOfFuel))) {
      setDigits('');
      setOutOfFuel(false);
    }
  };

  // Para seguir en carrera, el que corre tiene que bajar el tiempo del anteúltimo.
  const target = !state.firstLap && state.standing.length > 1
    ? state.standing[state.standing.length - 2]
    : null;

  return (
    <div className="page">
      <header className="page-header">
        <Link to={`/torneo/${tid}`} className="back">‹ Torneo</Link>
        <h1>{track?.name ?? 'Pista'}</h1>
        <p className="muted">
          {race.carMode}
          {record && ` · récord ${formatTime(record.timeMs)} (${name(record.playerId)})`}
        </p>
      </header>

      {state.finished ? (
        <section className="card stack winner-card">
          <h2>🏆 Ganó {name(state.winner)}</h2>
          <p className="muted">Nadie lo pudo superar con {formatTime(state.best.get(state.winner!) ?? null)}.</p>
        </section>
      ) : (
        <section className="card stack next-match">
          <div className="section-head">
            <h2>{state.firstLap ? 'Primera vuelta' : 'Eliminación'}</h2>
            <span className="muted">intento {(state.attempts.get(state.next!) ?? 0) + 1}</span>
          </div>
          <p className="big-runner">Corre <strong>{name(state.next)}</strong></p>
          {target && (
            <p className="muted">
              Para seguir tiene que bajar {formatTime(state.best.get(target) ?? null)} de {name(target)}.
            </p>
          )}
          <label className="time-input">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 7))}
              placeholder="Tiempo (ej. 52345)"
              aria-label="Tiempo"
            />
            <span className="time-preview">{preview !== null ? formatTime(preview) : digits ? 'inválido' : '0.000'}</span>
          </label>
          {!state.firstLap && (
            <label className="toggle">
              <input type="checkbox" checked={outOfFuel} onChange={(e) => setOutOfFuel(e.target.checked)} />
              <span>Se quedó sin nafta</span>
            </label>
          )}
          <div className="row">
            <button type="button" className="btn grow" onClick={() => save(null)}>No terminó</button>
            <button type="button" className="btn btn-primary grow" disabled={preview === null} onClick={() => save(preview)}>
              Guardar tiempo
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {race.events.length === 0 && (
        <section className="card stack">
          <div className="section-head">
            <h2>Orden de salida</h2>
            <button type="button" className="link" onClick={() => run((d) => setRaceOrder(d, tid, race.id, shuffle(race.order)))}>
              Sortear
            </button>
          </div>
          <ol className="order">
            {race.order.map((p) => <li key={p}>{name(p)}</li>)}
          </ol>
        </section>
      )}

      <section className="card stack">
        <h2>Posiciones</h2>
        <ol className="board">
          {state.standing.map((p) => (
            <BoardRow key={p} player={players.get(p)} position={state.positions.get(p)!} time={state.best.get(p) ?? null}
              gap={formatGap(state.best.get(p), leaderTime)} attempts={state.attempts.get(p) ?? 0}
              points={state.finished ? points.get(p) : undefined}
              running={p === state.next}
              onEliminate={state.finished ? undefined : () => {
                if (window.confirm(`¿Marcar a ${name(p)} como eliminado?`)) run((d) => eliminateManually(d, tid, race.id, p));
              }} />
          ))}
          {[...state.eliminated].reverse().map((p) => (
            <BoardRow key={p} player={players.get(p)} position={state.positions.get(p)!} time={state.best.get(p) ?? null}
              gap={formatGap(state.best.get(p), leaderTime)} attempts={state.attempts.get(p) ?? 0}
              points={state.finished ? points.get(p) : undefined} out />
          ))}
        </ol>
      </section>

      {race.events.length > 0 && (
        <section className="card stack">
          <h2>Intentos</h2>
          <p className="hint">Si algo se cargó mal, tocá el intento para corregirlo o borrarlo. Todo se recalcula solo.</p>
          <ol className="log">
            {[...race.events].reverse().map((e) => (
              <EventRow key={e.id} event={e} name={name(e.playerId)}
                onSave={(patch) => run((d) => updateEvent(d, tid, race.id, e.id, patch))}
                onDelete={() => run((d) => deleteEvent(d, tid, race.id, e.id))} />
            ))}
          </ol>
        </section>
      )}

      <button
        type="button"
        className="btn btn-danger btn-block"
        onClick={() => {
          if (window.confirm('¿Borrar esta carrera con todos sus intentos?')) {
            update((d) => deleteRace(d, tid, race.id));
            navigate(`/torneo/${tid}`, { replace: true });
          }
        }}
      >
        Borrar carrera
      </button>
    </div>
  );
}

function BoardRow({ player, position, time, gap, attempts, points, running, out, onEliminate }: {
  player?: Player;
  position: number;
  time: number | null;
  gap: string;
  attempts: number;
  points?: number;
  running?: boolean;
  out?: boolean;
  onEliminate?: () => void;
}) {
  return (
    <li className={`board-row${out ? ' out' : ''}${running ? ' running' : ''}`}>
      <span className="board-pos">{position}</span>
      <span className="name-cell grow"><span className="dot" style={{ background: player?.color }} /> {player?.name ?? '?'}</span>
      <span className="board-time">
        {formatTime(time)}
        {gap && <span className="hint"> {gap}</span>}
      </span>
      <span className="hint board-att">{attempts}×</span>
      {points !== undefined && <span className="board-pts">{points} pts</span>}
      {out && points === undefined && <span className="hint">⛽</span>}
      {onEliminate && <button type="button" className="icon" aria-label={`Eliminar a ${player?.name}`} onClick={onEliminate}>✕</button>}
    </li>
  );
}

function EventRow({ event, name, onSave, onDelete }: {
  event: TrackmaniaEvent;
  name: string;
  onSave: (patch: { timeMs: number | null; outOfFuel: boolean }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [digits, setDigits] = useState(event.type === 'run' && event.timeMs !== null ? msToDigits(event.timeMs) : '');
  const [fuel, setFuel] = useState(event.type === 'run' && event.outOfFuel);

  if (event.type === 'eliminate') {
    return (
      <li className="log-row">
        <span className="grow">{name} <span className="muted">eliminado a mano</span></span>
        <button type="button" className="link" onClick={onDelete}>Deshacer</button>
      </li>
    );
  }

  if (!editing) {
    return (
      <li className="log-row" onClick={() => setEditing(true)}>
        <span className="grow">{name}</span>
        <span className="board-time">{formatTime(event.timeMs)}</span>
        {event.outOfFuel && <span title="Sin nafta">⛽</span>}
      </li>
    );
  }

  const ms = digitsToMs(digits);
  return (
    <li className="log-row editing stack-sm">
      <strong>{name}</strong>
      <label className="time-input">
        <input inputMode="numeric" value={digits} onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 7))} aria-label="Tiempo" placeholder="Sin tiempo" />
        <span className="time-preview">{ms !== null ? formatTime(ms) : digits ? 'inválido' : 'no terminó'}</span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={fuel} onChange={(e) => setFuel(e.target.checked)} />
        <span>Sin nafta</span>
      </label>
      <div className="row">
        <button type="button" className="btn btn-danger" onClick={onDelete}>Borrar</button>
        <span className="grow" />
        <button type="button" className="btn" onClick={() => setEditing(false)}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={digits !== '' && ms === null}
          onClick={() => { onSave({ timeMs: ms, outOfFuel: fuel }); setEditing(false); }}>Guardar</button>
      </div>
    </li>
  );
}
