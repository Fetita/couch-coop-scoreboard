import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { digitsToMs, formatGap, formatTime, msToDigits, racePoints, raceState } from '../games/tmRace';
import { addRun, deleteEvent, deleteRace, eliminateManually, setRaceOrder, trackRecords, updateEvent } from '../games/tmTournament';
import { carColor } from '../model/colors';
import { GAMES } from '../model/games';
import { shuffle } from '../model/random';
import type { Player, TrackmaniaEvent } from '../model/types';
import { update, useData } from '../store/store';
import { Avatar, PlayerName } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

/** Teclado numérico grande: más cómodo que el del sistema y no tapa la pantalla. */
function Keypad({ onDigit, onBack, onClear }: { onDigit: (d: string) => void; onBack: () => void; onClear: () => void }) {
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" onClick={() => onDigit(d)}>{d}</button>
      ))}
      <button type="button" className="key-fn" onClick={onClear}>Borrar</button>
      <button type="button" onClick={() => onDigit('0')}>0</button>
      <button type="button" className="key-fn" onClick={onBack} aria-label="Borrar un número"><Icon name="backspace" size={24} /></button>
    </div>
  );
}

function TimeDisplay({ digits, empty = '0.000' }: { digits: string; empty?: string }) {
  const ms = digitsToMs(digits);
  const cls = !digits ? ' empty' : ms === null ? ' invalid' : '';
  return <div className={`time-display${cls}`}>{!digits ? empty : ms === null ? 'inválido' : formatTime(ms)}</div>;
}

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
        <Link to={tournament ? `/torneo/${tournament.id}` : '/'} className="back"><Icon name="back" size={18} />Volver</Link>
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
  const runner = state.next ? players.get(state.next) : undefined;
  const colorOf = (p?: Player) => carColor(tournament, p);
  const runnerNoFuel = !state.firstLap && state.next !== null && state.noFuel.has(state.next);

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
    const fuelOut = !state.firstLap && (outOfFuel || runnerNoFuel);
    if (run((d) => addRun(d, tid, race.id, state.next!, timeMs, fuelOut))) {
      setDigits('');
      setOutOfFuel(false);
    }
  };

  // Para seguir en carrera, el que corre tiene que bajar el tiempo del anteúltimo.
  const target = !state.firstLap && state.standing.length > 1 ? state.standing[state.standing.length - 2] : null;

  return (
    <div className={`page ${GAMES.trackmania.theme}`}>
      <PageHeader
        title={track?.name ?? 'Pista'}
        back={{ to: `/torneo/${tid}`, label: tournament.name }}
        subtitle={
          <>
            <span className="pill"><Icon name="car" size={14} />{race.carMode}</span>
            {record && <span className="pill"><Icon name="medal" size={14} />Récord {formatTime(record.timeMs)} · {name(record.playerId)}</span>}
          </>
        }
      />

      {state.finished ? (
        <section className="winner-banner">
          <Avatar player={players.get(state.winner!)} size={64} color={colorOf(players.get(state.winner!))} />
          <Icon name="trophy" size={28} className="trophy" />
          <h2>Ganó {name(state.winner)}</h2>
          <p className="muted small">Nadie pudo bajar su {formatTime(state.best.get(state.winner!) ?? null)}.</p>
        </section>
      ) : (
        <section className="card highlight">
          <div className="runner">
            <span className="runner-label">
              {state.firstLap ? 'Primera vuelta' : 'Eliminación'} · intento {(state.attempts.get(state.next!) ?? 0) + 1}
            </span>
            <span className="runner-name">
              <span className="car-swatch" style={{ background: colorOf(runner) }} />
              {runner?.name}
            </span>
            {target && (
              <span className="target">Para seguir tiene que bajar <strong>{formatTime(state.best.get(target) ?? null)}</strong> de {name(target)}</span>
            )}
          </div>
          <TimeDisplay digits={digits} />
          <Keypad
            onDigit={(d) => setDigits((x) => (x + d).replace(/^0+/, '').slice(0, 7))}
            onBack={() => setDigits((x) => x.slice(0, -1))}
            onClear={() => setDigits('')}
          />
          {!state.firstLap && (runnerNoFuel ? (
            <p className="fuel-out"><Icon name="fuel" size={18} />Ya está sin nafta: si no supera a nadie, queda eliminado.</p>
          ) : (
            <label className="toggle">
              <span className="row" style={{ gap: 8 }}><Icon name="fuel" size={18} />Se quedó sin nafta</span>
              <input type="checkbox" checked={outOfFuel} onChange={(e) => setOutOfFuel(e.target.checked)} />
            </label>
          ))}
          <div className="row">
            <button type="button" className="btn grow" onClick={() => save(null)}>No terminó</button>
            <button type="button" className="btn btn-primary grow" disabled={preview === null} onClick={() => save(preview)}>
              <Icon name="check" size={18} />Guardar
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {race.events.length === 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Orden de salida</h2>
            <button type="button" className="link" onClick={() => run((d) => setRaceOrder(d, tid, race.id, shuffle(race.order)))}>
              <Icon name="shuffle" size={16} />Sortear
            </button>
          </div>
          <ol className="stack-sm">
            {race.order.map((p, i) => (
              <li key={p} className="row">
                <span className="pos">{i + 1}</span>
                <PlayerName player={players.get(p)} color={colorOf(players.get(p))} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {race.events.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Posiciones</h2>
            {!state.finished && <span className="hint">{state.standing.length} en carrera</span>}
          </div>
          <ol className="board">
            {state.standing.map((p) => (
              <BoardRow key={p} player={players.get(p)} color={colorOf(players.get(p))} position={state.positions.get(p)!} time={state.best.get(p) ?? null}
                gap={formatGap(state.best.get(p), leaderTime)} attempts={state.attempts.get(p) ?? 0}
                points={state.finished ? points.get(p) : undefined}
                running={p === state.next}
                noFuel={state.noFuel.has(p)}
                onEliminate={state.finished ? undefined : () => {
                  if (window.confirm(`¿Marcar a ${name(p)} como eliminado?`)) run((d) => eliminateManually(d, tid, race.id, p));
                }} />
            ))}
            {[...state.eliminated].reverse().map((p) => (
              <BoardRow key={p} player={players.get(p)} color={colorOf(players.get(p))} position={state.positions.get(p)!} time={state.best.get(p) ?? null}
                gap={formatGap(state.best.get(p), leaderTime)} attempts={state.attempts.get(p) ?? 0}
                points={state.finished ? points.get(p) : undefined} out />
            ))}
          </ol>
        </section>
      )}

      {race.events.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Intentos</h2>
            <span className="hint">Tocá uno para corregirlo</span>
          </div>
          <ol className="log">
            {[...race.events].reverse().map((e, i) => (
              <EventRow key={e.id} n={race.events.length - i} event={e} player={players.get(e.playerId)} color={colorOf(players.get(e.playerId))}
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
        <Icon name="trash" size={18} />Borrar carrera
      </button>
    </div>
  );
}

function BoardRow({ player, color, position, time, gap, attempts, points, running, out, noFuel, onEliminate }: {
  player?: Player;
  color: string;
  position: number;
  time: number | null;
  gap: string;
  attempts: number;
  points?: number;
  running?: boolean;
  out?: boolean;
  noFuel?: boolean;
  onEliminate?: () => void;
}) {
  return (
    <li className={`board-row${out ? ' out' : ''}${running ? ' running' : ''}${position === 1 && !out ? ' p1' : ''}`}>
      <span className={`pos${position <= 3 && !out ? '' : ''}`}>{position}</span>
      <span className="grow stack-sm" style={{ gap: 2 }}>
        <PlayerName player={player} size={28} color={color} bold={running} />
        <span className="board-meta">
          {attempts} {attempts === 1 ? 'intento' : 'intentos'}
          {noFuel && <span className="fuel-badge"> · <Icon name="fuel" size={12} /> sin nafta</span>}
          {out && ' · eliminado'}
        </span>
      </span>
      <span className="board-time">
        {formatTime(time)}
        {gap && <span className="gap">{gap}</span>}
      </span>
      {points !== undefined && <span className="board-pts">{points} pts</span>}
      {onEliminate && (
        <button type="button" className="icon-btn sm" aria-label={`Eliminar a ${player?.name}`} onClick={onEliminate}>
          <Icon name="x" size={16} />
        </button>
      )}
    </li>
  );
}

function EventRow({ n, event, player, color, onSave, onDelete }: {
  n: number;
  event: TrackmaniaEvent;
  player?: Player;
  color: string;
  onSave: (patch: { timeMs: number | null; outOfFuel: boolean }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [digits, setDigits] = useState(event.type === 'run' && event.timeMs !== null ? msToDigits(event.timeMs) : '');
  const [fuel, setFuel] = useState(event.type === 'run' && event.outOfFuel);

  if (event.type === 'eliminate') {
    return (
      <li className="log-row">
        <span className="log-n">{n}</span>
        <span className="grow"><PlayerName player={player} size={24} /> <span className="hint">eliminado a mano</span></span>
        <button type="button" className="link" onClick={onDelete}>Deshacer</button>
      </li>
    );
  }

  if (!editing) {
    return (
      <li className="log-row" onClick={() => setEditing(true)}>
        <span className="log-n">{n}</span>
        <span className="grow"><PlayerName player={player} size={24} color={color} /></span>
        {event.outOfFuel && <span className="fuel-badge" title="Sin nafta"><Icon name="fuel" size={16} /></span>}
        <strong>{event.timeMs === null ? 'No terminó' : formatTime(event.timeMs)}</strong>
        <Icon name="edit" size={14} className="muted" />
      </li>
    );
  }

  const ms = digitsToMs(digits);
  return (
    <li className="log-row editing">
      <PlayerName player={player} size={26} color={color} bold />
      <TimeDisplay digits={digits} empty="No terminó" />
      <Keypad
        onDigit={(d) => setDigits((x) => (x + d).replace(/^0+/, '').slice(0, 7))}
        onBack={() => setDigits((x) => x.slice(0, -1))}
        onClear={() => setDigits('')}
      />
      <label className="toggle">
        <span className="row" style={{ gap: 8 }}><Icon name="fuel" size={18} />Sin nafta</span>
        <input type="checkbox" checked={fuel} onChange={(e) => setFuel(e.target.checked)} />
      </label>
      <div className="row">
        <button type="button" className="icon-btn" aria-label="Borrar intento" onClick={onDelete}><Icon name="trash" size={18} /></button>
        <button type="button" className="btn grow" onClick={() => setEditing(false)}>Cancelar</button>
        <button type="button" className="btn btn-primary grow" disabled={digits !== '' && ms === null}
          onClick={() => { onSave({ timeMs: ms, outOfFuel: fuel }); setEditing(false); }}>Guardar</button>
      </div>
    </li>
  );
}
