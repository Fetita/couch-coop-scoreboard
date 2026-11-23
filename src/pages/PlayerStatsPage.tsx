import { Link, useParams } from 'react-router-dom';
import { generalStandings, playerStats } from '../games/stats';
import { formatTime } from '../games/tmRace';
import { useData } from '../store/store';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

export function PlayerStatsPage() {
  const { id } = useParams();
  const data = useData();
  const player = data.players.find((p) => p.id === id);
  if (!player) {
    return (
      <div className="page">
        <Link to="/jugadores" className="back"><Icon name="back" size={18} />Jugadores</Link>
        <p className="muted">Este jugador no existe.</p>
      </div>
    );
  }
  const s = playerStats(data, player.id);
  const general = generalStandings(data).find((r) => r.playerId === player.id);
  const tracks = new Map(data.tmTracks.map((t) => [t.id, t]));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');

  return (
    <div className="page">
      <PageHeader back={{ to: '/jugadores', label: 'Jugadores' }} title="" />
      <section className="profile-hero">
        <Avatar player={player} size={76} />
        <div className="stack-sm" style={{ gap: 4 }}>
          <h1>{player.name}</h1>
          <span className="row" style={{ gap: 8 }}>
            {general && <span className="pill">#{general.position} en la general · {general.points} pts</span>}
            {player.archived && <span className="pill">Archivado</span>}
          </span>
        </div>
      </section>

      <div className="stat-grid">
        <Stat label="Torneos" value={s.tournaments} />
        <Stat label="Campeonatos" value={s.tournamentWins} />
      </div>

      {s.rl.matches === 0 && s.tm.races === 0 && <p className="muted">Todavía no tiene partidos ni carreras terminadas.</p>}

      {s.rl.matches > 0 && (
        <section className="card theme-rl">
          <div className="card-head"><h2>Rocket League</h2><span className="game-badge" style={{ width: 34, height: 34, borderRadius: 10, fontSize: '0.7rem' }}>RL</span></div>
          <div className="stat-grid">
            <Stat label="Partidos" value={s.rl.matches} />
            <Stat label="Ganados" value={`${s.rl.wins}`} sub={pct(s.rl.wins, s.rl.matches)} />
            <Stat label="Goles" value={s.rl.goals} />
            <Stat label="Saves" value={s.rl.saves} />
            <Stat label="Veces goleador" value={s.rl.topScorer} />
            <Stat label="Veces mejor arquero" value={s.rl.bestKeeper} />
          </div>
        </section>
      )}

      {(s.tm.races > 0 || s.records.length > 0) && (
        <section className="card theme-tm">
          <div className="card-head">
            <h2>Trackmania</h2>
            <span className="game-badge" style={{ width: 34, height: 34, borderRadius: 10, fontSize: '0.7rem' }}>TM</span>
          </div>
          <div className="stat-grid">
            <Stat label="Carreras" value={s.tm.races} />
            <Stat label="Ganadas" value={s.tm.wins} sub={pct(s.tm.wins, s.tm.races)} />
            <Stat label="Podios" value={s.tm.podiums} />
            <Stat label="Puesto promedio" value={s.tm.races ? (s.tm.positionSum / s.tm.races).toFixed(1) : '–'} />
          </div>
          {s.records.length > 0 && (
            <>
              <h3>Mejores tiempos</h3>
              <ul className="stack-sm">
                {[...s.records]
                  .sort((a, b) => (tracks.get(a.trackId)?.name ?? '').localeCompare(tracks.get(b.trackId)?.name ?? '', 'es', { numeric: true }))
                  .map((r) => (
                    <li key={r.trackId} className="record-row">
                      <span>{tracks.get(r.trackId)?.name} <span className="hint">· {tracks.get(r.trackId)?.carMode}</span></span>
                      <span className={r.isTrackRecord ? 'record-top' : 'num'}>{r.isTrackRecord && <Icon name="medal" size={14} />} {formatTime(r.timeMs)}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}{sub && <span className="hint" style={{ marginLeft: 6 }}>{sub}</span>}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
