import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatTime, raceState } from '../games/tmRace';
import { carModes, createRace, trackmaniaStandings, tracksForMode } from '../games/tmTournament';
import { carColor, hasCarColor } from '../model/colors';
import type { Player, Tournament, TrackmaniaFormat } from '../model/types';
import { setCarColor } from '../store/actions';
import { update, useData } from '../store/store';
import { Avatar, PlayerName } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Podium } from '../ui/Podium';
import { RankTable } from '../ui/RankTable';
import { ColorPicker } from './ColorPicker';

export function TmPlay({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const data = useData();
  const format = tournament.format as TrackmaniaFormat;
  const tracks = new Map(data.tmTracks.map((t) => [t.id, t]));
  const finished = tournament.status === 'finished';
  const running = tournament.tmRaces.find((r) => !raceState(r).finished);
  const runningState = running ? raceState(running) : null;
  const nextRunner = runningState?.next ? players.get(runningState.next) : undefined;
  const colorOf = (p?: Player) => carColor(tournament, p);

  const missing = tournament.playerIds.filter((id) => !hasCarColor(tournament, id));

  return (
    <>
      {missing.length > 0 && !finished && (
        <p className="fuel-out">
          <Icon name="car" size={18} />
          Falta el color de auto de {missing.map((id) => players.get(id)?.name).join(', ')}. Elegilo en Ajustes.
        </p>
      )}
      {running && runningState && (
        <section className="card highlight">
          <div className="card-head">
            <h2>Carrera en curso</h2>
            <span className="pill live">{tracks.get(running.trackId)?.name} · {running.carMode}</span>
          </div>
          <div className="runner">
            <span className="runner-label">{runningState.firstLap ? 'Primera vuelta' : 'Eliminación'} · le toca a</span>
            <span className="runner-name">
              <span className="car-swatch" style={{ background: colorOf(nextRunner) }} />
              {nextRunner?.name}
            </span>
            <span className="hint">{runningState.standing.length} en carrera · {runningState.eliminated.length} afuera</span>
          </div>
          <Link to={`/torneo/${tournament.id}/carrera/${running.id}`} className="btn btn-primary btn-block">
            <Icon name="play" size={18} />Ir a la carrera
          </Link>
        </section>
      )}
      {!running && !finished && (
        <NewRace tournament={tournament} number={tournament.tmRaces.length + 1} planned={format.tracks} />
      )}

      {tournament.tmRaces.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Carreras</h2>
            <span className="hint">{tournament.tmRaces.filter((r) => raceState(r).finished).length} de {format.tracks} pistas</span>
          </div>
          <ol className="list" style={{ gap: 6 }}>
            {tournament.tmRaces.map((r, i) => {
              const st = raceState(r);
              const winner = st.winner ? players.get(st.winner) : undefined;
              return (
                <li key={r.id}>
                  <Link to={`/torneo/${tournament.id}/carrera/${r.id}`} className={`race-row${st.finished ? '' : ' is-next'}`}>
                    <span className="match-num">{i + 1}</span>
                    <span className="grow stack-sm" style={{ gap: 2 }}>
                      <strong>{tracks.get(r.trackId)?.name ?? '?'}</strong>
                      <span className="hint">{r.carMode}{st.finished && st.winner ? ` · ${formatTime(st.best.get(st.winner))}` : ''}</span>
                    </span>
                    {st.finished && winner ? (
                      <span className="row" style={{ gap: 6 }}>
                        <Icon name="trophy" size={16} className="trophy" />
                        <Avatar player={winner} size={26} color={colorOf(winner)} />
                      </span>
                    ) : (
                      <span className="pill live">En curso</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}

export function TmTable({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const format = tournament.format as TrackmaniaFormat;
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const usedModes = [...new Set(tournament.tmRaces.map((r) => r.carMode))];
  const rows = trackmaniaStandings(tournament, modeFilter ?? undefined);
  const anyFinished = rows.some((r) => r.races > 0);
  const colorOf = (p?: Player) => carColor(tournament, p);

  return (
    <>
      {usedModes.length > 1 && (
        <div className="filter-row">
          <button type="button" className={`chip text-only ${modeFilter === null ? 'chip-on' : ''}`} onClick={() => setModeFilter(null)}>Todos los modos</button>
          {usedModes.map((m) => (
            <button key={m} type="button" className={`chip text-only ${modeFilter === m ? 'chip-on' : ''}`} onClick={() => setModeFilter(m)}>{m}</button>
          ))}
        </div>
      )}
      {anyFinished && (
        <section className="card">
          <Podium players={players} colorOf={colorOf} spots={rows.slice(0, 3).map((r) => ({ playerId: r.playerId, value: `${r.points} pts` }))} />
        </section>
      )}
      <section className="card">
        <div className="card-head">
          <h2>Tabla</h2>
          <span className="hint">Puntos por puesto: {format.pointsScale.join('-')}</span>
        </div>
        <RankTable
          rows={rows}
          players={players}
          colorOf={colorOf}
          link
          columns={[
            { label: 'Pts', title: 'Puntos', value: (r) => r.points, strong: true },
            { label: 'Carr', title: 'Carreras terminadas', value: (r) => r.races },
            { label: '1°', title: 'Carreras ganadas', value: (r) => r.wins },
            { label: 'Pod', title: 'Podios', value: (r) => r.podiums },
          ]}
        />
      </section>
    </>
  );
}

function NewRace({ tournament, number, planned }: { tournament: Tournament; number: number; planned: number }) {
  const data = useData();
  const navigate = useNavigate();
  const modes = carModes(data);
  const lastMode = tournament.tmRaces[tournament.tmRaces.length - 1]?.carMode;
  const [mode, setMode] = useState(lastMode ?? modes[0]);
  const [customMode, setCustomMode] = useState('');
  const [track, setTrack] = useState('');
  const [error, setError] = useState<string | null>(null);
  const effectiveMode = mode === '__other' ? customMode.trim() : mode;
  const known = effectiveMode ? tracksForMode(data, effectiveMode) : [];
  const playedHere = new Set(tournament.tmRaces.map((r) => r.trackId));

  const start = () => {
    try {
      let rid = '';
      update((d) => {
        const [next, race] = createRace(d, tournament.id, effectiveMode, track);
        rid = race.id;
        return next;
      });
      navigate(`/torneo/${tournament.id}/carrera/${rid}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="card highlight">
      <div className="card-head">
        <h2>Nueva carrera</h2>
        <span className="pill">Pista {number}{number <= planned ? ` de ${planned}` : ''}</span>
      </div>
      <div className="field">
        <div className="field-label">1. Modo de auto</div>
        <div className="chips">
          {modes.map((m) => (
            <button key={m} type="button" className={`chip text-only ${mode === m ? 'chip-on' : ''}`} onClick={() => { setMode(m); setTrack(''); }}>
              <Icon name="car" size={16} />{m}
            </button>
          ))}
          <button type="button" className={`chip text-only ${mode === '__other' ? 'chip-on' : ''}`} onClick={() => { setMode('__other'); setTrack(''); }}>Otro…</button>
        </div>
        {mode === '__other' && (
          <input value={customMode} onChange={(e) => setCustomMode(e.target.value)} placeholder="Nombre del modo" aria-label="Modo de auto" />
        )}
      </div>
      <div className="field">
        <div className="field-label">2. Pista</div>
        {known.length > 0 && (
          <div className="chips">
            {known.map((t) => (
              <button key={t.id} type="button" className={`chip text-only ${track === t.name ? 'chip-on' : ''}`} onClick={() => setTrack(t.name)}>
                {t.name}{playedHere.has(t.id) && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        )}
        <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder={known.length ? 'O escribí una nueva' : 'Nombre de la pista'} aria-label="Pista" />
        {known.length > 0 && <div className="hint">Con ✓ las que ya se corrieron en este torneo.</div>}
      </div>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn btn-primary btn-block" disabled={!effectiveMode || !track.trim()} onClick={start}>
        <Icon name="flag" size={18} />Empezar carrera
      </button>
    </section>
  );
}

/** El color de auto que el juego le asignó a cada uno (sale al azar en cada partida). */
export function CarColors({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Autos</h2>
        <span className="hint">El color que le tocó a cada uno</span>
      </div>
      <CarColorList
        playerIds={tournament.playerIds}
        players={players}
        colors={tournament.carColors ?? {}}
        editing={editing}
        setEditing={setEditing}
        onChange={(id, c) => update((d) => setCarColor(d, tournament.id, id, c))}
      />
    </section>
  );
}

/** Lista de jugadores con el color de su auto. Se usa al crear el torneo y en sus ajustes. */
export function CarColorList({ playerIds, players, colors, editing, setEditing, onChange }: {
  playerIds: string[];
  players: Map<string, Player>;
  colors: Record<string, string>;
  editing: string | null;
  setEditing: (id: string | null) => void;
  onChange: (playerId: string, color: string) => void;
}) {
  return (
    <div className="stack-sm">
      {playerIds.map((id) => {
        const p = players.get(id);
        if (!p) return null;
        const color = colors[id];
        return (
          <div key={id} className="stack-sm">
            <button type="button" className={`car-row${editing === id ? ' on' : ''}`} onClick={() => setEditing(editing === id ? null : id)}>
              {color ? <span className="car-swatch" style={{ background: color }} /> : <span className="car-swatch empty">?</span>}
              <PlayerName player={p} size={26} />
              <span className="grow" />
              <span className="hint">{editing === id ? 'Listo' : color ? 'Cambiar' : 'Elegir color'}</span>
            </button>
            {editing === id && (
              <ColorPicker label={`Color del auto de ${p.name}`} value={color ?? p.color}
                onChange={(c) => {
                  onChange(id, c);
                  // Pasa solo al siguiente que falta, para cargar todos rápido.
                  const nextMissing = playerIds.find((x) => x !== id && !colors[x]);
                  setEditing(nextMissing ?? null);
                }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
