import { Link, useParams } from 'react-router-dom';
import { playerStats } from '../games/stats';
import { formatTime } from '../games/tmRace';
import { useData } from '../store/store';

export function PlayerStatsPage() {
  const { id } = useParams();
  const data = useData();
  const player = data.players.find((p) => p.id === id);
  if (!player) {
    return (
      <div className="page">
        <Link to="/jugadores" className="back">‹ Jugadores</Link>
        <p className="muted">Este jugador no existe.</p>
      </div>
    );
  }
  const s = playerStats(data, player.id);
  const tracks = new Map(data.tmTracks.map((t) => [t.id, t]));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/jugadores" className="back">‹ Jugadores</Link>
        <h1 className="name-cell"><span className="dot dot-lg" style={{ background: player.color }} /> {player.name}</h1>
        {player.archived && <p className="muted">Archivado</p>}
      </header>

      <div className="stat-grid">
        <Stat label="Torneos" value={s.tournaments} />
        <Stat label="Campeonatos" value={s.tournamentWins} />
      </div>

      {s.rl.matches === 0 && s.tm.races === 0 && <p className="muted">Todavía no tiene partidos ni carreras terminadas.</p>}

      {s.rl.matches > 0 && <section className="card stack">
        <h2>⚽ Rocket League</h2>
        <div className="stat-grid">
          <Stat label="Partidos" value={s.rl.matches} />
          <Stat label="Ganados" value={`${s.rl.wins} (${pct(s.rl.wins, s.rl.matches)})`} />
          <Stat label="Goles" value={s.rl.goals} />
          <Stat label="Saves" value={s.rl.saves} />
          <Stat label="Goleador" value={`${s.rl.topScorer}×`} />
          <Stat label="Mejor arquero" value={`${s.rl.bestKeeper}×`} />
        </div>
      </section>}

      {(s.tm.races > 0 || s.records.length > 0) && <section className="card stack">
        <h2>🏁 Trackmania</h2>
        <div className="stat-grid">
          <Stat label="Carreras" value={s.tm.races} />
          <Stat label="Ganadas" value={`${s.tm.wins} (${pct(s.tm.wins, s.tm.races)})`} />
          <Stat label="Podios" value={s.tm.podiums} />
          <Stat label="Puesto promedio" value={s.tm.races ? (s.tm.positionSum / s.tm.races).toFixed(1) : '–'} />
        </div>
        {s.records.length > 0 && (
          <>
            <h3 className="field-label">Mejores tiempos</h3>
            <ul className="stack-sm">
              {s.records
                .sort((a, b) => (tracks.get(a.trackId)?.name ?? '').localeCompare(tracks.get(b.trackId)?.name ?? '', 'es', { numeric: true }))
                .map((r) => (
                  <li key={r.trackId} className="record-row">
                    <span>{tracks.get(r.trackId)?.name} <span className="muted">· {tracks.get(r.trackId)?.carMode}</span></span>
                    <span className={r.isTrackRecord ? 'record-top' : ''}>{r.isTrackRecord ? '🥇 ' : ''}{formatTime(r.timeMs)}</span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="hint">{label}</span>
    </div>
  );
}
