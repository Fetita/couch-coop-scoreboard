import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { raceState } from '../games/tmRace';
import { carModes, createRace, trackmaniaStandings, tracksForMode } from '../games/tmTournament';
import { carColor } from '../model/colors';
import type { Player, Tournament, TrackmaniaFormat } from '../model/types';
import { updatePlayer } from '../store/actions';
import { update, useData } from '../store/store';
import { ColorPicker } from './ColorPicker';

export function TrackmaniaSection({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const data = useData();
  const format = tournament.format as TrackmaniaFormat;
  const tracks = new Map(data.tmTracks.map((t) => [t.id, t]));
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const finished = tournament.status === 'finished';
  const running = tournament.tmRaces.find((r) => !raceState(r).finished);
  const usedModes = [...new Set(tournament.tmRaces.map((r) => r.carMode))];
  const rows = trackmaniaStandings(tournament, modeFilter ?? undefined);
  const done = tournament.tmRaces.filter((r) => raceState(r).finished).length;

  return (
    <>
      {running && (
        <section className="card stack next-match">
          <div className="section-head">
            <h2>Carrera en curso</h2>
            <span className="muted">{tracks.get(running.trackId)?.name} · {running.carMode}</span>
          </div>
          <p className="big-runner">
            Corre <strong>{players.get(raceState(running).next ?? '')?.name}</strong>
          </p>
          <Link to={`/torneo/${tournament.id}/carrera/${running.id}`} className="btn btn-primary btn-block">
            Ir a la carrera
          </Link>
        </section>
      )}
      {!running && !finished && (
        <NewRace tournament={tournament} number={tournament.tmRaces.length + 1} planned={format.tracks} />
      )}

      <section className="card stack">
        <div className="section-head">
          <h2>Tabla</h2>
          <span className="muted">{done} de {format.tracks} pistas</span>
        </div>
        {usedModes.length > 1 && (
          <div className="chips">
            <button type="button" className={`chip ${modeFilter === null ? 'chip-on' : ''}`} onClick={() => setModeFilter(null)}>Todos</button>
            {usedModes.map((m) => (
              <button key={m} type="button" className={`chip ${modeFilter === m ? 'chip-on' : ''}`} onClick={() => setModeFilter(m)}>{m}</button>
            ))}
          </div>
        )}
        <table className="standings">
          <thead>
            <tr>
              <th>#</th>
              <th className="left">Jugador</th>
              <th title="Puntos">Pts</th>
              <th title="Carreras terminadas">Carr</th>
              <th title="Carreras ganadas">1°</th>
              <th title="Podios">Pod</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = players.get(r.playerId);
              return (
                <tr key={r.playerId}>
                  <td>{r.position}</td>
                  <td className="left">
                    <span className="name-cell"><span className="dot" style={{ background: carColor(p) }} /> {p?.name ?? '?'}</span>
                  </td>
                  <td className="strong">{r.points}</td>
                  <td>{r.races}</td>
                  <td>{r.wins}</td>
                  <td>{r.podiums}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">Puntos por puesto: {format.pointsScale.join('-')}</p>
      </section>

      <CarColors tournament={tournament} players={players} />

      {tournament.tmRaces.length > 0 && (
        <section className="card stack">
          <h2>Carreras</h2>
          <ol className="match-list">
            {tournament.tmRaces.map((r, i) => {
              const st = raceState(r);
              return (
                <li key={r.id}>
                  <Link to={`/torneo/${tournament.id}/carrera/${r.id}`} className={`race-row${st.finished ? '' : ' is-next'}`}>
                    <span className="match-num">{i + 1}</span>
                    <span className="grow">
                      <strong>{tracks.get(r.trackId)?.name ?? '?'}</strong> <span className="muted">· {r.carMode}</span>
                    </span>
                    <span>
                      {st.finished ? <>🏆 {players.get(st.winner!)?.name}</> : <span className="muted">en curso</span>}
                    </span>
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
    <section className="card stack">
      <div className="section-head">
        <h2>Nueva carrera</h2>
        <span className="muted">pista {number}{number <= planned ? ` de ${planned}` : ''}</span>
      </div>
      <div className="field">
        <div className="field-label">1. Modo de auto</div>
        <div className="chips">
          {modes.map((m) => (
            <button key={m} type="button" className={`chip ${mode === m ? 'chip-on' : ''}`} onClick={() => { setMode(m); setTrack(''); }}>{m}</button>
          ))}
          <button type="button" className={`chip ${mode === '__other' ? 'chip-on' : ''}`} onClick={() => { setMode('__other'); setTrack(''); }}>Otro…</button>
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
              <button key={t.id} type="button" className={`chip ${track === t.name ? 'chip-on' : ''}`} onClick={() => setTrack(t.name)}>
                {t.name}{playedHere.has(t.id) ? ' ✓' : ''}
              </button>
            ))}
          </div>
        )}
        <input value={track} onChange={(e) => setTrack(e.target.value)} placeholder={known.length ? 'O escribí una nueva' : 'Nombre de la pista'} aria-label="Pista" />
        {known.length > 0 && <div className="hint">✓ = ya se corrió en este torneo.</div>}
      </div>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn btn-primary btn-block" disabled={!effectiveMode || !track.trim()} onClick={start}>
        Empezar carrera
      </button>
    </section>
  );
}

/** Cada jugador elige el color de su auto, como en el juego. */
function CarColors({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="card stack">
      <div className="section-head">
        <h2>Autos</h2>
        <span className="hint">Tocá un jugador para cambiar su color</span>
      </div>
      <div className="stack-sm">
        {tournament.playerIds.map((id) => {
          const p = players.get(id);
          if (!p) return null;
          return (
            <div key={id} className="stack-sm">
              <button type="button" className={`car-row${editing === id ? ' on' : ''}`} onClick={() => setEditing(editing === id ? null : id)}>
                <span className="car-swatch" style={{ background: carColor(p) }} />
                <span className="grow">{p.name}</span>
                <span className="hint">{editing === id ? 'Listo' : 'Cambiar'}</span>
              </button>
              {editing === id && (
                <ColorPicker label={`Color del auto de ${p.name}`} value={carColor(p)}
                  onChange={(c) => update((d) => updatePlayer(d, id, { carColor: c }))} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
